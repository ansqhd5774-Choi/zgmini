import test from 'node:test';
import assert from 'node:assert/strict';
import { buildIndustryQuantCoverage } from './industry-quant-coverage-readonly.mjs';
import { buildIndustryEvidenceFairness } from './industry-evidence-fairness-readonly.mjs';

const input = [
  ['로봇·자동화', 'IFR', { industryRawCount: 603307, industryReportedRoundedGrowthPct: 11,
    industryHistoricalYoyReferenceCount: 0, industryHistoricalAccelerationReferenceCount: 0 }],
  ['클라우드·SaaS', 'Eurostat', { industryRawPercent: 52.74,
    industryTwoYearDeltaPctPoints: 7.42, industryTwoYearWindowChangePctPoints: 3.07 }],
  ['자율주행', 'CPUC', { industryRawCount: 200, industryPriorComparableCount: 100,
    industryGrowthPct: 100, industryAccelerationPctPoints: 45,
    industryHistoricalYoyReferenceCount: 1, industryHistoricalAccelerationReferenceCount: 0 }],
  ['원전·SMR', 'IAEA PRIS', null],
  ['방산', 'SIPRI', null],
  ['핀테크', 'Federal Reserve Financial Services', { industryRawCount: 6376467,
    industryPriorComparableCount: 2506002, industryGrowthPct: 154.44780171763628,
    industryAccelerationPctPoints: 19.906, industryHistoricalYoyReferenceCount: 6,
    industryHistoricalAccelerationReferenceCount: 5 }],
  ['사이버보안', 'ENISA', { industryRawPercent: 9,
    industryHistoricalYoyReferenceCount: 0, industryHistoricalAccelerationReferenceCount: 0 }],
  ['바이오·신약', 'FDA CDER', { industryRawCount: 46, industryPriorComparableCount: 50,
    industryGrowthPct: -8, industryAccelerationPctPoints: -.5926,
    industryHistoricalYoyReferenceCount: 8, industryHistoricalAccelerationReferenceCount: 7 }],
  ['데이터센터·전력', 'IEA', { industryRawTwh: 485,
    industryReportedRoundedGrowthPct: 17, industryHistoricalYoyReferenceCount: 0,
    industryHistoricalAccelerationReferenceCount: 0 }],
];

function fixture() {
  const gate = {
    runType: 'INVESTMENT_BOT_STAGE04_INPUT_GATE_R16',
    runAtUtc: '2026-10-25T15:00:00.000Z',
    automatedTradeEnabled: false, orderRequests: [],
    themes: input.map(([theme, institution, v]) => ({
      theme, industryInstitution: institution,
      industryOfficialSource: `https://example.org/${encodeURIComponent(theme)}`,
      industryEvidenceState: v ? 'LIVE_ORIGINAL_OBSERVATION' : 'NOT_AUTOMATICALLY_VERIFIED',
      industryObservationPeriod: v ? '2025' : null,
      industryRawCount: v?.industryRawCount ?? null,
      industryRawTwh: v?.industryRawTwh ?? null,
      industryRawPercent: v?.industryRawPercent ?? null,
      industryPriorComparableCount: v?.industryPriorComparableCount ?? null,
      industryHistoricalYoyReferenceCount: v?.industryHistoricalYoyReferenceCount ?? null,
      industryHistoricalAccelerationReferenceCount: v?.industryHistoricalAccelerationReferenceCount ?? null,
      industryGrowthPct: v?.industryGrowthPct ?? null,
      industryReportedRoundedGrowthPct: v?.industryReportedRoundedGrowthPct ?? null,
      industryAccelerationPctPoints: v?.industryAccelerationPctPoints ?? null,
      industryTwoYearDeltaPctPoints: v?.industryTwoYearDeltaPctPoints ?? null,
      industryTwoYearWindowChangePctPoints: v?.industryTwoYearWindowChangePctPoints ?? null,
      provisionalIndustryProxy: v ? 'SCOPE_LIMITED' : null,
      industryReviewFlag: 'CHECK_SCOPE_BEFORE_CROSS_THEME_COMPARISON',
      approvedGrowthG: null, approvedDislocationD: null, approvedAttractivenessM: null,
      officialRank: null,
    })),
  };
  return { gate, quant: buildIndustryQuantCoverage(gate) };
}

test('R16 retains all nine themes and exposes factual baseline and history counts', () => {
  const { gate, quant } = fixture();
  const report = buildIndustryEvidenceFairness(gate, quant);
  assert.equal(report.retainedThemes, 9);
  assert.equal(report.observedSourceThemes, 7);
  assert.equal(report.priorComparableRawCountAvailable, 3);
  assert.equal(report.independentTwoCountYoyRecomputations, 3);
  assert.equal(report.historiesWithAtLeastOneYoyReference, 3);
  assert.equal(report.zeroImputedMissingGrowthValues, 0);
  assert.equal(report.themesDroppedDueToMissingness, 0);
  assert.equal(report.confidenceWeightsApproved, false);
  assert.ok(report.rows.every((row) => row.retainedFromApprovedThemeList));
  assert.ok(report.rows.every((row) => row.lowHistoryPenaltyPoints === null
    && row.comparativeConfidenceScore === null && row.officialRank === null));
});

