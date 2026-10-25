import test from 'node:test';
import assert from 'node:assert/strict';
import { buildIndustryQuantCoverage } from './industry-quant-coverage-readonly.mjs';

const cases = [
  ['로봇·자동화', 'IFR', { industryRawCount: 603307, industryReportedRoundedGrowthPct: 11 }],
  ['클라우드·SaaS', 'Eurostat', { industryRawPercent: 52.74,
    industryTwoYearDeltaPctPoints: 7.42, industryTwoYearWindowChangePctPoints: 3.07 }],
  ['자율주행', 'CPUC', { industryRawCount: 4220075,
    industryGrowthPct: 88.825, industryAccelerationPctPoints: -25.998 }],
  ['원전·SMR', 'IAEA PRIS', null],
  ['방산', 'SIPRI', null],
  ['핀테크', 'Federal Reserve Financial Services', { industryRawCount: 6376467,
    industryGrowthPct: 154.447, industryAccelerationPctPoints: 19.906 }],
  ['사이버보안', 'ENISA', { industryRawPercent: 9 }],
  ['바이오·신약', 'FDA CDER', { industryRawCount: 46,
    industryGrowthPct: -8, industryAccelerationPctPoints: -0.593 }],
  ['데이터센터·전력', 'IEA', { industryRawTwh: 485, industryReportedRoundedGrowthPct: 17 }],
];

function gate() {
  return {
    runType: 'INVESTMENT_BOT_STAGE04_INPUT_GATE_R15',
    runAtUtc: '2026-10-25T14:00:00.000Z',
    automatedTradeEnabled: false, orderRequests: [],
    themes: cases.map(([theme, institution, input]) => ({
      theme, industryInstitution: institution,
      industryOfficialSource: `https://example.org/${encodeURIComponent(theme)}`,
      industryEvidenceState: input ? 'LIVE_ORIGINAL_OBSERVATION' : 'NOT_AUTOMATICALLY_VERIFIED',
      industryObservationPeriod: input ? '2025' : null,
      industryRawCount: input?.industryRawCount ?? null,
      industryRawTwh: input?.industryRawTwh ?? null,
      industryRawPercent: input?.industryRawPercent ?? null,
      industryGrowthPct: input?.industryGrowthPct ?? null,
      industryReportedRoundedGrowthPct: input?.industryReportedRoundedGrowthPct ?? null,
      industryAccelerationPctPoints: input?.industryAccelerationPctPoints ?? null,
      industryTwoYearDeltaPctPoints: input?.industryTwoYearDeltaPctPoints ?? null,
      industryTwoYearWindowChangePctPoints: input?.industryTwoYearWindowChangePctPoints ?? null,
      provisionalIndustryProxy: input ? 'LIMITED_PROXY' : null,
      industryReviewFlag: 'SCOPE_OR_RIGHTS_REVIEW',
      approvedGrowthG: null, approvedDislocationD: null,
      approvedAttractivenessM: null, officialRank: null,
    })),
  };
}

test('R15 keeps all nine approved themes even when only seven official metrics are visible', () => {
  const result = buildIndustryQuantCoverage(gate());
  assert.equal(result.retainedThemes, 9);
  assert.equal(result.originalIndustrySourcesObserved, 7);
  assert.equal(result.exactWithinSourceYoyAvailable, 3);
  assert.equal(result.observedWithinSourceAccelerationAvailable, 3);
  assert.deepEqual(result.profileCounts, {
    COMPUTED_SAME_SOURCE_YOY: 3,
    SOURCE_PUBLISHED_ROUNDED_YOY: 2,
    SPARSE_MULTIYEAR_PERCENTAGE_POINT_CHANGE: 1,
    OBSERVED_LEVEL_NO_GROWTH: 1,
    SOURCE_UNAVAILABLE_NOT_THEME_FAILURE: 2,
  });
  assert.ok(result.rows.every((x) => x.themeRetained && x.noExactMatchRequired));
  assert.ok(result.rows.every((x) => x.approvedGrowthG === null && x.approvedDislocationD === null
    && x.approvedAttractivenessM === null && x.officialRank === null));
});

