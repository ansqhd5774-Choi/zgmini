import test from 'node:test';
import assert from 'node:assert/strict';
import { F_ENDPOINT } from './latest-f-readonly.mjs';
import { evaluateCommonSourceStage04, runCommonSourceStage04 } from './common-source-gate-readonly.mjs';

const names = [
  '로봇·자동화', '클라우드·SaaS', '자율주행', '원전·SMR', '방산',
  '핀테크', '사이버보안', '바이오·신약', '데이터센터·전력',
];
const latest = {
  status: 'READY', sourceVersion: 'TEST', sourceStoredAt: '2026-10-25T05:00:00Z',
  themes: names.map((theme) => ({ theme, score: 42, history: [{ date: '2026-10-23' }] })),
  provisional: { points: [{ date: '2026-10-24', scores: { '바이오·신약': 18 } }] },
};

test('R18 stage04 reads exactly one uniform existing F endpoint and never fetches per-theme agencies', async () => {
  const calls = [];
  const report = await runCommonSourceStage04({ asOfDate: '2026-10-25', fetchFn: async (url) => {
    calls.push(url);
    assert.equal(url, F_ENDPOINT);
    return { ok: true, url, status: 200, json: async () => latest };
  } });
  assert.deepEqual(calls, [F_ENDPOINT]);
  assert.equal(report.F.observedThemeCount, 9);
  assert.equal(report.F.failureCode, null);
  assert.equal(report.industryCommonSource.exactThemeHistoryVerifiedCount, 0);
  assert.equal(report.industryCommonSource.perThemeProviderSwitchAllowed, false);
  assert.equal(report.status, 'COMMON_INDUSTRY_SOURCE_GAP_UNRANKED');
  assert.equal(report.themes[7].sentimentF, 18);
  assert.equal(report.themes[7].sentimentPhase, 'PROVISIONAL');
  for (const row of report.themes) {
    assert.equal(row.approvedGrowthG, null);
    assert.equal(row.approvedAttractivenessM, null);
    assert.equal(row.officialRank, null);
    assert.equal(row.industryDemandSourceId, null);
  }
  assert.deepEqual(report.orderRequests, []);
  assert.equal(report.automatedTradeEnabled, false);
});

test('R18 fails closed on F outage without reusing stored scores or switching sites', async () => {
  let calls = 0;
  const report = await runCommonSourceStage04({ fetchFn: async () => {
    calls += 1;
    return { status: 503, ok: false };
  } });
  assert.equal(calls, 1);
  assert.equal(report.F.failureCode, 'F_API_HTTP_503');
  assert.equal(report.F.observedThemeCount, 0);
  assert.equal(report.status, 'F_INPUT_INCOMPLETE_UNRANKED');
});

test('R18 detects redirect off the common source origin', async () => {
  const report = await runCommonSourceStage04({ fetchFn: async () => ({
    status: 200, ok: true, url: 'https://unknown.example.org/f', json: async () => latest,
  }) });
  assert.equal(report.F.failureCode, 'F_API_ORIGIN_DRIFT');
});

test('R18 common-source preflight does not silently lock theme count or promote a static provider flag', () => {
  const f = { status: 'LIVE_F_OBSERVED', themes: [...names, '추가 테마'].map((theme) => ({
    theme, currentInput: 25, observationDate: '2026-10-25', phase: 'BASE_OBSERVED',
  })) };
  const report = evaluateCommonSourceStage04(f, { sourceCandidates: [{
    id: 'CLAIMED_PROVIDER', commonExactThemeSeriesVerified: true,
  }] });
  assert.equal(report.themes.length, 10);
  assert.equal(report.industryCommonSource.state, 'CANDIDATE_UNVERIFIED_FOR_LIVE_USE');
  assert.equal(report.industryCommonSource.verifiedLiveCommonSourceId, null);
  assert.equal(report.themes.at(-1).officialRank, null);
  assert.equal(report.missingFieldReport.derivedFieldsBlocked.includes('M'), true);
});
