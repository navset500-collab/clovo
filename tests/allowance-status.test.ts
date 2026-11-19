import { test } from "node:test";
import assert from "node:assert/strict";
import {
  checkAllowance,
  AllowanceCheckError,
} from "../lib/allowance-status.ts";
import { errorText } from "../lib/messages.ts";

const available = {
  ready: true,
  requiresCode: false,
  allowance: {
    reviewsRemaining: 5,
    reviewLimit: 5,
    windowHours: 5,
    personalCode: "",
    personalResetAt: null,
    code: "",
    serviceCode: "",
    serviceResetAt: null,
    resetAt: null,
    checkedAt: 1,
  },
};
const instant = async () => {};
const signal = () => new AbortController().signal;

test("a temporary storage failure recovers once without invoking an analysis", async () => {
  let calls = 0,
    retries = 0;
  const result = await checkAllowance(
    signal(),
    () => retries++,
    async (url, init) => {
      assert.equal(url, "/api/status");
      assert.equal(init?.method, undefined);
      assert.equal(init?.credentials, "same-origin");
      calls++;
      return calls === 1
        ? new Response(null, { status: 503, headers: { "Retry-After": "5" } })
        : Response.json(available);
    },
    async (ms) => {
      assert.equal(ms, 5000);
    },
  );
  assert.equal(result.allowance?.reviewsRemaining, 5);
  assert.equal(calls, 2);
  assert.equal(retries, 1);
});
test("network failures stop after two attempts and never invent an allowance", async () => {
  let calls = 0;
  await assert.rejects(
    checkAllowance(
      signal(),
      () => {},
      async () => {
        calls++;
        throw new TypeError("Failed to fetch");
      },
      instant,
    ),
    (e: unknown) =>
      e instanceof AllowanceCheckError &&
      e.code === "allowance_check_unavailable",
  );
  assert.equal(calls, 2);
});
test("rate limits and origin rejections are not retried", async () => {
  for (const status of [429, 403]) {
    let calls = 0;
    await assert.rejects(
      checkAllowance(
        signal(),
        () => assert.fail("must not retry"),
        async () => {
          calls++;
          return new Response(null, { status });
        },
        instant,
      ),
      AllowanceCheckError,
    );
    assert.equal(calls, 1);
  }
});
test("a long Retry-After is respected without automatic polling", async () => {
  await assert.rejects(
    checkAllowance(
      signal(),
      () => assert.fail("must not retry"),
      async () =>
        new Response(null, { status: 503, headers: { "Retry-After": "60" } }),
      instant,
    ),
    AllowanceCheckError,
  );
});
test("real personal and shared quota pauses pass through unchanged", async () => {
  for (const code of [
    "visitor_completed",
    "global_monthly",
    "service_provider_unavailable",
  ]) {
    const payload = {
      ...available,
      allowance: { ...available.allowance, code },
    };
    const result = await checkAllowance(
      signal(),
      () => assert.fail("must not retry"),
      async () => Response.json(payload),
      instant,
    );
    assert.equal(result.allowance?.code, code);
  }
  const result = await checkAllowance(
    signal(),
    () => assert.fail("must not retry"),
    async () =>
      Response.json({ ready: false, requiresCode: false, allowance: null }),
    instant,
  );
  assert.equal(result.ready, false);
});
test("legacy missing counters and malformed responses never unlock reviews", async () => {
  for (const payload of [
    { ...available, allowance: null },
    { ready: true },
    {
      ...available,
      allowance: { ...available.allowance, reviewsRemaining: 99 },
    },
  ]) {
    let calls = 0;
    await assert.rejects(
      checkAllowance(
        signal(),
        () => {},
        async () => {
          calls++;
          return Response.json(payload);
        },
        instant,
      ),
      AllowanceCheckError,
    );
    assert.equal(calls, 2);
  }
});
test("leaving during retry aborts without a second request", async () => {
  let calls = 0;
  const controller = new AbortController();
  await assert.rejects(
    checkAllowance(
      controller.signal,
      () => controller.abort(),
      async () => {
        calls++;
        return new Response(null, { status: 503 });
      },
    ),
    (e: unknown) => e instanceof Error && e.name === "AbortError",
  );
  assert.equal(calls, 1);
});
test("availability errors have distinct English and Spanish wording", () => {
  for (const code of [
    "allowance_check_unavailable",
    "allowance_check_limited",
  ]) {
    assert.notEqual(errorText(code, "en"), code);
    assert.notEqual(errorText(code, "es"), code);
    assert.notEqual(errorText(code, "en"), errorText(code, "es"));
  }
});
