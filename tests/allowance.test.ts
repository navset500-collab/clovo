import { test } from "node:test";
import assert from "node:assert/strict";
import {
  reserveUsage,
  settleUsage,
  allowanceSnapshot,
  UsageError,
  USAGE_LIMITS,
} from "../lib/usage-policy.ts";
import {
  reserveVisitor,
  settleVisitor,
  visitorSnapshot,
  visitorIdentity,
  REVIEW_WINDOW_MS,
  type VisitorWindow,
} from "../lib/visitor-quota.ts";
import { errorText, reviewErrorCode, errorHeading } from "../lib/messages.ts";
const now = Date.UTC(2026, 10, 18, 19),
  day = "2026-11-18";
test("exactly five completed reports are permitted; the sixth is blocked", () => {
  let state: VisitorWindow | null = null;
  for (let i = 0; i < 5; i++) {
    state = reserveVisitor(state, String(i), now + i * 1000);
    state = settleVisitor(state, String(i), true);
    assert.equal(visitorSnapshot(state, now + 5000).reviewsRemaining, 4 - i);
  }
  assert.throws(
    () => reserveVisitor(state, "sixth", now + 6000),
    (e) => e instanceof UsageError && e.code === "visitor_completed",
  );
});
test("failures, cancellation and clarification do not consume a completed review", () => {
  let state: VisitorWindow | null = null;
  for (let i = 0; i < 7; i++) {
    state = settleVisitor(
      reserveVisitor(state, String(i), now + i * 1000),
      String(i),
      false,
    );
  }
  assert.equal(visitorSnapshot(state, now + 8000).reviewsRemaining, 5);
});
test("the window resets at exactly five hours, including across midnight and month boundaries", () => {
  for (const start of [now, Date.UTC(2026, 10, 30, 23)]) {
    let state = reserveVisitor(null, "one", start);
    state = { ...settleVisitor(state, "one", true), completed: 5 };
    assert.equal(
      visitorSnapshot(state, start + REVIEW_WINDOW_MS - 1).reviewsRemaining,
      0,
    );
    assert.equal(
      visitorSnapshot(state, start + REVIEW_WINDOW_MS).reviewsRemaining,
      5,
    );
    assert.equal(
      reserveVisitor(state, "new", start + REVIEW_WINDOW_MS).startedAt,
      start + REVIEW_WINDOW_MS,
    );
  }
});
test("parallel requests cannot both reserve the final review and settlement is idempotent", () => {
  let state = reserveVisitor(
    { startedAt: now, completed: 4, active: null },
    "first",
    now,
  );
  assert.throws(
    () => reserveVisitor(state, "parallel", now),
    (e) => e instanceof UsageError && e.code === "visitor_busy",
  );
  state = settleVisitor(state, "first", true);
  assert.equal(state.completed, 5);
  assert.deepEqual(settleVisitor(state, "first", true), state);
  assert.deepEqual(settleVisitor(state, "unknown", true), state);
});
test("expired failed leases can retry and late settlement cannot count a different run", () => {
  let state = reserveVisitor(null, "old", now);
  state = reserveVisitor(state, "new", now + 200001);
  assert.equal(settleVisitor(state, "old", true).completed, 0);
  assert.equal(visitorSnapshot(state, now + 200001).reviewsRemaining, 5);
});
test("anonymous browsers on the same Wi-Fi have distinct signed counters", () => {
  const request = new Request("https://clovo.example", {
      headers: { "x-forwarded-for": "shared" },
    }),
    secret = "test-only-secret";
  const a = visitorIdentity(request, secret),
    b = visitorIdentity(request, secret);
  assert.notEqual(a.key, b.key);
  assert.match(a.cookie!, /HttpOnly; SameSite=Lax/);
  assert.match(a.cookie!, /Secure/);
  const existing = new Request(request, {
    headers: { cookie: a.cookie!.split(";")[0] },
  });
  assert.equal(visitorIdentity(existing, secret).key, a.key);
  assert.equal(visitorIdentity(existing, secret).cookie, undefined);
  const tampered = new Request(request, {
    headers: { cookie: a.cookie!.split(";")[0].replace(/.$/, "z") },
  });
  assert.notEqual(visitorIdentity(tampered, secret).key, a.key);
});
test("five personal reviews do not remove the shared monthly spending ceiling or past usage", () => {
  let state = reserveUsage(null, USAGE_LIMITS, "wifi", "old", now);
  state = settleUsage(state, "old", day, false);
  state.total = 20;
  assert.throws(
    () => reserveUsage(state, USAGE_LIMITS, "other", "new", now),
    (e) => e instanceof UsageError && e.code === "global_monthly",
  );
  assert.equal(allowanceSnapshot(state, "wifi", now).code, "global_monthly");
  assert.equal(visitorSnapshot(null, now).reviewsRemaining, 5);
  state.total = 6;
  state.daily = 1;
  state.networks.wifi = 3;
  assert.equal(reserveUsage(state, USAGE_LIMITS, "wifi", "new", now).total, 7);
});
test("provider cooldown blocks new model work without claiming a personal quota is exhausted", () => {
  let state = reserveUsage(null, USAGE_LIMITS, "wifi", "1", now);
  state = settleUsage(state, "1", day, false);
  state.providerPauseUntil = now + 120000;
  assert.throws(
    () => reserveUsage(state, USAGE_LIMITS, "wifi", "2", now + 1),
    (e) => e instanceof UsageError && e.code === "service_provider_unavailable",
  );
  assert.equal(
    allowanceSnapshot(state, "wifi", now + 1).code,
    "service_provider_unavailable",
  );
  assert.equal(
    reserveUsage(state, USAGE_LIMITS, "wifi", "2", now + 120000).total,
    2,
  );
});
test("errors retain their cause and translate independently of personal allowance", () => {
  for (const code of [
    "visitor_completed",
    "visitor_busy",
    "global_monthly",
    "service_provider_unavailable",
    "provider_unavailable",
    "review_timeout",
    "review_connection",
    "stream_interrupted",
    "panel_invalid",
  ]) {
    assert.notEqual(errorText(code, "es"), code);
    assert.notEqual(errorText(code, "es"), errorText(code, "en"));
    assert.equal(reviewErrorCode(new Error(code)), code);
  }
  assert.equal(
    reviewErrorCode(new DOMException("timed out", "TimeoutError")),
    "review_timeout",
  );
  assert.equal(
    reviewErrorCode(new TypeError("Failed to fetch")),
    "review_connection",
  );
  assert.equal(
    reviewErrorCode(new Error("secret body should never display")),
    "review_failed",
  );
  assert.match(errorHeading("provider_unavailable", "en"), /AI service/);
  assert.match(errorHeading("global_monthly", "en"), /shared budget/);
  assert.match(errorHeading("visitor_completed", "en"), /five reviews/);
});
