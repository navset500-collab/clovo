import test from "node:test";
import assert from "node:assert/strict";
import {
  inputSchema,
  responseSchema,
  studySchema,
  safeUrl,
  validSourceIds,
} from "../lib/validation.ts";
import { newKey, hashKey, owns, validId } from "../lib/access.ts";
const idea = {
  name: "BookLoop",
  description:
    "A student marketplace for borrowing course books locally. Students search by course, see books offered by classmates, and request a short loan before buying a copy. Owners approve requests and arrange a campus handoff. I have built the listing screen but have not tested whether students will lend their books or return them reliably.",
  audience: "College students on a budget who need books for short courses",
  task: "Would people use this?",
  stage: "idea",
  language: "en",
  url: "",
  attachments: [],
};
test("a written idea needs no attachment", () =>
  assert.equal(inputSchema.safeParse(idea).success, true));
test("rejects unsupported inline content", () =>
  assert.equal(
    inputSchema.safeParse({
      ...idea,
      attachments: [
        {
          id: "a",
          name: "x",
          kind: "image",
          data: "data:text/html;base64,PHNjcmlwdD4=",
        },
      ],
    }).success,
    false,
  ));
test("limits file count and project size", () => {
  assert.equal(
    inputSchema.safeParse({ ...idea, description: "a".repeat(18001) }).success,
    false,
  );
  assert.equal(
    inputSchema.safeParse({
      ...idea,
      attachments: Array(9).fill({
        id: "x",
        name: "x",
        kind: "pdf",
        data: "data:application/pdf;base64,JVBERg==",
      }),
    }).success,
    false,
  );
});
test("rejects executable or credential-bearing study URLs", () => {
  for (const url of [
    "javascript:alert(1)",
    "data:text/html,hello",
    "https://user:pass@example.com",
  ])
    assert.equal(safeUrl.safeParse(url).success, false);
  assert.equal(safeUrl.safeParse("https://example.com").success, true);
});
test("retains only actual source IDs and removes duplicates", () =>
  assert.deepEqual(validSourceIds(["s1", "fake", "s1", "s2"], ["s1"]), ["s1"]));
test("human response requires consent and input", () => {
  const valid = {
    use: "maybe",
    frequency: "weekly",
    problem: "I ask other students.",
    feedback: "Show whether books are available now.",
    answers: ["Example answer"],
    consent: true,
  };
  assert.equal(responseSchema.safeParse(valid).success, true);
  assert.equal(
    responseSchema.safeParse({ ...valid, consent: false }).success,
    false,
  );
  assert.equal(
    responseSchema.safeParse({ ...valid, website: "spam" }).success,
    false,
  );
});
test("owner key is distinct from public invite ID", () => {
  const invite = newKey(),
    owner = newKey(),
    hash = hashKey(owner);
  assert.ok(validId(invite));
  assert.ok(owns(owner, hash));
  assert.equal(owns(invite, hash), false);
  assert.equal(owns("", hash), false);
  assert.equal(validId("../secret"), false);
});
test("public study rejects excessive questions", () =>
  assert.equal(
    studySchema.safeParse({
      name: "x",
      description: idea.description,
      url: "",
      task: "Try it",
      language: "es",
      questions: Array(5).fill("Why?"),
    }).success,
    false,
  ));
