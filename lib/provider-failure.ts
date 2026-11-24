import { ModelError } from "./model-error.ts";

function nextPacificMidnight(now: number) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles", year: "numeric", month: "numeric", day: "numeric",
  }).formatToParts(now);
  const part = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const candidate = Date.UTC(part("year"), part("month") - 1, part("day") + 1, 8);
  const hour = Number(new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles", hour: "numeric", hourCycle: "h23",
  }).format(candidate));
  return candidate - hour * 3600000;
}

// Extract only allowlisted metadata. Never log or return the provider body,
// project identifiers, quota IDs, prompts or credentials.
export function providerFailure(status: number, retryAfter: string | null,
  body: unknown, now = Date.now(), inputCheck = false) {
  const details = (body as { error?: { details?: unknown[] } })?.error?.details;
  let seconds = retryAfter && /^\d+(?:\.\d+)?$/.test(retryAfter)
    ? Number(retryAfter) : retryAfter ? (Date.parse(retryAfter) - now) / 1000 : 0;
  if (!Number.isFinite(seconds)) seconds = 0;
  let quotaKind: "daily" | "minute" | "unknown" = "unknown";
  if (Array.isArray(details)) for (const item of details) {
    if (!item || typeof item !== "object") continue;
    const detail = item as Record<string, unknown>;
    if (detail["@type"] === "type.googleapis.com/google.rpc.RetryInfo" &&
      typeof detail.retryDelay === "string" && /^\d+(?:\.\d+)?s$/.test(detail.retryDelay))
      seconds = Math.max(seconds, Number(detail.retryDelay.slice(0, -1)));
    if (detail["@type"] === "type.googleapis.com/google.rpc.QuotaFailure" &&
      Array.isArray(detail.violations)) for (const violation of detail.violations) {
      const id = String(violation?.quotaId || "");
      if (/perday|per_day/i.test(id)) quotaKind = "daily";
      else if (quotaKind !== "daily" && /perminute|per_minute/i.test(id)) quotaKind = "minute";
    }
  }
  const code = status === 429 ? "provider_quota" : inputCheck ? "input_check_unavailable"
    : status === 400 ? "provider_rejected" : "provider_unavailable";
  const retryAt = status === 429 || (status === 503 && seconds > 0)
    ? Math.max(now + Math.max(120, Math.min(seconds, 86400)) * 1000,
        status === 429 && quotaKind === "daily" ? nextPacificMidnight(now) : 0)
    : undefined;
  return new ModelError(code, status, retryAt, status === 429 ? quotaKind : undefined);
}

export async function responseFailure(response: Response, inputCheck = false) {
  let body: unknown;
  try { body = await response.json(); } catch { /* Safe fallback for non-JSON errors. */ }
  return providerFailure(response.status, response.headers.get("Retry-After"), body, Date.now(), inputCheck);
}
