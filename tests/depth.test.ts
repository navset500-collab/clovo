import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PANEL_SIZE,
  PANEL_LENSES,
  checkPanelCoverage,
  collectPanel,
} from "../lib/panel.ts";
import { panelPlanSchema, personaSchema } from "../lib/validation.ts";
import { auditResearch } from "../lib/research.ts";
import { groundConcerns, linkPlans } from "../lib/evidence.ts";
import { scoreReadiness } from "../lib/scoring.ts";
import { USAGE_LIMITS } from "../lib/usage-policy.ts";
import { alignFictionalProfiles } from "../lib/personas.ts";
import type { PanelProfile, Persona, EvidenceSource } from "../lib/types.ts";
const profiles: PanelProfile[] = PANEL_LENSES.map((lens, i) => ({
  name: `Person ${i}`,
  role: "Working mother",
  situation: `Different relevant situation ${i}`,
  focus: `Mechanism ${i}`,
  ageRange: `${25 + i * 5}–${29 + i * 5}`,
  context: `Resources and experience ${i}`,
  lens,
}));
const person: Persona = {
  name: "Test",
  role: "Working mother",
  situation: "Uses a paper diary",
  reaction: "I might keep the diary.",
  useful: "Timing",
  friction: "Switching",
  alternative: "Paper",
  wouldTry: "maybe",
  condition: "Less work",
  nonUseReason: "Current diary works",
  suggestedChange: "Test one daily task",
};
test("the panel requires five unique names and five complementary lenses", () => {
  assert.equal(PANEL_SIZE, 5);
  assert.equal(checkPanelCoverage(profiles).length, 5);
  assert.throws(() => checkPanelCoverage(profiles.slice(0, 3)));
  assert.throws(() =>
    checkPanelCoverage(
      profiles.map((p, i) => ({
        ...p,
        lens: i === 4 ? profiles[0].lens : p.lens,
      })),
    ),
  );
  assert.throws(() =>
    checkPanelCoverage(profiles.map((p) => ({ ...p, name: "Same" }))),
  );
  assert.equal(panelPlanSchema.safeParse({ profiles }).success, true);
  assert.equal(
    panelPlanSchema.safeParse({ profiles: profiles.slice(0, 3) }).success,
    false,
  );
});
test("valid fictional identities are not replaced with a fixed cast", () => {
  const aligned = alignFictionalProfiles(
    profiles,
    "Working mothers balancing school pickups and a changing work schedule",
  );
  assert.deepEqual(
    aligned.map((p) => p.name),
    profiles.map((p) => p.name),
  );
  assert.equal(new Set(aligned.map((p) => p.ageRange)).size, 5);
});
test("one failed persona preserves the other four and their original lane indices", async () => {
  const called: number[] = [],
    failures: number[] = [];
  const output = await collectPanel(
    profiles,
    async (p, i) => {
      called.push(i);
      if (i === 2) throw new Error("Provider unavailable");
      return { ...person, name: p.name };
    },
    (i) => failures.push(i),
    new AbortController().signal,
  );
  assert.equal(called.length, 5);
  assert.deepEqual(
    output.personas.map((p) => p.panelIndex),
    [0, 1, 3, 4],
  );
  assert.deepEqual(output.unavailable, [2]);
  assert.deepEqual(failures, [2]);
});
test("a fully unavailable panel never fabricates feedback and cancellation rejects completion", async () => {
  const output = await collectPanel(
    profiles,
    async () => {
      throw new Error("Unavailable");
    },
    () => {},
    new AbortController().signal,
  );
  assert.equal(output.personas.length, 0);
  assert.equal(output.unavailable.length, 5);
  const c = new AbortController();
  c.abort();
  await assert.rejects(
    collectPanel(
      profiles,
      async () => person,
      () => {},
      c.signal,
    ),
    /stopped/,
  );
});
test("persona schema requires an explicit non-adoption reason and change to test", () => {
  assert.equal(personaSchema.safeParse(person).success, true);
  const { nonUseReason, suggestedChange, ...old } = person;
  assert.equal(personaSchema.safeParse(old).success, false);
});
test("research audit counts cited excerpts separately from retrieved sources", () => {
  const sources = [
    {
      id: "s1",
      url: "https://example.com/product",
      title: "Product",
      excerpt: "A shared calendar for small teams.",
    },
    {
      id: "s2",
      url: "https://example.com/research",
      title: "Research",
      excerpt: "The study included twelve teams.",
    },
    {
      id: "s3",
      url: "https://other.example/product",
      title: "Unused",
      excerpt: "Unrelated results",
    },
  ];
  const audit = auditResearch(
    {
      sources,
      signals: [
        {
          title: "Claim",
          detail: "A claim",
          sourceIds: ["s1"],
          citations: [
            { sourceId: "s1", quote: "A shared calendar for small teams." },
          ],
        },
      ],
      alternatives: [
        {
          name: "Tool",
          difference: "Alternative",
          sourceIds: ["s2"],
          citations: [
            { sourceId: "s2", quote: "The study included twelve teams." },
          ],
        },
      ],
    },
    4,
  );
  assert.deepEqual(audit, {
    retrievedSources: 3,
    citedSources: 2,
    sourceDomains: 1,
    retainedFindings: 2,
    discardedFindings: 2,
  });
});
test("ranked concerns retain evidence checks and give alternative directions valid provenance", () => {
  const items = [
    {
      title: "Low",
      priority: "minor" as const,
      evidence: "Hypothesis",
      risk: "May happen",
      test: "Observe",
      citations: [],
    },
    {
      title: "Main",
      priority: "critical" as const,
      evidence: "Hypothesis",
      risk: "May happen",
      test: "Observe",
      counterEvidence: "They already solve it easily",
      citations: [],
    },
  ];
  const concerns = groundConcerns(items, []);
  assert.equal(concerns[0].title, "Main");
  assert.equal(concerns[0].basis, "hypothesis");
  assert.equal(concerns[0].counterEvidence, "They already solve it easily");
  assert.deepEqual(
    linkPlans(
      [{ findingIds: ["C1", "invented"], title: "Narrow it" }],
      concerns,
    )[0].findingIds,
    ["C1"],
  );
});
test("a specific next step survives score calculation without raising unsupported scores", () => {
  const sources: EvidenceSource[] = [
    {
      id: "B1",
      kind: "brief",
      label: "Brief",
      text: "Mothers spend time coordinating school pickups.",
    },
  ];
  const score = scoreReadiness(
    [
      {
        id: "problem",
        rating: 4,
        reason: "Clear",
        nextStep: "Describe a recent missed pickup.",
        citations: [],
      },
    ],
    sources,
  );
  assert.equal(score.dimensions[0].rating, 0);
  assert.equal(
    score.dimensions[0].nextStep,
    "Describe a recent missed pickup.",
  );
});
test("batched perspectives and recovery retain the previous maximum token envelope", () => {
  assert.equal(USAGE_LIMITS.modelCalls, 12);
  assert.ok(USAGE_LIMITS.modelCalls * USAGE_LIMITS.inputTokens <= 9 * 32000);
  assert.ok(USAGE_LIMITS.modelCalls * USAGE_LIMITS.outputTokens <= 9 * 6500);
  assert.ok(USAGE_LIMITS.daily <= USAGE_LIMITS.monthly);
  assert.equal(USAGE_LIMITS.monthly, 20);
});