test('rounded and sparse official observations remain described without false exact YoY', () => {
  const rows = buildIndustryQuantCoverage(gate()).rows;
  const ifr = rows.find((x) => x.theme === '로봇·자동화');
  const iea = rows.find((x) => x.theme === '데이터센터·전력');
  const eurostat = rows.find((x) => x.theme === '클라우드·SaaS');
  const enisa = rows.find((x) => x.theme === '사이버보안');
  assert.equal(ifr.sourcePublishedRoundedYoyPct, 11);
  assert.equal(ifr.exactWithinSourceYoyPct, null);
  assert.equal(iea.sourcePublishedRoundedYoyPct, 17);
  assert.equal(iea.exactWithinSourceYoyPct, null);
  assert.equal(eurostat.twoYearPercentagePointDeltaNotYoy, 7.42);
  assert.equal(eurostat.changeBetweenTwoYearWindowsNotAnnualAccel, 3.07);
  assert.equal(eurostat.exactWithinSourceYoyPct, null);
  assert.equal(enisa.observedRawPercent, 9);
  assert.equal(enisa.exactWithinSourceYoyPct, null);
  assert.equal(enisa.evidenceProfile, 'OBSERVED_LEVEL_NO_GROWTH');
  assert.ok(rows.every((x) => x.calculatedGlobalIndustryGrowthPct === null));
});

test('different reported precision coexists without forcing an exact-match rejection', () => {
  const item = gate();
  item.themes[0].industryGrowthPct = 10.8;
  const robot = buildIndustryQuantCoverage(item).rows[0];
  assert.equal(robot.exactWithinSourceYoyPct, 10.8);
  assert.equal(robot.sourcePublishedRoundedYoyPct, 11);
  assert.equal(robot.evidenceProfile, 'COMPUTED_SAME_SOURCE_YOY');
});

test('missing an official reader leaves theme pending; it is never a zero-growth observation', () => {
  const item = gate();
  item.themes[0] = { ...item.themes[0], industryEvidenceState: 'NOT_AUTOMATICALLY_VERIFIED',
    industryRawCount: null, industryReportedRoundedGrowthPct: null };
  const result = buildIndustryQuantCoverage(item);
  assert.equal(result.retainedThemes, 9);
  assert.equal(result.originalIndustrySourcesObserved, 6);
  assert.equal(result.rows[0].verificationDisposition, 'NOT_OBSERVED_KEEP_THEME_PENDING');
  assert.equal(result.rows[0].sourcePublishedRoundedYoyPct, null);
});

test('a value from an unverified reader or corrupt numeric data is blocked, not scored', () => {
  const unavailable = gate();
  unavailable.themes[3].industryRawCount = 1;
  assert.throws(() => buildIndustryQuantCoverage(unavailable), /UNOBSERVED_VALUE/);
  const corrupt = gate();
  corrupt.themes[2].industryGrowthPct = Number.NaN;
  assert.throws(() => buildIndustryQuantCoverage(corrupt), /INVALID_NUMERIC_VALUE/);
});

test('no trade gate, nine unique theme IDs and null unapproved scores remain mandatory', () => {
  const ranked = gate();
  ranked.themes[0].officialRank = 1;
  assert.throws(() => buildIndustryQuantCoverage(ranked), /NO_TRADE_CONTRACT_DRIFT/);
  const trade = gate();
  trade.orderRequests = [{ ticker: 'TEST' }];
  assert.throws(() => buildIndustryQuantCoverage(trade), /NO_TRADE_CONTRACT_DRIFT/);
  const duplicates = gate();
  duplicates.themes[8].theme = '로봇·자동화';
  assert.throws(() => buildIndustryQuantCoverage(duplicates), /NO_TRADE_CONTRACT_DRIFT/);
});