test("accepts the browser host through Next dev and rejects foreign origins", async () => {
  const { guard } = await import("../lib/access.ts");
  assert.equal(
    guard(
      new Request("http://localhost:3000/api/analyze", {
        headers: { host: "127.0.0.1:3000", origin: "http://127.0.0.1:3000" },
      }),
      "test",
    ),
    null,
  );
  assert.equal(
    guard(
      new Request("https://clovo.test/api", {
        headers: { host: "clovo.test", origin: "https://other.test" },
      }),
      "test",
    ),
    "Invalid request origin.",
  );
});
test("evidence citations require a real source and a matching quote", async () => {
  const { makeEvidenceSources, checkCitations } =
    await import("../lib/evidence.ts");
  const input = { ...idea, stage: "idea" as const, language: "en" as const };
  const sources = makeEvidenceSources(input);
  assert.equal(
    checkCitations(
      [
        {
          sourceId: "B1",
          quote: "student marketplace for borrowing course books",
          location: "",
        },
      ],
      sources,
    ).length,
    1,
  );
  assert.equal(
    checkCitations(
      [
        {
          sourceId: "B1",
          quote: "We interviewed 200 paying customers",
          location: "",
        },
      ],
      sources,
    ).length,
    0,
  );
  assert.equal(
    checkCitations(
      [{ sourceId: "fake", quote: idea.description, location: "" }],
      sources,
    ).length,
    0,
  );
});
test("unmatched claims become hypotheses, not supported findings", async () => {
  const { groundConcerns, linkPlans } = await import("../lib/evidence.ts");
  const concerns = groundConcerns(
    [
      {
        title: "Test",
        evidence: "Untested claim",
        risk: "Might fail",
        test: "Ask people",
        citations: [{ sourceId: "fake", quote: "not supported", location: "" }],
      },
    ],
    [],
  );
  assert.equal(concerns[0].basis, "hypothesis");
  assert.equal(concerns[0].citations.length, 0);
  assert.deepEqual(
    linkPlans([{ findingIds: ["C1", "fake"], title: "x" }], concerns)[0]
      .findingIds,
    ["C1"],
  );
  assert.equal(linkPlans([{ findingIds: ["fake"] }], concerns).length, 0);
});
test("long input is preserved across evidence chunks", async () => {
  const { makeEvidenceSources } = await import("../lib/evidence.ts");
  const sources = makeEvidenceSources({
    ...idea,
    description: "x".repeat(18000),
    stage: "idea",
    language: "en",
  });
  assert.equal(
    sources
      .filter((s) => s.kind === "brief")
      .map((s) => s.text)
      .join("").length,
    18000,
  );
});

test("requires 50 actual words and a specific audience", async () => {
  const { wordCount } = await import("../lib/intake.ts");
  assert.equal(wordCount("¡Hola! Madres con niños — después de clase."), 7);
  assert.equal(
    inputSchema.safeParse({
      ...idea,
      description: Array(49).fill("word").join(" "),
    }).success,
    false,
  );
  assert.equal(
    inputSchema.safeParse({
      ...idea,
      description: Array(50).fill("word").join(" "),
    }).success,
    true,
  );
  assert.equal(
    inputSchema.safeParse({ ...idea, audience: "moms" }).success,
    false,
  );
  assert.equal(
    inputSchema.safeParse({ ...idea, description: "! ".repeat(60) }).success,
    false,
  );
});
test("readiness scores are calculated, capped and require source support", async () => {
  const { scoreReadiness, READINESS_DIMENSIONS } =
    await import("../lib/scoring.ts");
  const sources = [
    {
      id: "B1",
      kind: "brief" as const,
      label: "Brief",
      text: "Students search by course and request a short loan.",
    },
  ];
  const entries = READINESS_DIMENSIONS.map((id) => ({
    id,
    rating: 4,
    reason: "Specific",
    citations: [
      { sourceId: "B1", quote: "Students search by course", location: "" },
    ],
  }));
  assert.equal(scoreReadiness(entries, sources).total, 100);
  assert.equal(scoreReadiness(entries, []).total, 25);
  assert.equal(scoreReadiness([], sources).total, 0);
});
test("research claims need a matching retrieved excerpt", async () => {
  const { matchResearchCitations, sourceFromResult, safeResearchQuery } =
    await import("../lib/research.ts");
  const source = sourceFromResult(
    {
      url: "https://example.com",
      title: "Example",
      content:
        "Parents can coordinate weekly school pickup schedules with invited families.",
    },
    0,
  )!;
  assert.equal(
    matchResearchCitations(
      [{ sourceId: "s1", quote: "coordinate weekly school pickup schedules" }],
      [source],
    ).length,
    1,
  );
  assert.equal(
    matchResearchCitations(
      [{ sourceId: "s1", quote: "used by two million paying parents" }],
      [source],
    ).length,
    0,
  );
  assert.equal(
    sourceFromResult(
      { url: "javascript:alert(1)", content: "x".repeat(60) },
      0,
    ),
    null,
  );
  assert.equal(
    safeResearchQuery(
      "SecretCo school pickup x@example.com https://private.example.com",
      "SecretCo",
    ),
    "school pickup",
  );
});

