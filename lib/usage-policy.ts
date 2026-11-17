// Public limits; credentials and counters live only on the server.
export const USAGE_LIMITS = {
  daily: 5,
  monthly: 20,
  perNetworkDaily: 3,
  perNetworkCompletedDaily: 2,
  concurrent: 2,
  modelCalls: 9,
  inputTokens: 32000,
  outputTokens: 6500,
} as const;
export type QuotaPolicy = {
  daily: number;
  monthly: number;
  perNetworkDaily: number;
  perNetworkCompletedDaily?: number;
  concurrent?: number;
  perResource?: number;
};
export type UsageState = {
  version: 1;
  total: number;
  day: string;
  daily: number;
  networks: Record<string, number>;
  completedNetworks?: Record<string, number>;
  resources: Record<string, number>;
  active: { id: string; network: string; expires: number }[];
};
export class UsageError extends Error {
  status: number;
  retryAfter: number;
  code: string;
  resetAt?: string;
  constructor(
    message: string,
    status = 429,
    retryAfter = 3600,
    code = "quota_unavailable",
    resetAt?: string,
  ) {
    super(message);
    this.status = status;
    this.retryAfter = retryAfter;
    this.code = code;
    this.resetAt = resetAt;
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
    next.completedNetworks = {};
  }
  const tomorrow = new Date(day + "T00:00:00.000Z").getTime() + 86400000;
  const month = new Date(now);
  const nextMonth = Date.UTC(
    month.getUTCFullYear(),
    month.getUTCMonth() + 1,
    1,
  );
  next.active = next.active.filter((a) => a.expires > now);
  if (next.total >= policy.monthly)
    throw new UsageError(
      "Clovo has reached its monthly allowance. New requests resume next month (UTC). Saved reports, export and the walkthrough still work.",
      429,
      Math.ceil((nextMonth - now) / 1000),
      "global_monthly",
      new Date(nextMonth).toISOString(),
    );
  if (next.daily >= policy.daily)
    throw new UsageError(
      "Clovo has reached its daily allowance. New requests resume at midnight UTC. Your draft is still available.",
      429,
      Math.ceil((tomorrow - now) / 1000),
      "global_daily",
      new Date(tomorrow).toISOString(),
    );
  if (
    policy.perNetworkCompletedDaily &&
    (next.completedNetworks?.[network] || 0) >= policy.perNetworkCompletedDaily
  )
    throw new UsageError(
      "This network has completed its daily reviews.",
      429,
      Math.ceil((tomorrow - now) / 1000),
      "network_completed",
      new Date(tomorrow).toISOString(),
    );
  if ((next.networks[network] || 0) >= policy.perNetworkDaily)
    throw new UsageError(
      "This network has reached its daily allowance. Please return after midnight UTC. Shared Wi-Fi uses the same allowance.",
      429,
      Math.ceil((tomorrow - now) / 1000),
      "network_daily",
      new Date(tomorrow).toISOString(),
    );
  if (
    resource &&
    policy.perResource &&
    (next.resources[resource] || 0) >= policy.perResource
  )
    throw new UsageError(
      "This feedback study has reached its response limit.",
      429,
      3600,
      "study_limit",
    );
  if (
    policy.concurrent &&
    (next.active.length >= policy.concurrent ||
      next.active.some((a) => a.network === network))
  )
    throw new UsageError(
      "The team is already working. Please wait for the current review to finish.",
      429,
      30,
      "team_busy",
    );
  next.total++;
  next.daily++;
  next.networks[network] = (next.networks[network] || 0) + 1;
  if (resource) next.resources[resource] = (next.resources[resource] || 0) + 1;
  if (policy.concurrent)
    next.active.push({ id, network, expires: now + 200000 });
  return next;
}

// Only a complete report counts toward the completed-review allowance. Starts
// always remain charged to the hard cost budget, even after failure/clarification.
export function settleUsage(
  state: UsageState,
  id: string,
  day: string,
  completed: boolean,
): UsageState {
  const next = structuredClone(state);
  const active = next.active.find((a) => a.id === id);
  if (active && completed && next.day === day) {
    next.completedNetworks ||= {};
    next.completedNetworks[active.network] =
      (next.completedNetworks[active.network] || 0) + 1;
  }
  next.active = next.active.filter((a) => a.id !== id);
  return next;
}

export function allowanceSnapshot(
  state: UsageState | null,
  network: string,
  now: number,
) {
  const day = new Date(now).toISOString().slice(0, 10);
  const sameDay = state?.day === day;
  const starts = sameDay ? state.networks[network] || 0 : 0;
  const completed = sameDay ? state.completedNetworks?.[network] || 0 : 0;
  let code = "";
  const monthlyRemaining = Math.max(
    0,
    USAGE_LIMITS.monthly - (state?.total || 0),
  );
  const dailyRemaining = Math.max(
    0,
    USAGE_LIMITS.daily - (sameDay ? state.daily : 0),
  );
  const networkRemaining = Math.max(0, USAGE_LIMITS.perNetworkDaily - starts);
  const reviewsRemaining = Math.max(
    0,
    USAGE_LIMITS.perNetworkCompletedDaily - completed,
  );
  if (!monthlyRemaining) code = "global_monthly";
  else if (!dailyRemaining) code = "global_daily";
  else if (!reviewsRemaining) code = "network_completed";
  else if (!networkRemaining) code = "network_daily";
  const date = new Date(now);
  const resetAt =
    code === "global_monthly"
      ? Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1)
      : Date.parse(day + "T00:00:00.000Z") + 86400000;
  return {
    code,
    monthlyRemaining,
    dailyRemaining,
    networkRemaining,
    reviewsRemaining,
    resetAt: new Date(resetAt).toISOString(),
  };
}
