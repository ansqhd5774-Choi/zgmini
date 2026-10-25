import test from 'node:test';
import assert from 'node:assert/strict';
import { buildIndustryQuantCoverage } from './industry-quant-coverage-readonly.mjs';
import { buildSentimentIndustryContrast, describeSentimentBand } from './sentiment-industry-contrast-readonly.mjs';

const values = [
  ['로봇·자동화', 'IFR', 20, { industryReportedRoundedGrowthPct: 11 }],
  ['클라우드·SaaS', 'Eurostat', 34, { industryTwoYearDeltaPctPoints: 7.42 }],
  ['자율주행', 'CPUC', 55, { industryGrowthPct: 88.8251 }],
  ['원전·SMR', 'IAEA PRIS', 17, null],
  ['방산', 'SIPRI', 78, null],
  ['핀테크', 'Federal Reserve Financial Services', 41, { industryGrowthPct: 154.4478 }],
  ['사이버보안', 'ENISA', 19, { industryRawPercent: 9 }],
  ['바이오·신약', 'FDA CDER', 22.6, { industryGrowthPct: -8 }],
  ['데이터센터·전력', 'IEA', 82, { industryReportedRoundedGrowthPct: 17 }],
];

function fixture() {
  const gate = {
    runType: 'INVESTMENT_BOT_STAGE04_INPUT_GATE_R17',
    runAtUtc: '2026-10-25T15:30:00.000Z',
    automatedTradeEnabled: false, orderRequests: [],
    themes: values.map(([theme, institution, f, evidence]) => ({
      theme,
      sentimentF: f,
      sentimentObservationDate: '2026-10-23',
      sentimentPhase: theme === '바이오·신약' ? 'PROVISIONAL' : 'BASE_OBSERVED',
      industryInstitution: institution,
      industryOfficialSource: `https://example.org/${encodeURIComponent(theme)}`,
      industryObservationPeriod: evidence ? '2025' : null,
      industryEvidenceState: evidence ? 'LIVE_ORIGINAL_OBSERVATION' : 'NOT_AUTOMATICALLY_VERIFIED',
      industryRawCount: evidence?.industryRawCount ?? null,
      industryRawTwh: null,
      industryRawPercent: evidence?.industryRawPercent ?? null,
      industryGrowthPct: evidence?.industryGrowthPct ?? null,
      industryReportedRoundedGrowthPct: evidence?.industryReportedRoundedGrowthPct ?? null,
      industryAccelerationPctPoints: null,
      industryTwoYearDeltaPctPoints: evidence?.industryTwoYearDeltaPctPoints ?? null,
      industryTwoYearWindowChangePctPoints: null,
      provisionalIndustryProxy: evidence ? 'LIMITED_PROXY_NOT_WHOLE_INDUSTRY' : null,
      industryReviewFlag: 'SOURCE_SCOPE_REVIEW',
      approvedGrowthG: null, approvedDislocationD: null, approvedAttractivenessM: null,
      officialRank: null,
    })),
  };
  return { gate, quant: buildIndustryQuantCoverage(gate) };
}

test('R17 keeps 9 themes, sees evidence separately, and does not produce G/D/M/rank/trades', () => {
  const { gate, quant } = fixture();
  const result = buildSentimentIndustryContrast(gate, quant);
  assert.equal(result.themeCount, 9);
  assert.equal(result.FObservedCount, 9);
  assert.equal(result.industryDirectionalEvidenceCount, 6);
  assert.equal(result.exploratoryLowFPositiveProxyCases, 3);
  assert.equal(result.exactOrRoundedYoyContrastCases, 2);
  assert.equal(result.sparseMultiYearContrastCases, 1);
  assert.equal(result.themeFailures, 0);
  assert.equal(result.zeroFilledMissingValues, 0);
  assert.equal(result.officialRankingEnabled, false);
  assert.equal(result.automatedTradeEnabled, false);
  assert.ok(result.rows.every((r) => r.approvedGrowthG === null && r.approvedDislocationD === null
    && r.approvedAttractivenessM === null && r.officialRank === null));
});

test('low F plus positive same-source YoY is an exploratory contrast, not investment approval', () => {
  const { gate, quant } = fixture();
  const fintech = buildSentimentIndustryContrast(gate, quant).rows.find((r) => r.theme === '핀테크');
  assert.equal(fintech.F, 41);
  assert.equal(fintech.fBandDisplayOnly, 'FEAR');
  assert.equal(fintech.industryTrendDirection, 'UP');
  assert.equal(fintech.industryTrendBasis, 'SAME_SOURCE_SAME_PERIOD_EXACT_YOY');
  assert.equal(fintech.industryObservedChange, 154.4478);
  assert.equal(fintech.exploratoryReviewCase, 'LOW_F_WITH_POSITIVE_YOY_PROXY_REVIEW');
  assert.equal(fintech.approvedAttractivenessM, null);
});

test('source-rounded IFR growth remains rounded and its previous base is not manufactured', () => {
  const { gate, quant } = fixture();
  const robot = buildSentimentIndustryContrast(gate, quant).rows.find((r) => r.theme === '로봇·자동화');
  assert.equal(robot.industryTrendBasis, 'SOURCE_PUBLISHED_ROUNDED_YOY');
  assert.equal(robot.industryChangeUnit, 'pct_yoy_rounded');
  assert.equal(robot.industryObservedChange, 11);
  assert.equal(robot.possibleLowFPositiveProxyContrast, true);
});

