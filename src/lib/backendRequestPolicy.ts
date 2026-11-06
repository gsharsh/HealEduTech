/// <reference lib="dom" />

export const backendRequestTimeoutMs = 15_000;

/** Bound waiting time, including response-body reads, while preserving cancellation.
 * This is client resilience; database/edge controls enforce abuse limits.
 */
export function createBackendFetch(fetcher: typeof fetch, timeoutMs = backendRequestTimeoutMs): typeof fetch {
  return (input, init) => {
    const callerSignal = init?.signal ?? (input instanceof Request ? input.signal : undefined);
    const timeout = AbortSignal.timeout(timeoutMs);
    const signal = callerSignal ? AbortSignal.any([callerSignal, timeout]) : timeout;
    return fetcher(input, { ...init, signal });
  };
}
