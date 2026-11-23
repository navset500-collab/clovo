import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { UsageError } from "./usage-policy.ts";
import {
  REVIEWS_PER_WINDOW,
  REVIEW_WINDOW_HOURS,
  REVIEW_WINDOW_MS,
} from "./review-limits.ts";
export { REVIEWS_PER_WINDOW, REVIEW_WINDOW_MS } from "./review-limits.ts";
export type VisitorWindow = {
  startedAt: number;
  completed: number;
  completedAt?: number[];
  active: { id: string; expires: number } | null;
};
function completions(state: VisitorWindow | null, now: number) {
  // Preserve legacy counts conservatively until 24 hours after their old start.
  const times =
    state?.completedAt ??
    Array.from({ length: state?.completed || 0 }, () => state!.startedAt);
  return times
    .filter((at) => at > now - REVIEW_WINDOW_MS)
    .sort((a, b) => a - b);
}
export function visitorSnapshot(state: VisitorWindow | null, now: number) {
  const times = completions(state, now);
  const remaining = Math.max(0, REVIEWS_PER_WINDOW - times.length);
  return {
    reviewsRemaining: remaining,
    reviewLimit: REVIEWS_PER_WINDOW,
    windowHours: REVIEW_WINDOW_HOURS,
    personalCode: remaining === 0 ? "visitor_completed" : "",
    personalResetAt: times.length
      ? new Date(times[0] + REVIEW_WINDOW_MS).toISOString()
      : null,
  };
}
export function reserveVisitor(
  state: VisitorWindow | null,
  id: string,
  now: number,
): VisitorWindow {
  const times = completions(state, now);
  if (times.length >= REVIEWS_PER_WINDOW) {
    const reset = times[0] + REVIEW_WINDOW_MS;
    throw new UsageError(
      "Ten completed reviews used in the last 24 hours.",
      429,
      Math.ceil((reset - now) / 1000),
      "visitor_completed",
      new Date(reset).toISOString(),
    );
  }
  if (state?.active && state.active.expires > now)
    throw new UsageError(
      "A review is already running in this browser.",
      429,
      30,
      "visitor_busy",
    );
  return {
    startedAt: state?.startedAt || now,
    completed: times.length,
    completedAt: times,
    active: { id, expires: now + 200000 },
  };
}
export function settleVisitor(
  state: VisitorWindow,
  id: string,
  completed: boolean,
  now = Date.now(),
): VisitorWindow {
  if (state.active?.id !== id) return state;
  const times = completions(state, now);
  if (completed) times.push(now);
  return {
    ...state,
    completed: times.length,
    completedAt: times,
    active: null,
  };
}
// A signed anonymous browser identifier, never an account or identity claim.
export function visitorIdentity(request: Request, secret: string) {
  const value =
    request.headers
      .get("cookie")
      ?.split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith("clovo_visitor="))
      ?.slice(14) || "";
  const [id, signature] = value.split(".");
  const sign = (v: string) =>
    createHmac("sha256", secret).update(`clovo-visitor-v1:${v}`).digest("hex");
  const valid =
    /^[0-9a-f-]{36}$/.test(id || "") &&
    /^[0-9a-f]{64}$/.test(signature || "") &&
    timingSafeEqual(Buffer.from(signature), Buffer.from(sign(id)));
  const chosen = valid ? id : randomUUID();
  return {
    key: sign(chosen),
    cookie: valid
      ? undefined
      : `clovo_visitor=${chosen}.${sign(chosen)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`,
  };
}
