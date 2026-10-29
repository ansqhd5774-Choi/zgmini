import test from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { fetchProviderBatchWithinDeadline,
  THEME_PROVIDER_MAX_MS } from './provider-deadline-r21-readonly.mjs';

test('R21 caps request + body at 20 seconds, never allows longer configuration', async () => {
  assert.equal(THEME_PROVIDER_MAX_MS, 20_000);
  await assert.rejects(() => fetchProviderBatchWithinDeadline('https://example.com/industry', {
    timeoutMs: 20_001, fetchFn: () => { throw new Error('must not call'); },
  }), { code: 'INVALID_PROVIDER_DEADLINE' });
  const started = performance.now();
  await assert.rejects(() => fetchProviderBatchWithinDeadline('https://example.com/industry', {
    timeoutMs: 25, fetchFn: () => new Promise(() => {}),
  }), { code: 'PROVIDER_QUERY_DEADLINE_EXCEEDED' });
  assert.ok(performance.now() - started < 250);
});

test('R21 catches response-body hang, not just initial HTTP connection', async () => {
  await assert.rejects(() => fetchProviderBatchWithinDeadline('https://example.com/industry', {
    timeoutMs: 25,
    fetchFn: async (url) => ({ ok: true, url, json: () => new Promise(() => {}) }),
  }), { code: 'PROVIDER_QUERY_DEADLINE_EXCEEDED' });
});

test('R21 refuses a parsed response if measured elapsed time passed the deadline', async () => {
  let calls = 0;
  await assert.rejects(() => fetchProviderBatchWithinDeadline('https://example.com/industry', {
    timeoutMs: 25, now: () => calls++ === 0 ? 0 : 26,
    fetchFn: async (url) => ({ ok: true, url, json: async () => ({ observed: true }) }),
  }), { code: 'PROVIDER_QUERY_DEADLINE_EXCEEDED' });
});

test('R21 successful one-batch response reports measured latency and no source switching', async () => {
  const r = await fetchProviderBatchWithinDeadline('https://example.com/industry', {
    timeoutMs: 100,
    fetchFn: async (url) => ({ ok: true, url, json: async () => ({ numericData: true }) }),
  });
  assert.deepEqual(r.data, { numericData: true });
  assert.equal(r.requests, 1);
  assert.ok(r.durationMs >= 0 && r.durationMs <= 100);
});
