import {
  createHmac,
  createHash,
  timingSafeEqual,
  randomUUID,
} from "node:crypto";
import type { AgentId, AgentTrace, ProjectInput } from "./types.ts";
import { ModelError } from "./model-error.ts";
import { USAGE_LIMITS } from "./usage-policy.ts";

export type Recovery = {
  version: 1;
  id: string;
  reviewId: string;
  visitor: string;
  inputHash: string;
  expiresAt: number;
  calls: number;
  stages: Partial<Record<AgentId, unknown>>;
  traces: Partial<Record<AgentId, AgentTrace>>;
};
function fingerprint(input: ProjectInput) {
  // Explicit fields exclude access codes and the recovery token itself.
  return createHash("sha256")
    .update(
      JSON.stringify({
        name: input.name,
        description: input.description,
        audience: input.audience,
        task: input.task,
        url: input.url,
        stage: input.stage,
        language: input.language,
        attachments: input.attachments,
      }),
    )
    .digest("hex");
}
const sign = (payload: string, secret: string) =>
  createHmac("sha256", secret)
    .update(`clovo-recovery-v1:${payload}`)
    .digest("hex");
export function sealRecovery(
  state: Pick<Recovery, "reviewId" | "calls" | "stages" | "traces">,
  input: ProjectInput,
  visitor: string,
  secret: string,
  now = Date.now(),
) {
  const remainingCalls = (
    ["mira", "sora", "juno", "rook", "leo", "vera"] as AgentId[]
  ).reduce(
    (total, id) =>
      total +
      (state.stages[id] && state.traces[id] ? 0 : id === "juno" ? 2 : 1),
    0,
  );
  if (
    !Object.keys(state.stages).length ||
    state.calls + remainingCalls > USAGE_LIMITS.modelCalls
  )
    return null;
  const date = new Date(now);
  // Single-use markers share the monthly ledger. Expire before its rollover.
  const expiresAt = Math.min(
    now + 30 * 60000,
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1),
  );
  const record: Recovery = {
    ...state,
    version: 1,
    id: randomUUID(),
    visitor,
    inputHash: fingerprint(input),
    expiresAt,
  };
  const payload = Buffer.from(JSON.stringify(record)).toString("base64url");
  if (payload.length > 590000) return null;
  return {
    token: `${payload}.${sign(payload, secret)}`,
    expiresAt: new Date(expiresAt).toISOString(),
    completed: Object.keys(state.stages) as AgentId[],
  };
}
export function openRecovery(
  token: string,
  input: ProjectInput,
  visitor: string,
  secret: string,
  now = Date.now(),
): Recovery {
  const invalid = () => new ModelError("recovery_invalid");
  if (token.length > 600000) throw invalid();
  const parts = token.split(".");
  if (parts.length !== 2 || !/^[a-f0-9]{64}$/.test(parts[1])) throw invalid();
  if (
    !timingSafeEqual(Buffer.from(parts[1]), Buffer.from(sign(parts[0], secret)))
  )
    throw invalid();
  let state: Recovery;
  try {
    state = JSON.parse(Buffer.from(parts[0], "base64url").toString());
  } catch {
    throw invalid();
  }
  if (
    state.version !== 1 ||
    state.visitor !== visitor ||
    state.inputHash !== fingerprint(input) ||
    !Number.isFinite(state.expiresAt) ||
    state.expiresAt <= now ||
    !Number.isInteger(state.calls) ||
    state.calls < 0 ||
    state.calls >= USAGE_LIMITS.modelCalls ||
    !/^[a-f0-9-]{36}$/.test(state.id) ||
    !state.stages ||
    !state.traces
  )
    throw invalid();
  return state;
}