test('same-source previous raw count yields independent YoY residual, no invented extra source', () => {
  const { gate, quant } = fixture();
  const rows = buildIndustryEvidenceFairness(gate, quant).rows;
  const fednow = rows.find((x) => x.theme === '핀테크');
  const fda = rows.find((x) => x.theme === '바이오·신약');
  assert.equal(fednow.priorComparableRawCount, 2506002);
  assert.ok(Math.abs(fednow.differenceFromReportedExactYoyPctPoints) < 1e-8);
  assert.ok(Math.abs(fda.independentlyRecomputedYoyFromTwoLiveCountsPct + 8) < 1e-8);
  assert.ok(Math.abs(fda.differenceFromReportedExactYoyPctPoints) < 1e-8);
});

test('zero historical acceleration references must NOT disqualify current computed acceleration', () => {
  const { gate, quant } = fixture();
  const cpuc = buildIndustryEvidenceFairness(gate, quant).rows.find((x) => x.theme === '자율주행');
  assert.equal(cpuc.historicalAccelerationReferenceCount, 0);
  assert.equal(cpuc.historicalMinimumApplied, false);
  assert.equal(cpuc.exactSourceYoyObserved, true);
  assert.equal(cpuc.independentlyRecomputedYoyFromTwoLiveCountsPct, 100);
  assert.equal(cpuc.lowHistoryPenaltyPoints, null);
});

test('rounded IFR/IEA rates never reverse-engineer previous raw counts', () => {
  const { gate, quant } = fixture();
  const rows = buildIndustryEvidenceFairness(gate, quant).rows;
  for (const name of ['로봇·자동화', '데이터센터·전력']) {
    const row = rows.find((x) => x.theme === name);
    assert.equal(row.sourcePublishedRoundedYoyObserved, true);
    assert.equal(row.priorComparableRawCount, null);
    assert.equal(row.independentlyRecomputedYoyFromTwoLiveCountsPct, null);
    assert.equal(row.comparativeConfidenceScore, null);
  }
});

test('level-only budget share and sparse 2-year cloud rate never become annual growth', () => {
  const { gate, quant } = fixture();
  const rows = buildIndustryEvidenceFairness(gate, quant).rows;
  for (const name of ['사이버보안', '클라우드·SaaS']) {
    const row = rows.find((x) => x.theme === name);
    assert.equal(row.exactSourceYoyObserved, false);
    assert.equal(row.independentlyRecomputedYoyFromTwoLiveCountsPct, null);
    assert.equal(row.inventedMissingGrowthPct, null);
  }
});

test('missing history remains NULL even if a current exact YoY was observed', () => {
  const { gate, quant } = fixture();
  const av = gate.themes.find((row) => row.theme === '자율주행');
  av.industryHistoricalYoyReferenceCount = null;
  av.industryPriorComparableCount = null;
  const row = buildIndustryEvidenceFairness(gate, quant).rows.find((x) => x.theme === '자율주행');
  assert.equal(row.historicalYoyReferenceCount, null);
  assert.equal(row.exactSourceYoyObserved, true);
  assert.equal(row.priorComparableRawCount, null);
  assert.equal(row.independentlyRecomputedYoyFromTwoLiveCountsPct, null);
  assert.equal(row.retainedFromApprovedThemeList, true);
});

test('even a large numerical inconsistency is diagnosed, not converted to theme failure', () => {
  const { gate, quant } = fixture();
  const av = gate.themes.find((row) => row.theme === '자율주행');
  av.industryPriorComparableCount = 150;
  const row = buildIndustryEvidenceFairness(gate, quant).rows.find((x) => x.theme === '자율주행');
  assert.ok(Math.abs(row.differenceFromReportedExactYoyPctPoints - (100 - 100 * (200 / 150 - 1))) < 1e-8);
  assert.equal(row.retainedFromApprovedThemeList, true);
  assert.equal(row.lowHistoryPenaltyPoints, null);
});

test('unobserved source cannot secretly carry a prior sample or confidence value', () => {
  const { gate, quant } = fixture();
  const iaea = gate.themes.find((row) => row.theme === '원전·SMR');
  iaea.industryHistoricalYoyReferenceCount = 1;
  assert.throws(() => buildIndustryEvidenceFairness(gate, quant), /UNOBSERVED_HISTORY_NOT_NULL/);
});

test('a ranking or order request breaks the research-only safety contract', () => {
  const { gate, quant } = fixture();
  gate.orderRequests = [{ symbol: 'TEST' }];
  assert.throws(() => buildIndustryEvidenceFairness(gate, quant), /INVALID_GATE_NO_TRADE_CONTRACT/);
});
