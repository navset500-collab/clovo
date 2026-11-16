import { checkCitations } from "./evidence.ts";
import type { Citation, EvidenceSource } from "./types.ts";
export const READINESS_DIMENSIONS = [
  "problem",
  "audience",
  "value",
  "testability",
] as const;
export type ReadinessDimension = (typeof READINESS_DIMENSIONS)[number];
export type ReadinessAssessment = {
  id: ReadinessDimension;
  rating: number;
  reason: string;
  citations: Citation[];
}[];
export type Readiness = {
  total: number;
  dimensions: {
    id: ReadinessDimension;
    rating: number;
    points: number;
    reason: string;
    citations: Citation[];
  }[];
};
export function scoreReadiness(
  items: {
    id: ReadinessDimension;
    rating: number;
    reason: string;
    citations: { sourceId: string; quote: string; location: string }[];
  }[],
  sources: EvidenceSource[],
): Readiness {
  const dimensions = READINESS_DIMENSIONS.map((id) => {
    const item = items.find((x) => x.id === id);
    const citations = checkCitations(item?.citations || [], sources).filter(
      (c) => c.verification === "text-match",
    );
    const rating = Math.min(
      citations.length ? 4 : 1,
      Math.max(0, Math.round(item?.rating || 0)),
    );
    return {
      id,
      rating,
      points: rating * 6.25,
      reason: item?.reason || "Not assessed in this review.",
      citations,
    };
  });
  return {
    total: Math.round(dimensions.reduce((sum, d) => sum + d.points, 0)),
    dimensions,
  };
}
