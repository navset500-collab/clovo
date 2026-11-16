import { createHmac, randomUUID } from "node:crypto";
import { get, put, BlobPreconditionFailedError } from "@vercel/blob";
import { z } from "zod";
import {
  reserveUsage,
  UsageError,
  USAGE_LIMITS,
  type UsageState,
  type QuotaPolicy,
} from "./usage-policy.ts";
export { UsageError } from "./usage-policy.ts";
const counter = z.number().int().nonnegative();
const stateSchema = z.object({
  version: z.literal(1),
  total: counter,
  day: z.string(),
  daily: counter,
  networks: z.record(z.string(), counter),
  resources: z.record(z.string(), counter),
  active: z.array(
    z.object({ id: z.string(), network: z.string(), expires: counter }),
  ),
});
const policies: Record<string, QuotaPolicy> = {
  analysis: USAGE_LIMITS,
  "study-create": { daily: 10, monthly: 30, perNetworkDaily: 2 },
  feedback: { daily: 200, monthly: 1000, perNetworkDaily: 10, perResource: 50 },
  "study-read": { daily: 1500, monthly: 12000, perNetworkDaily: 150 },
  "study-delete": { daily: 100, monthly: 500, perNetworkDaily: 10 },
};
async function update(
  path: string,
  transform: (s: UsageState | null) => UsageState,
) {
  if (!process.env.BLOB_READ_WRITE_TOKEN)
    throw new UsageError(
      "Usage protection is unavailable. Requests are paused to protect the project budget.",
      503,
      60,
    );
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const previous = await get(path, {
        access: "private",
        useCache: false,
        abortSignal: AbortSignal.timeout(8000),
      });
      if (previous && previous.statusCode !== 200)
        throw new Error("Unexpected usage response");
      if (previous && !previous.blob.etag) throw new Error("Missing usage version");
      const state = previous
        ? stateSchema.parse(await new Response(previous.stream).json())
        : null;
      const next = transform(state);
      try {
        await put(path, JSON.stringify(next), {
          access: "private",
          addRandomSuffix: false,
          ...(previous
            ? { allowOverwrite: true, ifMatch: previous.blob.etag }
            : { allowOverwrite: false }),
          contentType: "application/json",
          cacheControlMaxAge: 60,
          ttlDays: 40,
          abortSignal: AbortSignal.timeout(8000),
        });
        return;
      } catch (e) {
        // A race must re-read the counter. Never overwrite it unconditionally.
        if (
          e instanceof BlobPreconditionFailedError ||
          (!previous && e instanceof Error && /already exists/i.test(e.message))
        )
          continue;
        throw e;
      }
    } catch (e) {
      if (e instanceof UsageError) throw e;
      throw new UsageError(
        "Usage protection could not be checked. No new AI work has started. Please try later.",
        503,
        60,
      );
    }
  }
  throw new UsageError(
    "Another request is updating the allowance. Please try again shortly.",
    429,
    10,
  );
}
export async function reserve(
  request: Request,
  bucket: keyof typeof policies,
  resource?: string,
) {
  const now = Date.now(),
    day = new Date(now).toISOString().slice(0, 10),
    month = day.slice(0, 7);
  const secret = process.env.BLOB_READ_WRITE_TOKEN;
  if (!secret)
    throw new UsageError(
      "Usage protection is not configured. Requests are paused.",
      503,
      60,
    );
  // Vercel overwrites x-forwarded-for. Raw addresses are never persisted.
  const address =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const network = createHmac("sha256", secret)
    .update(`${day}:${address}`)
    .digest("hex");
  const scope =
    process.env.VERCEL_ENV === "production" ? "production" : "development";
  const path = `usage/v1/${scope}/${month}/${bucket}.json`,
    id = randomUUID();
  await update(path, (s) =>
    reserveUsage(s, policies[bucket], network, id, now, resource),
  );
  if (bucket === "feedback" && resource) {
    // A seven-day study may span two months. Its lifetime cap must not reset.
    await update(`usage/v1/${scope}/studies/${resource}.json`, s => reserveUsage(s, { daily: 50, monthly: 50, perNetworkDaily: 10 }, network, id, now));
  }
  return async () => {
    if (!policies[bucket].concurrent) return;
    // Failed runs still consume a start: refunding would allow repeated costly failures.
    try {
      await update(path, (s) => {
        if (!s) throw new Error("Missing usage record");
        return { ...s, active: s.active.filter((a) => a.id !== id) };
      });
    } catch {
      /* Expiring lease remains conservative if storage fails. */
    }
  };
}
export function usageResponse(error: unknown) {
  const e =
    error instanceof UsageError
      ? error
      : new UsageError("Requests are temporarily paused.", 503, 60);
  return Response.json(
    { error: e.message },
    {
      status: e.status,
      headers: {
        "Retry-After": String(e.retryAfter),
        "Cache-Control": "no-store",
      },
    },
  );
}
