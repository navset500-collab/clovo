import { createHmac, randomUUID } from "node:crypto";
import { get, put, BlobPreconditionFailedError } from "@vercel/blob";
import { z } from "zod";
import {
  reserveVisitor,
  settleVisitor,
  visitorSnapshot,
  type VisitorWindow,
} from "./visitor-quota.ts";
import {
  reserveUsage,
  settleUsage,
  allowanceSnapshot,
  UsageError,
  USAGE_LIMITS,
  type UsageState,
  type QuotaPolicy,
} from "./usage-policy.ts";
export { UsageError } from "./usage-policy.ts";
const counter = z.number().int().nonnegative();
const stateSchema = z.object({
  providerPauseUntil: counter.optional(),
  version: z.literal(1),
  total: counter,
  day: z.string(),
  daily: counter,
  networks: z.record(z.string(), counter),
  completedNetworks: z.record(z.string(), counter).optional(),
  resources: z.record(z.string(), counter),
  active: z.array(
    z.object({ id: z.string(), network: z.string(), expires: counter }),
  ),
});
const policies: Record<string, QuotaPolicy> = {
  analysis: { ...USAGE_LIMITS, perResource: 1 },
  "study-create": { daily: 10, monthly: 30, perNetworkDaily: 2 },
  feedback: { daily: 200, monthly: 1000, perNetworkDaily: 10, perResource: 50 },
  "study-read": { daily: 1500, monthly: 12000, perNetworkDaily: 150 },
  "study-delete": { daily: 100, monthly: 500, perNetworkDaily: 10 },
};
async function updateRecord<T>(
  path: string,
  schema: z.ZodType<T>,
  transform: (s: T | null) => T,
  ttlDays = 40,
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
      if (previous && !previous.blob.etag)
        throw new Error("Missing usage version");
      const state = previous
        ? schema.parse(await new Response(previous.stream).json())
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
          ttlDays,
          abortSignal: AbortSignal.timeout(8000),
        });
        return next;
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
    "quota_busy",
  );
}
const visitorSchema = z.object({
  startedAt: counter,
  completed: counter.max(10),
  completedAt: z.array(counter).max(10).optional(),
  active: z.object({ id: z.string(), expires: counter }).nullable(),
});
const update = (
  path: string,
  transform: (s: UsageState | null) => UsageState,
) => updateRecord(path, stateSchema, transform);
const updateVisitor = (
  path: string,
  transform: (s: VisitorWindow | null) => VisitorWindow,
) => updateRecord(path, visitorSchema, transform, 2);
export async function reserve(
  request: Request,
  bucket: keyof typeof policies,
  resource?: string,
  visitorKey?: string,
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
  const visitorPath =
    bucket === "analysis" && visitorKey
      ? `usage/v2/${scope}/visitors/${visitorKey}.json`
      : undefined;
  if (bucket === "analysis" && !visitorPath)
    throw new UsageError("Browser allowance unavailable.", 503, 60);
  if (visitorPath)
    await updateVisitor(visitorPath, (s) => reserveVisitor(s, id, now));
  try {
    await update(path, (s) =>
      reserveUsage(s, policies[bucket], network, id, now, resource),
    );
  } catch (e) {
    if (visitorPath) {
      try {
        await updateVisitor(visitorPath, (s) =>
          s
            ? settleVisitor(s, id, false)
            : { startedAt: now, completed: 0, active: null },
        );
      } catch {
        /* Lease expires without recording a completed review. */
      }
    }
    if (
      bucket === "analysis" &&
      e instanceof UsageError &&
      e.code === "study_limit"
    )
      e.code = "recovery_used";
    if (
      bucket !== "analysis" &&
      e instanceof UsageError &&
      ["network_daily", "global_daily", "global_monthly"].includes(e.code)
    )
      e.code = `requests_${e.code}`;
    throw e;
  }
  if (bucket === "feedback" && resource) {
    // A seven-day study may span two months. Its lifetime cap must not reset.
    await update(`usage/v1/${scope}/studies/${resource}.json`, (s) =>
      reserveUsage(
        s,
        { daily: 50, monthly: 50, perNetworkDaily: 10 },
        network,
        id,
        now,
      ),
    );
  }
  let visitorSettled = false;
  return async (completed = false, failureCode = "") => {
    // Persist personal completion BEFORE delivering a report. If this write fails,
    // do not claim a completed report or silently lose the completed-review counter.
    if (visitorPath && !visitorSettled) {
      await updateVisitor(visitorPath, (s) => {
        if (!s) throw new Error("Missing visitor reservation");
        return settleVisitor(s, id, completed);
      });
      visitorSettled = true;
    }
    if (completed) return; // Deliver the report before best-effort shared lease cleanup.
    if (!policies[bucket].concurrent) return;
    try {
      await update(path, (s) => {
        if (!s) throw new Error("Missing usage record");
        const next = settleUsage(s, id, day, false);
        if (["provider_unavailable", "provider_quota"].includes(failureCode))
          next.providerPauseUntil = Math.max(
            next.providerPauseUntil || 0,
            Date.now() + 120000,
          );
        return next;
      });
    } catch {
      /* Keep the cost reservation; the concurrency lease expires. */
    }
  };
}
export function usageResponse(error: unknown) {
  const e =
    error instanceof UsageError
      ? error
      : new UsageError("Requests are temporarily paused.", 503, 60);
  return Response.json(
    { error: e.message, code: e.code, resetAt: e.resetAt },
    {
      status: e.status,
      headers: {
        "Retry-After": String(e.retryAfter),
        "Cache-Control": "no-store",
      },
    },
  );
}

