import { z } from "zod";

const allowanceSchema = z.object({
  reviewsRemaining: z.number().int().min(0).max(10),
  reviewLimit: z.union([z.literal(5), z.literal(10)]),
  windowHours: z.union([z.literal(5), z.literal(24)]),
  personalCode: z.string(),
  personalResetAt: z.string().nullable(),
  code: z.string(),
  serviceCode: z.string(),
  serviceResetAt: z.string().nullable(),
  resetAt: z.string().nullable(),
  checkedAt: z.number(),
});
const statusSchema = z.object({
  ready: z.boolean(),
  requiresCode: z.boolean(),
  allowance: allowanceSchema.nullable(),
});
export type AllowanceSnapshot = z.infer<typeof allowanceSchema>;
export class AllowanceCheckError extends Error {
  code: string;
  constructor(code: string) {
    super(code);
    this.code = code;
  }
}
function wait(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    signal.throwIfAborted();
    const abort = () => {
      clearTimeout(timer);
      reject(signal.reason);
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", abort);
      resolve();
    }, ms);
    signal.addEventListener("abort", abort, { once: true });
  });
}
// Status checks never reserve usage or invoke AI. One bounded retry recovers
// transient reads; quota responses and explicit pauses are never retried.
export async function checkAllowance(
  signal: AbortSignal,
  onRetry: () => void,
  fetcher: typeof fetch = fetch,
  delay: typeof wait = wait,
) {
  for (let attempt = 0; attempt < 2; attempt++) {
    let retryDelay = 2000;
    try {
      signal.throwIfAborted();
      const response = await fetcher("/api/status", {
        cache: "no-store",
        credentials: "same-origin",
        signal: AbortSignal.any([signal, AbortSignal.timeout(20000)]),
      });
      if (response.status === 429)
        throw new AllowanceCheckError("allowance_check_limited");
      if (response.status === 403)
        throw new AllowanceCheckError("invalid_origin");
      if (!response.ok) {
        const seconds = Number(response.headers.get("Retry-After"));
        if (Number.isFinite(seconds) && seconds > 0) {
          if (seconds > 10)
            throw new AllowanceCheckError("allowance_check_unavailable");
          retryDelay = seconds * 1000;
        }
        if (response.status < 500)
          throw new AllowanceCheckError("allowance_check_unavailable");
        throw new Error("Status service unavailable");
      }
      const data = statusSchema.parse(await response.json());
      if (data.ready && !data.allowance) throw new Error("Missing allowance");
      return data;
    } catch (error) {
      signal.throwIfAborted();
      if (error instanceof AllowanceCheckError) throw error;
      if (attempt === 1)
        throw new AllowanceCheckError("allowance_check_unavailable");
      onRetry();
      await delay(retryDelay, signal);
    }
  }
  throw new AllowanceCheckError("allowance_check_unavailable");
}
