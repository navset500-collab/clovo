import { test } from "node:test";
import assert from "node:assert/strict";
import { openRecovery, sealRecovery } from "../lib/recovery.ts";
import { createModelBudget } from "../lib/model-budget.ts";
import { ModelError } from "../lib/model-error.ts";
import {
  reserveUsage,
  settleUsage,
  USAGE_LIMITS,
  UsageError,
} from "../lib/usage-policy.ts";
import type { ProjectInput } from "../lib/types.ts";
import { panelBatchSchema } from "../lib/validation.ts";
const now = Date.UTC(2026, 10, 19, 18);
const input: ProjectInput = {
  name: "Test",
  description: "A sample brief",
  audience: "Students",
  task: "Test",
  url: "",
  stage: "idea",
  language: "en",
  attachments: [],
};
const state = {
  reviewId: "test-review",
  calls: 7,
  stages: {
    mira: { product: "A student feedback tool" },
    leo: { summary: "Saved improvements" },
  },
  traces: {
    leo: { input: "concerns", output: "plan", durationMs: 20, details: [] },
    mira: { input: "brief", output: "product", durationMs: 20, details: [] },
  },
};
const secret = "test-only-secret",
  visitor = "test-browser";
test("a signed checkpoint preserves completed outputs and cumulative attempts", () => {
  const checkpoint = sealRecovery(state, input, visitor, secret, now)!;
  const restored = openRecovery(
    checkpoint.token,
    input,
    visitor,
    secret,
    now + 120001,
  );
  assert.deepEqual(restored.stages, state.stages);
  assert.equal(restored.calls, 7);
  assert.deepEqual(restored.traces, state.traces);
});
test("changing the token, browser, brief, language or file invalidates recovery", () => {
  const checkpoint = sealRecovery(state, input, visitor, secret, now)!;
  for (const [changedInput, changedBrowser, changedSecret] of [
    [{ ...input, description: "Tampered" }, visitor, secret],
    [{ ...input, language: "es" }, visitor, secret],
    [
      {
        ...input,
        attachments: [
          { id: "1", name: "file", kind: "image", data: "changed" },
        ],
      },
      visitor,
      secret,
    ],
    [input, "another-browser", secret],
    [input, visitor, "another-secret"],
  ] as [ProjectInput, string, string][]) {
    assert.throws(
      () =>
        openRecovery(
          checkpoint.token,
          changedInput,
          changedBrowser,
          changedSecret,
          now,
        ),
      ModelError,
    );
  }
  assert.throws(
    () => openRecovery("x" + checkpoint.token, input, visitor, secret, now),
    ModelError,
  );
  assert.throws(
    () =>
      openRecovery(checkpoint.token + ".extra", input, visitor, secret, now),
    ModelError,
  );
});
test("checkpoints expire in thirty minutes and cannot cross the monthly replay ledger", () => {
  for (const issued of [now, Date.UTC(2026, 10, 30, 23, 50)]) {
    const checkpoint = sealRecovery(state, input, visitor, secret, issued)!;
    const expiry = Date.parse(checkpoint.expiresAt);
    assert.ok(expiry <= issued + 1800000);
    openRecovery(checkpoint.token, input, visitor, secret, expiry - 1);
    assert.throws(
      () => openRecovery(checkpoint.token, input, visitor, secret, expiry),
      ModelError,
    );
  }
});
test("a consumed checkpoint cannot reserve a second attempt, even after a failed run", () => {
  const policy = { ...USAGE_LIMITS, perResource: 1 };
  let ledger = reserveUsage(
    null,
    policy,
    "wifi",
    "first",
    now,
    "resume:checkpoint",
  );
  ledger = settleUsage(ledger, "first", "2026-11-19", false);
  assert.throws(
    () =>
      reserveUsage(
        ledger,
        policy,
        "wifi",
        "replay",
        now + 1,
        "resume:checkpoint",
      ),
    (e: unknown) => e instanceof UsageError && e.code === "study_limit",
  );
  assert.equal(ledger.total, 1);
});
test("continuation attempts cannot reset the hard twelve-call model limit", async () => {
  const run = createModelBudget(12, 1, 10);
  let invoked = 0;
  await run(async () => {
    invoked++;
    return "Leo";
  });
  await run(async () => {
    invoked++;
    return "Vera";
  });
  await assert.rejects(
    run(async () => {
      invoked++;
    }),
    (e: unknown) => e instanceof ModelError && e.code === "model_budget",
  );
  assert.equal(invoked, 2);
  assert.equal(run.callsUsed(), 12);
  assert.equal(
    sealRecovery({ ...state, calls: 12 }, input, visitor, secret, now),
    null,
  );
});
test("a busy final stage can retry without rerunning completed stages within the same limit", async () => {
  const run = createModelBudget(12, 1, 7);
  let leo = 0;
  assert.equal(
    await run(async () => {
      if (++leo === 1) throw new ModelError("provider_unavailable", 503);
      return "Improvement plan";
    }),
    "Improvement plan",
  );
  assert.equal(run.callsUsed(), 9);
  assert.equal(await run(async () => "Human test"), "Human test");
  assert.equal(run.callsUsed(), 10);
});
test("the batched panel still requires five complete perspectives", () => {
  const persona = {
    name: "Test",
    role: "Student",
    situation: "Study",
    reaction: "Try",
    useful: "Feedback",
    friction: "Effort",
    alternative: "Classmates",
    wouldTry: "maybe",
    condition: "Evidence",
    nonUseReason: "Already have feedback",
    suggestedChange: "Focus",
  };
  const personas = Array.from({ length: 5 }, (_, profileIndex) => ({
    ...persona,
    profileIndex,
  }));
  assert.equal(panelBatchSchema.safeParse({ personas }).success, true);
  assert.equal(
    panelBatchSchema.safeParse({ personas: personas.slice(0, 4) }).success,
    false,
  );
});