let snapshotCache:
  { path: string; state: UsageState | null; checkedAt: number } | undefined;
let snapshotPending: Promise<void> | undefined;
export async function readAllowance(request: Request, visitorKey: string) {
  const secret = process.env.BLOB_READ_WRITE_TOKEN;
  if (!secret) throw new UsageError("Usage unavailable.");
  const now = Date.now(),
    day = new Date(now).toISOString().slice(0, 10);
  const scope =
    process.env.VERCEL_ENV === "production" ? "production" : "development";
  const path = `usage/v1/${scope}/${day.slice(0, 7)}/analysis.json`;
  // A short, server-only cache coalesces status reads. Reservations always read
  // uncached state and remain authoritative. Never expose the underlying ledger.
  if (
    !snapshotCache ||
    snapshotCache.path !== path ||
    now - snapshotCache.checkedAt > 15000
  ) {
    snapshotPending ||= (async () => {
      const record = await get(path, {
        access: "private",
        useCache: false,
        abortSignal: AbortSignal.timeout(8000),
      });
      if (record && record.statusCode !== 200)
        throw new Error("Usage unavailable");
      const state = record
        ? stateSchema.parse(await new Response(record.stream).json())
        : null;
      snapshotCache = { path, state, checkedAt: Date.now() };
    })().finally(() => {
      snapshotPending = undefined;
    });
    await snapshotPending;
  }
  const address =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const network = createHmac("sha256", secret)
    .update(`${day}:${address}`)
    .digest("hex");
  const record = await get(`usage/v2/${scope}/visitors/${visitorKey}.json`, {
    access: "private",
    useCache: false,
    abortSignal: AbortSignal.timeout(8000),
  });
  if (record && record.statusCode !== 200)
    throw new Error("Visitor allowance unavailable");
  const visitor = record
    ? visitorSchema.parse(await new Response(record.stream).json())
    : null;
  const personal = visitorSnapshot(visitor, now);
  const shared = allowanceSnapshot(snapshotCache!.state, network, now);
  return {
    ...personal,
    code: personal.personalCode || shared.code,
    serviceCode: shared.code,
    serviceResetAt: shared.code ? shared.resetAt : null,
    resetAt: personal.personalCode
      ? personal.personalResetAt
      : shared.code
        ? shared.resetAt
        : personal.personalResetAt,
    checkedAt: Date.now(),
  };
}
