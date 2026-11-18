import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { UsageError } from "./usage-policy.ts";
export const REVIEW_WINDOW_MS = 5 * 60 * 60 * 1000;
export const REVIEWS_PER_WINDOW = 5;
export type VisitorWindow = {
  startedAt: number;
  completed: number;
  active: { id: string; expires: number } | null;
};
export function visitorSnapshot(state: VisitorWindow | null, now: number) {
  const current =
    state && now < state.startedAt + REVIEW_WINDOW_MS ? state : null;
  const remaining = Math.max(0, REVIEWS_PER_WINDOW - (current?.completed || 0));
  return {
    reviewsRemaining: remaining,
    reviewLimit: REVIEWS_PER_WINDOW,
    windowHours: 5,
    personalCode: remaining === 0 ? "visitor_completed" : "",
    personalResetAt: current
      ? new Date(current.startedAt + REVIEW_WINDOW_MS).toISOString()
      : null,
  };
}
export function reserveVisitor(
  state: VisitorWindow | null,
  id: string,
  now: number,
): VisitorWindow {
  const current =
    state && now < state.startedAt + REVIEW_WINDOW_MS
      ? structuredClone(state)
      : { startedAt: now, completed: 0, active: null };
  if (current.completed >= REVIEWS_PER_WINDOW) {
    const reset = current.startedAt + REVIEW_WINDOW_MS;
    throw new UsageError(
      "Five completed reviews used.",
      429,
      Math.ceil((reset - now) / 1000),
      "visitor_completed",
      new Date(reset).toISOString(),
    );
  }
  if (current.active && current.active.expires > now)
    throw new UsageError(
      "A review is already running in this browser.",
      429,
      30,
      "visitor_busy",
    );
  current.active = { id, expires: now + 200000 };
  return current;
}
export function settleVisitor(
  state: VisitorWindow,
  id: string,
  completed: boolean,
): VisitorWindow {
  if (state.active?.id !== id) return state;
  return {
    ...state,
    completed: state.completed + (completed ? 1 : 0),
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
