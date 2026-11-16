import type { Review, HumanResponse } from "./types";
export function reportMarkdown(
  review: Review,
  responses: HumanResponse[] = [],
) {
  const r = review.report;
  const score = r.readiness
    ? `## Readiness to test: ${r.readiness.total}/100\nA rubric assessment, not a prediction of demand or success.\n${r.readiness.dimensions.map((d) => `- ${d.id}: ${d.points}/25 — ${d.reason}\n${d.citations.map((c) => `  [${c.sourceId}] ${c.quote}`).join("\n")}`).join("\n")}\n\n`
    : "";
  const research = `## Research findings\n${r.market.signals.map((s) => `### ${s.title}\n${s.detail}\n${s.relevance || ""}\nEvidence type: ${s.evidenceType || "source"}\n${(s.citations || []).map((c) => `[${c.sourceId}] ${c.quote}`).join("\n")}`).join("\n\n")}\n\n## Competing alternatives\n${r.market.alternatives.map((a) => `- ${a.name}: ${a.difference}\n${(a.citations || []).map((c) => `[${c.sourceId}] ${c.quote}`).join("\n")}`).join("\n")}\n\n`;

  return `# ${review.input.name} — Clovo\n\n${r.mode === "example" ? "ILLUSTRATIVE EXAMPLE" : "AI-assisted product review"}\n\n${r.summary}\n\n${score}## Product\n${r.brief.product}\n\n## Demand\n${r.market.summary}\n${r.market.searchNotice}\n\n${research}${r.market.sources.map((s) => `- [${s.id}: ${s.title}](${s.url})`).join("\n")}\n\n## Simulated testers (not real people)\n${r.personas.map((p) => `### ${p.name} — ${p.role}\n${p.reaction}\nFriction: ${p.friction}\nCondition: ${p.condition}`).join("\n\n")}\n\n## Concerns\n${r.critique.map((c) => `### ${c.title}\n${c.evidence}\n${c.risk}\nTest: ${c.test}\nBasis: ${c.basis}\n${(c.citations || []).map((x) => `[${x.sourceId}] ${x.quote} — ${x.location} (${x.verification})`).join("\n")}`).join("\n\n")}\n\n## Next version\n${r.improvements.map((i, n) => `### ${n + 1}. ${i.title}\n${i.change}\nWhy: ${i.why}\nCheck: ${i.check}`).join("\n\n")}\n\n## Human test\n${r.experiment.task}\n${r.experiment.questions.map((q) => `- ${q}`).join("\n")}\nObserve: ${r.experiment.successSignal}\n\n## Actual submitted responses\n${responses.length} responses. Anonymous, self-selected; identities are not verified.\n${responses.map((x, i) => `### Response ${i + 1}\nWould use: ${x.use}\nProblem frequency: ${x.frequency}\nCurrent approach: ${x.problem}\nFeedback: ${x.feedback}\n${x.answers.join("\n")}`).join("\n\n")}\n\n## Original source trail\n${(r.evidenceSources || []).map((s) => `### ${s.id}: ${s.label}\n${s.text}`).join("\n\n")}\n\nAI simulations and stated intentions do not establish measured demand.\n`;
}