import { needsClarification } from "../lib/intake.ts";
test("optional implementation questions do not block an otherwise clear review", () => {
  assert.equal(
    needsClarification({
      missingEssentials: [],
      clarifyingQuestions: ["Which tools?", "How will deposits work?"],
    }),
    false,
  );
  assert.equal(
    needsClarification({
      missingEssentials: ["workflow"],
      clarifyingQuestions: ["What action would a person take?"],
    }),
    true,
  );
});

import { createModelBudget } from "../lib/model-budget.ts";
import { ModelError } from "../lib/model-error.ts";
test("a transient 503 gets only one shared retry across parallel calls", async () => {
  const run = createModelBudget(12, 0);
  let attempts = 0;
  const outcome = await Promise.allSettled(
    [0, 1, 2].map(() =>
      run(async () => {
        attempts++;
        throw new ModelError("provider_unavailable", 503);
      }),
    ),
  );
  assert.equal(attempts, 4);
  assert.ok(outcome.every((r) => r.status === "rejected"));
});
test("retry succeeds within the same hard attempt budget and does not retry quota errors", async () => {
  const run = createModelBudget(2, 0);
  let calls = 0;
  assert.equal(
    await run(async () => {
      calls++;
      if (calls === 1) throw new ModelError("provider_unavailable", 503);
      return "ok";
    }),
    "ok",
  );
  await assert.rejects(
    run(async () => "no"),
    /model_budget/,
  );
  const quota = createModelBudget(12, 0);
  let quotaCalls = 0;
  await assert.rejects(
    quota(async () => {
      quotaCalls++;
      throw new ModelError("provider_quota", 429);
    }),
    /provider_quota/,
  );
  assert.equal(quotaCalls, 1);
});
test("cancellation during backoff prevents a retry", async () => {
  const run = createModelBudget(12, 100),
    controller = new AbortController();
  let calls = 0;
  const result = run(
    async () => {
      calls++;
      throw new ModelError("provider_unavailable", 503);
    },
    controller.signal,
    () => controller.abort(),
  );
  await assert.rejects(result, /review_cancelled/);
  assert.equal(calls, 1);
});
