import { test } from "node:test";
import assert from "node:assert/strict";
import { guard } from "../lib/access.ts";
import { errorCode, errorText, reviewErrorCode } from "../lib/messages.ts";
import { providerFailure } from "../lib/provider-failure.ts";
import { reviewHttpFailure } from "../lib/review-http.ts";
import { createModelBudget } from "../lib/model-budget.ts";
import { allowanceSnapshot, reserveUsage, settleUsage, UsageError, USAGE_LIMITS } from "../lib/usage-policy.ts";
import { visitorSnapshot } from "../lib/visitor-quota.ts";
const now = Date.parse("2026-11-23T17:40:00Z");
const request = (ip: string, origin = "https://clovo.example") => new Request("https://clovo.example/api/analyze", {
  headers: { origin, "x-forwarded-for": ip },
});
test("local burst guard permits the tenth request, blocks a flood and expires after a minute, not an hour", () => {
  const req = request("test-one");
  for (let i = 0; i < 30; i++) assert.equal(guard(req, "analysis-test", 30, now), null);
  assert.equal(errorCode(guard(req, "analysis-test", 30, now + 59999)!), "request_limit");
  assert.equal(guard(req, "analysis-test", 30, now + 60000), null);
  assert.equal(visitorSnapshot(null, now).reviewsRemaining, 10);
});
test("invalid origins consume no burst allowance and separate networks remain independent", () => {
  assert.equal(guard(request("origin-test", "https://evil.example"), "origin", 1, now), "Invalid request origin.");
  assert.equal(guard(request("origin-test"), "origin", 1, now), null);
  assert.equal(guard(request("other-network"), "origin", 1, now), null);
});
test("checking availability more than 90 times in an hour is not a completed-review limit", () => {
  const req = request("status-test");
  for (let i = 0; i < 100; i++) assert.equal(guard(req, "status-test", 120, now + i * 1000), null);
});
test("provider 429 retains its Retry-After and is distinct from personal exhaustion", () => {
  const failure = providerFailure(429, "300", {}, now);
  assert.equal(failure.code, "provider_quota");
  assert.equal(failure.retryAt, now + 300000);
  assert.equal(reviewErrorCode(failure), "provider_quota");
  assert.equal(visitorSnapshot(null, now).reviewsRemaining, 10);
});
test("Google RetryInfo and minute quotas expose only sanitized metadata", () => {
  const failure = providerFailure(429, null, { error: { message: "private project data", details: [
    { "@type": "type.googleapis.com/google.rpc.RetryInfo", retryDelay: "180.5s" },
    { "@type": "type.googleapis.com/google.rpc.QuotaFailure", violations: [{ quotaId: "GenerateRequestsPerMinutePerProject", quotaMetric: "private-metric" }] },
  ] } }, now);
  assert.equal(failure.retryAt, now + 180500);
  assert.equal(failure.quotaKind, "minute");
  assert.doesNotMatch(JSON.stringify(failure), /private/);
});
test("daily quota recovery uses Pacific midnight in winter, summer and DST transitions", () => {
  for (const [start, end] of [
    ["2026-11-23T17:40:00Z", "2026-11-24T08:00:00Z"],
    ["2026-07-23T17:40:00Z", "2026-07-24T07:00:00Z"],
    ["2026-03-08T10:40:00Z", "2026-03-09T07:00:00Z"],
    ["2026-11-01T10:40:00Z", "2026-11-02T08:00:00Z"],
  ]) {
    const failure = providerFailure(429, "30", { error: { details: [
      { "@type": "type.googleapis.com/google.rpc.QuotaFailure", violations: [{ quotaId: "GenerateRequestsPerDayPerProject" }] },
    ] } }, Date.parse(start));
    assert.equal(failure.retryAt, Date.parse(end));
    assert.equal(failure.quotaKind, "daily");
  }
});
test("malformed retry metadata falls back safely; HTTP dates are understood", () => {
  assert.equal(providerFailure(429, "garbage", null, now).retryAt, now + 120000);
  assert.equal(providerFailure(429, new Date(now + 600000).toUTCString(), null, now).retryAt, now + 600000);
  assert.equal(providerFailure(400, null, null, now).code, "provider_rejected");
});
test("provider Retry-After prevents a premature automatic retry", async () => {
  let calls = 0;
  const run = createModelBudget(12, 1);
  await assert.rejects(run(async () => {
    calls++;
    throw providerFailure(503, "300", {}, Date.now());
  }));
  assert.equal(calls, 1);
});
test("provider quota pause stays separate and releases at its timestamp", () => {
  let state = settleUsage(reserveUsage(null, USAGE_LIMITS, "wifi", "one", now), "one", "2026-11-23", false);
  state.providerPauseUntil = now + 300000;
  state.providerPauseCode = "service_provider_quota";
  assert.equal(allowanceSnapshot(state, "wifi", now).code, "service_provider_quota");
  assert.throws(() => reserveUsage(state, USAGE_LIMITS, "wifi", "two", now),
    (e) => e instanceof UsageError && e.code === "service_provider_quota");
  assert.equal(reserveUsage(state, USAGE_LIMITS, "wifi", "two", now + 300000).total, 2);
  for (const language of ["en", "es"] as const)
    assert.notEqual(errorText("service_provider_quota", language), "service_provider_quota");
});
test("preflight reports the same busy state that an authoritative reservation enforces", () => {
  const state = reserveUsage(null, USAGE_LIMITS, "wifi", "one", now);
  assert.equal(allowanceSnapshot(state, "wifi", now).code, "team_busy");
  assert.equal(allowanceSnapshot(state, "other", now).code, "");
  assert.equal(allowanceSnapshot(state, "wifi", now + 200000).code, "");
});
test("edge HTML 429 renders a burst pause, never a used-up personal allowance", async () => {
  const result = await reviewHttpFailure(new Response("<html>Too many requests</html>", {
    status: 429, headers: { "Retry-After": "60" },
  }), now);
  assert.equal(result.code, "request_limit");
  assert.equal(result.resetAt, new Date(now + 60000).toISOString());
});
test("app quota responses preserve their specific scope and reset", async () => {
  const result = await reviewHttpFailure(Response.json({ code: "visitor_completed", resetAt: new Date(now + 1000).toISOString() }, {status: 429}), now);
  assert.equal(result.code, "visitor_completed");
  assert.equal(result.resetAt, new Date(now + 1000).toISOString());
  assert.equal((await reviewHttpFailure(new Response("unavailable", {status:503}), now)).code, "review_connection");
});
