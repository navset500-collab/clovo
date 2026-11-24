import { reviewErrorCode } from "./messages.ts";

// The edge firewall may return HTML instead of the app's JSON envelope.
// Preserve the HTTP meaning without showing provider/edge response bodies.
export async function reviewHttpFailure(response: Response, now = Date.now()) {
  let body: { code?: string; resetAt?: string } = {};
  try { body = await response.json() || {}; } catch { /* Edge response. */ }
  const fallback = response.status === 429 ? "request_limit"
    : response.status === 403 ? "invalid_origin"
    : response.status >= 500 ? "review_connection" : "review_failed";
  const code = typeof body.code === "string" ? reviewErrorCode(new Error(body.code)) : fallback;
  const delay = Number(response.headers.get("Retry-After"));
  const resetAt = typeof body.resetAt === "string" && Number.isFinite(Date.parse(body.resetAt))
    ? body.resetAt : response.status === 429
      ? new Date(now + (Number.isFinite(delay) && delay > 0 ? Math.min(delay, 86400) : 60) * 1000).toISOString()
      : undefined;
  return { code, resetAt };
}