test("fictional parent profiles stay inside the explicit audience", async () => {
  const { alignFictionalProfiles, contradictsAudience } =
    await import("../lib/personas.ts");
  const profiles = alignFictionalProfiles(
    [
      {
        name: "Marcus",
        role: "Single father",
        situation: "A father organizing rides",
        focus: "switching tools",
      },
    ],
    "Working mothers of children with no nearby family support",
  );
  assert.equal(profiles[0].name, "Nina");
  assert.equal(
    contradictsAudience(
      "Working mothers",
      profiles[0].role + " " + profiles[0].situation,
    ),
    false,
  );
  assert.equal(contradictsAudience("Working mothers", "Single father"), true);
  assert.equal(
    contradictsAudience("Mothers and fathers", "Single father"),
    false,
  );
});

import { reserveUsage, USAGE_LIMITS, UsageError } from "../lib/usage-policy.ts";
import { limitedJson, sameSecret } from "../lib/access.ts";
const now = Date.UTC(2026, 10, 15, 20);
test("shared quotas stop parallel networks and persist across new request objects", () => {
  const policy = { daily: 5, monthly: 20, perNetworkDaily: 2, concurrent: 2 };
  let s = reserveUsage(null, policy, "a", "run1", now);
  assert.throws(() => reserveUsage(s, policy, "a", "run2", now), UsageError);
  s = reserveUsage(s, policy, "b", "run3", now);
  assert.throws(() => reserveUsage(s, policy, "c", "run4", now), UsageError);
  s.active = [];
  s = reserveUsage(s, policy, "a", "run5", now);
  s.active = [];
  assert.throws(() => reserveUsage(s, policy, "a", "run6", now), /network/);
});
test("global daily and monthly caps cannot be bypassed by new IPs or day rollover", () => {
  const policy = { ...USAGE_LIMITS, daily: 5 };
  let s = null;
  for (let i = 0; i < 5; i++) {
    s = reserveUsage(
      s,
      { ...policy, concurrent: undefined },
      String(i),
      String(i),
      now,
    );
  }
  assert.throws(() => reserveUsage(s, policy, "new", "new", now), /daily/);
  s!.total = 20;
  assert.throws(
    () => reserveUsage(s, policy, "new", "new", now + 86400000),
    /monthly/,
  );
});
test("expired leases release capacity without refunding starts", () => {
  const s = reserveUsage(null, USAGE_LIMITS, "a", "1", now);
  const next = reserveUsage(s, USAGE_LIMITS, "a", "2", now + 200001);
  assert.equal(next.total, 2);
  assert.equal(next.active.length, 1);
});
test("per-study response cap is shared across participants", () => {
  const p = { daily: 200, monthly: 1000, perNetworkDaily: 10, perResource: 2 };
  const s = reserveUsage(
    reserveUsage(null, p, "a", "1", now, "study"),
    p,
    "b",
    "2",
    now,
    "study",
  );
  assert.throws(
    () => reserveUsage(s, p, "c", "3", now, "study"),
    /response limit/,
  );
});
test("streamed request size is counted in bytes without content-length", async () => {
  const req = new Request("https://clovo.test/api", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text: "é".repeat(30) }),
  });
  await assert.rejects(limitedJson(req, 50), /too large/);
  await assert.rejects(
    limitedJson(
      new Request("https://clovo.test/api", { method: "POST", body: "{}" }),
    ),
    /application\/json/,
  );
});
test("access code comparisons accept only the exact configured code", () => {
  assert.equal(sameSecret("abc", "abc"), true);
  assert.equal(sameSecret("abcd", "abc"), false);
});
