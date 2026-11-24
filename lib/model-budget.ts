import { ModelError } from "./model-error.ts";
// One retry shared by the entire review. Count every attempt before it runs.
export function createModelBudget(
  maxCalls: number,
  delayMs = 2000,
  usedCalls = 0,
) {
  let calls = usedCalls,
    retryUsed = false;
  async function run<T>(
    call: () => Promise<T>,
    signal?: AbortSignal,
    onRetry?: () => void,
  ): Promise<T> {
    const attempt = () => {
      if (signal?.aborted) throw new ModelError("review_cancelled");
      if (calls >= maxCalls) throw new ModelError("model_budget");
      calls++;
      return call();
    };
    try {
      return await attempt();
    } catch (error) {
      if (
        !(error instanceof ModelError) ||
        error.status !== 503 ||
        (error.retryAt || 0) > Date.now() + delayMs ||
        retryUsed ||
        calls >= maxCalls ||
        signal?.aborted
      )
        throw error;
      retryUsed = true;
      onRetry?.();
      await new Promise<void>((resolve, reject) => {
        const stop = () => {
          clearTimeout(timer);
          reject(new ModelError("review_cancelled"));
        };
        const timer = setTimeout(() => {
          signal?.removeEventListener("abort", stop);
          resolve();
        }, delayMs);
        signal?.addEventListener("abort", stop, { once: true });
        if (signal?.aborted) stop();
      });
      return attempt();
    }
  }
  return Object.assign(run, { callsUsed: () => calls });
}