test('sparse 2023-2025 adoption growth stays multi-year percentage points, not annual YoY', () => {
  const { gate, quant } = fixture();
  const cloud = buildSentimentIndustryContrast(gate, quant).rows.find((r) => r.theme === '클라우드·SaaS');
  assert.equal(cloud.industryTrendBasis, 'SPARSE_MULTIYEAR_PERCENTAGE_POINT_DELTA_NOT_YOY');
  assert.equal(cloud.industryChangeUnit, 'percentage_points_over_multiple_years');
  assert.equal(cloud.industryObservedChange, 7.42);
  assert.equal(cloud.exploratoryReviewCase, 'LOW_F_WITH_POSITIVE_SPARSE_MULTIYEAR_PROXY_REVIEW');
});

test('negative FDA approvals YoY does not fail the biotech theme even though F is low', () => {
  const { gate, quant } = fixture();
  const biotech = buildSentimentIndustryContrast(gate, quant).rows.find((r) => r.theme === '바이오·신약');
  assert.equal(biotech.fObservationPhase, 'PROVISIONAL');
  assert.equal(biotech.industryTrendDirection, 'DOWN');
  assert.equal(biotech.industryObservedChange, -8);
  assert.equal(biotech.exploratoryReviewCase, 'LOW_F_WITH_DECLINING_PROXY_KEEP');
  assert.equal(biotech.allNineThemesRetained, true);
});

test('ENISA budget share does not become industry zero growth or a false comparison', () => {
  const { gate, quant } = fixture();
  const cyber = buildSentimentIndustryContrast(gate, quant).rows.find((r) => r.theme === '사이버보안');
  assert.equal(cyber.industryTrendBasis, 'OBSERVED_LEVEL_ONLY_NO_CHANGE');
  assert.equal(cyber.industryTrendDirection, 'UNKNOWN');
  assert.equal(cyber.industryObservedChange, null);
  assert.equal(cyber.exploratoryReviewCase, 'LOW_F_INDUSTRY_DIRECTION_UNKNOWN_KEEP');
});

test('IAEA/SIPRI absent official sources remain unknown and retained', () => {
  const { gate, quant } = fixture();
  const result = buildSentimentIndustryContrast(gate, quant);
  for (const name of ['원전·SMR', '방산']) {
    const row = result.rows.find((r) => r.theme === name);
    assert.equal(row.industryTrendBasis, 'SOURCE_NOT_OBSERVED');
    assert.equal(row.industryTrendDirection, 'UNKNOWN');
    assert.equal(row.industryObservedChange, null);
    assert.equal(row.allNineThemesRetained, true);
  }
});

test('positive activity with high F or nonfear F has no automatic low-F contrast', () => {
  const { gate, quant } = fixture();
  const result = buildSentimentIndustryContrast(gate, quant);
  assert.equal(result.rows.find((r) => r.theme === '자율주행').possibleLowFPositiveProxyContrast, false);
  assert.equal(result.rows.find((r) => r.theme === '데이터센터·전력').possibleLowFPositiveProxyContrast, false);
});

test('existing F display boundaries are descriptive, not extra hard acceptance gates', () => {
  assert.equal(describeSentimentBand(0), 'EXTREME_FEAR');
  assert.equal(describeSentimentBand(24.999), 'EXTREME_FEAR');
  assert.equal(describeSentimentBand(25), 'FEAR');
  assert.equal(describeSentimentBand(44.999), 'FEAR');
  assert.equal(describeSentimentBand(45), 'NEUTRAL');
  assert.equal(describeSentimentBand(55), 'GREED');
  assert.equal(describeSentimentBand(75), 'EXTREME_GREED');
  assert.equal(describeSentimentBand(100), 'EXTREME_GREED');
  assert.equal(describeSentimentBand(101), null);
  assert.equal(describeSentimentBand(NaN), null);
});

test('missing current F is not imputed from industry trend or treated as rejection', () => {
  const { gate, quant } = fixture();
  const fintech = gate.themes.find((r) => r.theme === '핀테크');
  fintech.sentimentF = null;
  fintech.sentimentObservationDate = null;
  fintech.sentimentPhase = 'UNAVAILABLE';
  const result = buildSentimentIndustryContrast(gate, quant);
  assert.equal(result.FObservedCount, 8);
  const row = result.rows.find((r) => r.theme === '핀테크');
  assert.equal(row.exploratoryReviewCase, 'F_MISSING_KEEP_UNASSESSED');
  assert.equal(row.industryTrendDirection, 'UP');
  assert.equal(row.F, null);
  assert.equal(result.retainedThemes, 9);
});

test('unapproved ranking or trade requests are prohibited, and evidence join must be exact', () => {
  const { gate, quant } = fixture();
  gate.orderRequests = [{ ticker: 'BUY' }];
  assert.throws(() => buildSentimentIndustryContrast(gate, quant), /INVALID_READONLY_GATE/);
  gate.orderRequests = [];
  gate.themes[0].approvedDislocationD = 10;
  assert.throws(() => buildSentimentIndustryContrast(gate, quant), /INVALID_READONLY_GATE/);
  gate.themes[0].approvedDislocationD = null;
  quant.rows[0].officialInstitution = 'OTHER_SOURCE';
  assert.throws(() => buildSentimentIndustryContrast(gate, quant), /SOURCE_MISMATCH/);
});
