/**
 * Stage04/R21: one hard wall-clock limit for a provider's entire request,
 * including response-body decoding. One batch is shared by every theme.
 * Never retry here and never switch a theme to another provider.
 */
export const THEME_PROVIDER_MAX_MS = 20_000;

export class ProviderDeadlineError extends Error {
  constructor(code) {
    super(code);
    this.name = 'ProviderDeadlineError';
    this.code = code;
  }
}

export async function fetchProviderBatchWithinDeadline(url, {
  fetchFn = fetch,
  timeoutMs = THEME_PROVIDER_MAX_MS,
  headers = { accept: 'application/json' },
  readResponse = (response) => response.json(),
  now = () => performance.now(),
} = {}) {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0 || timeoutMs > THEME_PROVIDER_MAX_MS) {
    throw new ProviderDeadlineError('INVALID_PROVIDER_DEADLINE');
  }
  const controller = new AbortController();
  const startedAt = now();
  let timerId;
  const deadline = new Promise((_, reject) => {
    timerId = setTimeout(() => {
      controller.abort();
      reject(new ProviderDeadlineError('PROVIDER_QUERY_DEADLINE_EXCEEDED'));
    }, timeoutMs);
  });

  try {
    const requestAndBody = (async () => {
      const response = await fetchFn(url, { signal: controller.signal, headers, redirect: 'follow' });
      if (!response?.ok) throw new ProviderDeadlineError(`PROVIDER_HTTP_${response?.status ?? 'UNAVAILABLE'}`);
      if (new URL(response.url ?? url).origin !== new URL(url).origin) {
        throw new ProviderDeadlineError('PROVIDER_REDIRECT_ORIGIN_CHANGED');
      }
      return readResponse(response);
    })();
    const data = await Promise.race([requestAndBody, deadline]);
    return { data, durationMs: Math.max(0, now() - startedAt),
      deadlineMs: timeoutMs, requests: 1 };
  } finally {
    clearTimeout(timerId);
    // Closing an in-flight response is best effort; late fetch completion
    // cannot resurrect a timed-out provider as a usable source.
    controller.abort();
  }
}

/** An unavailable provider supplies no Stage04 measurement in this run. */
export function rejectProviderForThemes(themes, code, durationMs, providerId) {
  if (!Array.isArray(themes) || !themes.every((name) => typeof name === 'string' && name.trim())) {
    throw new ProviderDeadlineError('INVALID_THEME_UNIVERSE');
  }
  return {
    providerId,
    state: 'PROVIDER_NOT_PROVIDING_DATA',
    failureCode: code,
    durationMs,
    deadlineMs: THEME_PROVIDER_MAX_MS,
    providerRequestCount: 1,
    retryCount: 0,
    providerSwitchCount: 0,
    themes: themes.map((theme) => ({ theme, state: 'SOURCE_NOT_PROVIDING_DATA',
      G1: null, G2: null, G: null, D: null, M: null })),
  };
}
