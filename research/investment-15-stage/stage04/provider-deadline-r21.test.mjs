import test from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { PROPOSED_INDUSTRY_API } from './unified-industry-series-readonly.mjs';
import { runCommonSourceStage04 } from './common-source-gate-readonly.mjs';
import { fetchProviderBatchWithinDeadline, rejectProviderForThemes,
  THEME_PROVIDER_MAX_MS } from './provider-deadline-r21-readonly.mjs';
import { F_ENDPOINT } from './latest-f-readonly.mjs';

const themes = ['로봇·자동화', '클라우드·SaaS', '자율주행', '원전·SMR',
  '방산', '핀테크', '사이버보안', '바이오·신약', '데이터센터·전력'];
const fPayload = {
  status: 'READY', sourceVersion: 'TEST', sourceStoredAt: '2026-10-25T05:00:00Z',
  themes: themes.map((theme) => ({ theme, score: 42, history: [{ date: '2026-10-23' }] })),
};

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

test('R21 rejects a provider once with no retries, no per-theme switching, no invented growth', () => {
  const names = Array.from({ length: 1000 }, (_, index) => `THEME_${index}`);
  const result = rejectProviderForThemes(names, 'PROVIDER_QUERY_DEADLINE_EXCEEDED', null, 'TEST_SOURCE');
  assert.equal(result.providerRequestCount, 1);
  assert.equal(result.retryCount, 0);
  assert.equal(result.providerSwitchCount, 0);
  assert.equal(result.themes.length, 1000);
  assert.ok(result.themes.every((row) => row.state === 'SOURCE_NOT_PROVIDING_DATA'
    && row.G1 === null && row.G2 === null && row.M === null));
});

test('R21 stage04 performs one industry batch for all themes and rejects it on timeout', async () => {
  const calls = [];
  const before = performance.now();
  const result = await runCommonSourceStage04({
    asOfDate: '2026-10-25', industryFeedUrl: PROPOSED_INDUSTRY_API,
    industryTimeoutMs: 25,
    fetchFn: (url) => {
      calls.push(url);
      return url === F_ENDPOINT
        ? Promise.resolve({ ok: true, url, json: async () => fPayload })
        : new Promise(() => {});
    },
  });
  assert.ok(performance.now() - before < 300);
  assert.deepEqual(calls, [F_ENDPOINT, PROPOSED_INDUSTRY_API]);
  assert.equal(result.industryCommonSource.feedFailureCode, 'PROVIDER_QUERY_DEADLINE_EXCEEDED');
  assert.equal(result.industryCommonSource.sourceAccess.providerRequestCount, 1);
  assert.equal(result.industryCommonSource.sourceAccess.retryCount, 0);
  assert.equal(result.industryCommonSource.sourceAccess.themes.length, themes.length);
  assert.ok(result.industryCommonSource.sourceAccess.durationMs >= 0
    && result.industryCommonSource.sourceAccess.durationMs < 300);
  assert.ok(result.themes.every((row) => row.stage04State === 'SOURCE_NOT_PROVIDING_DATA'
    && row.approvedAttractivenessM === null));
  assert.deepEqual(result.orderRequests, []);
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
