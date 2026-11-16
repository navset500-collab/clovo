// Public limits; credentials and counters live only on the server.
export const USAGE_LIMITS = {
  daily: 5,
  monthly: 20,
  perNetworkDaily: 2,
  concurrent: 2,
  modelCalls: 9,
  inputTokens: 32000,
  outputTokens: 6500,
} as const;
export type QuotaPolicy = {
  daily: number;
  monthly: number;
  perNetworkDaily: number;
  concurrent?: number;
  perResource?: number;
};
export type UsageState = {
  version: 1;
  total: number;
  day: string;
  daily: number;
  networks: Record<string, number>;
  resources: Record<string, number>;
  active: { id: string; network: string; expires: number }[];
};
export class UsageError extends Error {
  status: number;
  retryAfter: number;
  constructor(message: string, status = 429, retryAfter = 3600) {
    super(message);
    this.status = status;
    this.retryAfter = retryAfter;
  }
}
export function reserveUsage(
  state: UsageState | null,
  policy: QuotaPolicy,
  network: string,
  id: string,
  now: number,
  resource?: string,
): UsageState {
  const day = new Date(now).toISOString().slice(0, 10);
  const next: UsageState = state
    ? structuredClone(state)
    : {
        version: 1,
        total: 0,
        day,
        daily: 0,
        networks: {},
        resources: {},
        active: [],
      };
  if (next.day !== day) {
    next.day = day;
    next.daily = 0;
    next.networks = {};
  }
  next.active = next.active.filter((a) => a.expires > now);
  if (next.total >= policy.monthly)
    throw new UsageError(
      "Clovo has reached its monthly allowance. New requests resume next month (UTC). Saved reports, export and the walkthrough still work.",
    );
  if (next.daily >= policy.daily)
    throw new UsageError(
      "Clovo has reached its daily allowance. New requests resume at midnight UTC. Your draft is still available.",
    );
  if ((next.networks[network] || 0) >= policy.perNetworkDaily)
    throw new UsageError(
      "This network has reached its daily allowance. Please return after midnight UTC. Shared Wi-Fi uses the same allowance.",
    );
  if (
    resource &&
    policy.perResource &&
    (next.resources[resource] || 0) >= policy.perResource
  )
    throw new UsageError("This feedback study has reached its response limit.");
  if (
    policy.concurrent &&
    (next.active.length >= policy.concurrent ||
      next.active.some((a) => a.network === network))
  )
    throw new UsageError(
      "The team is already working. Please wait for the current review to finish.",
      429,
      30,
    );
  next.total++;
  next.daily++;
  next.networks[network] = (next.networks[network] || 0) + 1;
  if (resource) next.resources[resource] = (next.resources[resource] || 0) + 1;
  if (policy.concurrent)
    next.active.push({ id, network, expires: now + 200000 });
  return next;
}
