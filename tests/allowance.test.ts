import { test } from "node:test";
import assert from "node:assert/strict";
import {
  reserveUsage,
  settleUsage,
  allowanceSnapshot,
  UsageError,
  USAGE_LIMITS,
} from "../lib/usage-policy.ts";
import { errorText } from "../lib/messages.ts";
const now = Date.UTC(2026, 10, 16, 20);
const day = "2026-11-16";
test("an interrupted run leaves a bounded retry without refunding cost reservations", () => {
  let state = reserveUsage(null, USAGE_LIMITS, "wifi", "1", now);
  state = settleUsage(state, "1", day, false);
  assert.equal(state.total, 1);
  assert.equal(state.daily, 1);
  assert.equal(state.completedNetworks?.wifi || 0, 0);
  assert.equal(allowanceSnapshot(state, "wifi", now).reviewsRemaining, 2);
  state = reserveUsage(state, USAGE_LIMITS, "wifi", "2", now);
  state = settleUsage(state, "2", day, true);
  state = reserveUsage(state, USAGE_LIMITS, "wifi", "3", now);
  state = settleUsage(state, "3", day, true);
  assert.equal(state.completedNetworks?.wifi, 2);
  assert.equal(state.total, 3);
  assert.throws(
    () => reserveUsage(state, USAGE_LIMITS, "wifi", "4", now),
    (e: unknown) => e instanceof UsageError && e.code === "network_completed",
  );
});
test("two successful reports stop a network even with a start left", () => {
  let state = settleUsage(
    reserveUsage(null, USAGE_LIMITS, "wifi", "1", now),
    "1",
    day,
    true,
  );
  state = settleUsage(
    reserveUsage(state, USAGE_LIMITS, "wifi", "2", now),
    "2",
    day,
    true,
  );
  const snapshot = allowanceSnapshot(state, "wifi", now);
  assert.equal(snapshot.networkRemaining, 1);
  assert.equal(snapshot.reviewsRemaining, 0);
  assert.equal(snapshot.code, "network_completed");
  assert.throws(
    () => reserveUsage(state, USAGE_LIMITS, "wifi", "3", now),
    UsageError,
  );
});
test("repeated failures cannot bypass the network attempt cap", () => {
  let state = null;
  for (let i = 0; i < 3; i++)
    state = settleUsage(
      reserveUsage(state, USAGE_LIMITS, "wifi", String(i), now),
      String(i),
      day,
      false,
    );
  assert.equal(state!.total, 3);
  assert.throws(
    () => reserveUsage(state, USAGE_LIMITS, "wifi", "again", now),
    (e: unknown) => e instanceof UsageError && e.code === "network_daily",
  );
});
test("settlement is idempotent and does not recreate expired or unknown runs", () => {
  const state = reserveUsage(null, USAGE_LIMITS, "wifi", "1", now);
  const once = settleUsage(state, "1", day, true);
  assert.deepEqual(settleUsage(once, "1", day, true), once);
  assert.deepEqual(settleUsage(once, "unknown", day, true), once);
});
test("day rollover resets completed reviews but keeps the monthly cost history", () => {
  let state = settleUsage(
    reserveUsage(null, USAGE_LIMITS, "wifi", "1", now),
    "1",
    day,
    true,
  );
  state = reserveUsage(state, USAGE_LIMITS, "wifi", "2", now + 86400000);
  assert.equal(state.total, 2);
  assert.equal(state.daily, 1);
  assert.equal(state.completedNetworks?.wifi || 0, 0);
  const late = settleUsage(state, "2", day, true);
  assert.equal(late.completedNetworks?.wifi || 0, 0);
});
test("legacy ledgers retain every old start and allow only the additional bounded start", () => {
  let state = reserveUsage(null, USAGE_LIMITS, "wifi", "old1", now);
  state.active = [];
  state = reserveUsage(state, USAGE_LIMITS, "wifi", "old2", now);
  state.active = [];
  delete state.completedNetworks;
  state = reserveUsage(state, USAGE_LIMITS, "wifi", "new", now);
  assert.equal(state.total, 3);
  assert.equal(state.networks.wifi, 3);
  state = settleUsage(state, "new", day, false);
  assert.throws(
    () => reserveUsage(state, USAGE_LIMITS, "wifi", "fourth", now),
    UsageError,
  );
});
test("shared caps override a network's remaining retries and provide accurate reset times", () => {
  let state = reserveUsage(null, USAGE_LIMITS, "wifi", "1", now);
  state.total = 20;
  const snapshot = allowanceSnapshot(state, "wifi", now);
  assert.equal(snapshot.code, "global_monthly");
  assert.equal(snapshot.resetAt, "2026-12-01T00:00:00.000Z");
  assert.throws(
    () => reserveUsage(state, USAGE_LIMITS, "new-wifi", "2", now),
    (e: unknown) =>
      e instanceof UsageError &&
      e.code === "global_monthly" &&
      e.resetAt === snapshot.resetAt &&
      e.retryAfter > 86400,
  );
  state.total = 5;
  state.daily = 5;
  assert.equal(allowanceSnapshot(state, "wifi", now).code, "global_daily");
  assert.equal(
    allowanceSnapshot(state, "wifi", now).resetAt,
    "2026-11-17T00:00:00.000Z",
  );
});
test("changing language translates existing quota errors, including old server messages", () => {
  const old =
    "This network has reached its daily allowance. Please return after midnight UTC. Shared Wi-Fi uses the same allowance.";
  assert.match(errorText(old, "es"), /Esta red/);
  assert.match(errorText(old, "en"), /This Wi-Fi/);
  for (const code of [
    "network_daily",
    "network_completed",
    "global_daily",
    "global_monthly",
    "quota_unavailable",
    "quota_busy",
    "team_busy",
    "review_failed",
    "provider_quota",
    "review_cancelled",
    "study_limit",
  ]) {
    assert.notEqual(errorText(code, "es"), code);
    assert.notEqual(errorText(code, "es"), errorText(code, "en"));
  }
});
