import test from "node:test";
import assert from "node:assert/strict";
import { scoreReadiness, READINESS_DIMENSIONS, SCORE_CHECKS, type ReadinessAssessment } from "../lib/scoring.ts";
const quote = "Students search by course and request a short loan.";
const sources = [{ id: "B1", kind: "brief" as const, label: "Brief", text: quote }];
const entries = (): ReadinessAssessment => READINESS_DIMENSIONS.map(id => ({
  id, rating: 4, reason: "Criterion assessment supplied by the model", nextStep: "Test the assumption.", citations: [],
  checks: SCORE_CHECKS[id].map(id => ({ id, met: true, citation: { sourceId: "B1", quote, location: "" } }))
}));
test("all 16 accepted checks total 100; empty or unsupported assessments score zero", () => {
  assert.equal(scoreReadiness(entries(), sources).total, 100);
  assert.equal(scoreReadiness(entries(), []).total, 0);
  assert.equal(scoreReadiness([], sources).total, 0);
});
test("a small number of supported checks can score far below 60", () => {
  const input = entries();
  input.forEach(d => d.checks!.forEach(c => c.met = false));
  input[0].checks![0].met = true;
  assert.equal(scoreReadiness(input, sources).total, 6);
  input[0].checks![1].met = true;
  assert.equal(scoreReadiness(input, sources).total, 13);
});
test("raw ratings, missing checks, fabricated quotes and file interpretation earn no points", () => {
  const input = entries();
  input[0].checks = undefined;
  input[1].checks!.forEach(c => c.citation.quote = "Invented customer validation not present in the brief");
  input[2].checks!.forEach(c => c.citation.sourceId = "F1");
  input[3].checks!.forEach(c => c.met = false);
  assert.equal(scoreReadiness(input, [...sources, { id: "F1", kind: "attachment", label: "File", text: quote }]).total, 0);
});
test("duplicate dimensions, duplicate criteria and wrong-dimension criteria cannot inflate scores", () => {
  const input = entries();
  input.push({...input[0]});
  input[1].checks!.push({...input[1].checks![0]});
  input[2].checks![0].id = "situation";
  const score = scoreReadiness(input, sources);
  assert.deepEqual(score.dimensions.map(d => d.rating), [0, 3, 3, 4]);
  assert.equal(score.total, 63);
});
test("model rejection remains rejected even with a quote match", () => {
  const input = entries();
  input.forEach(d => d.checks!.forEach(c => c.met = false));
  const result = scoreReadiness(input, sources);
  assert.equal(result.total, 0);
  assert.equal(result.version, 2);
  assert.equal(result.dimensions[0].nextStep, "Test the assumption.");
});
