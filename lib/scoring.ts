import { checkCitations } from "./evidence.ts";
import type { Citation, EvidenceSource } from "./types.ts";
export const READINESS_DIMENSIONS = [
  "problem",
  "audience",
  "value",
  "testability",
] as const;
export type ReadinessDimension = (typeof READINESS_DIMENSIONS)[number];
export const SCORE_CHECKS = {
  problem: ["situation", "pain", "workaround", "consequence"],
  audience: ["group", "context", "constraint", "reach"],
  value: ["workflow", "alternative", "advantage", "scope"],
  testability: ["hypothesis", "test", "signal", "rethink"],
} as const;
export const CHECK_LABELS: Record<string, [string, string]> = {
  situation: ["A specific situation", "Una situación concreta"],
  pain: ["A concrete problem", "Un problema concreto"],
  workaround: ["What people do today", "Qué hacen hoy"],
  consequence: ["Why the problem matters", "Por qué importa"],
  group: ["A specific user group", "Un grupo específico"],
  context: ["When the need occurs", "Cuándo surge la necesidad"],
  constraint: ["A relevant constraint", "Una limitación relevante"],
  reach: ["A way to reach users", "Una forma de llegar al público"],
  workflow: ["A usable workflow", "Un proceso de uso"],
  alternative: ["An existing alternative", "Una alternativa actual"],
  advantage: ["A concrete reason to switch", "Un motivo concreto para cambiar"],
  scope: ["A feasible first version", "Una primera versión viable"],
  hypothesis: ["A falsifiable assumption", "Una hipótesis comprobable"],
  test: ["A small practical test", "Una prueba pequeña"],
  signal: ["An observable result", "Un resultado observable"],
  rethink: ["A reason to reconsider", "Un motivo para reconsiderar"],
};
type InputCitation = { sourceId: string; quote: string; location: string };
export type ReadinessAssessment = {
  id: ReadinessDimension;
  rating: number;
  reason: string;
  nextStep?: string;
  citations: InputCitation[];
  checks?: { id: string; met: boolean; citation: InputCitation }[];
}[];
export type Readiness = {
  version?: 2;
  total: number;
  dimensions: {
    id: ReadinessDimension;
    rating: number;
    points: number;
    reason: string;
    nextStep?: string;
    citations: Citation[];
    checks?: { id: string; met: boolean; citations: Citation[] }[];
  }[];
};
export function scoreReadiness(
  items: ReadinessAssessment,
  sources: EvidenceSource[],
): Readiness {
  const dimensions = READINESS_DIMENSIONS.map((id) => {
    // Duplicated dimensions/check IDs cannot inflate a score.
    const matches = items.filter((x) => x.id === id),
      item = matches.length === 1 ? matches[0] : undefined;
    const checks = SCORE_CHECKS[id].map((checkId) => {
      const matches = item?.checks?.filter((c) => c.id === checkId) || [];
      const check = matches.length === 1 ? matches[0] : undefined;
      const citations = check?.met
        ? checkCitations([check.citation], sources).filter(
            (c) => c.verification === "text-match",
          )
        : [];
      return {
        id: checkId,
        met: Boolean(check?.met && citations.length),
        citations,
      };
    });
    const rating = checks.filter((c) => c.met).length;
    return {
      id,
      rating,
      points: rating * 6.25,
      reason: item?.reason || "Not assessed in this review.",
      nextStep: item?.nextStep,
      citations: checks.flatMap((c) => c.citations),
      checks,
    };
  });
  return {
    version: 2,
    total: Math.round(dimensions.reduce((sum, d) => sum + d.points, 0)),
    dimensions,
  };
}
