import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INDUSTRY_SERIES_SCHEMA, PROPOSED_INDUSTRY_API, parseUnifiedIndustrySeries,
} from './unified-industry-series-readonly.mjs';
import { runCommonSourceStage04 } from './common-source-gate-readonly.mjs';
import { F_ENDPOINT } from './latest-f-readonly.mjs';

const names = [
  '로봇·자동화', '클라우드·SaaS', '자율주행', '원전·SMR', '방산',
  '핀테크', '사이버보안', '바이오·신약', '데이터센터·전력',
];
const prior = [100, 125, 150];
const makeTheme = (theme, index, overrides = {}) => ({
  theme,
  metricId: `METRIC_${index}`,
  definitionId: `DEFINITION_${index}`,
  vintageId: 'PUBLISHED_IN_2026',
  unit: 'COUNT', region: 'GLOBAL',
  frequency: 'ANNUAL', metricKind: 'LEVEL', scope: 'DIRECT',
  source: {
    institution: 'APPROVED_OFFICIAL_SOURCE', url: 'https://example.org/official-raw-data',
    reuseRights: 'VERIFIED_FOR_ZGMINI_DERIVED_PUBLIC_USE',
  },
  observations: ['2023', '2024', '2025'].map((period, i) => ({
    period, value: prior[i], definitionId: `DEFINITION_${index}`,
    vintageId: 'PUBLISHED_IN_2026', phase: 'FINAL',
    publishedAt: '2026-02-01T01:00:00Z',
  })),
  ...overrides,
});
const makeFeed = (themes = names.map(makeTheme)) => ({
  status: 'READY', schemaVersion: INDUSTRY_SERIES_SCHEMA,
  sourceVersion: 'R19_TEST', sourceStoredAt: '2026-10-25T01:00:00Z', themes,
});
const options = { expectedThemes: names, asOfDate: '2026-10-25' };

test('R19 one unified contract gives comparable own-vintage YOY for every theme, but NO M or ranks', () => {
  const parsed = parseUnifiedIndustrySeries(makeFeed(), options);
  assert.equal(parsed.rowCount, names.length);
  assert.equal(parsed.rawGrowthObservedCount, names.length);
  assert.equal(parsed.accelerationObservedCount, names.length);
  for (const row of parsed.rows) {
    assert.ok(Math.abs(row.changeYoY - 20) < 1e-10);
    assert.ok(Math.abs(row.accelerationYoYPp + 5) < 1e-10);
    assert.equal(row.G1, null);
    assert.equal(row.M, null);
    assert.equal(row.officialRank, null);
  }
});

test('R19 share percentage change is pp, not an invented relative market growth rate', () => {
  const rows = [makeTheme('클라우드·SaaS', 1, {
    metricKind: 'ADOPTION_SHARE_PCT', unit: 'PERCENT_OF_ENTERPRISES',
    observations: [42, 47, 52].map((value, i) => ({
      period: String(2023 + i), value, definitionId: 'DEFINITION_1',
      vintageId: 'PUBLISHED_IN_2026', phase: 'FINAL', publishedAt: '2026-02-01T01:00:00Z',
    })),
  })];
  const row = parseUnifiedIndustrySeries(makeFeed(rows), options).rows[1];
  assert.equal(row.changeUnit, 'PERCENTAGE_POINTS_PER_YEAR');
  assert.equal(row.changeYoY, 5);
  assert.equal(row.accelerationYoYPp, 0);
  assert.equal(row.state, 'COMMON_INTERFACE_RAW_GROWTH_RESEARCH_ONLY');
  assert.equal(row.G, null);
});

test('R19 incomplete and off-year series stay NULL and do not exclude the theme', () => {
  const partial = makeTheme('자율주행', 2, {
    frequency: 'QUARTERLY',
    observations: [
      { period: '2025-Q3', value: 100, definitionId: 'DEFINITION_2', vintageId: 'PUBLISHED_IN_2026', phase: 'FINAL', publishedAt: '2026-02-01T01:00:00Z' },
      { period: '2026-Q2', value: 150, definitionId: 'DEFINITION_2', vintageId: 'PUBLISHED_IN_2026', phase: 'FINAL', publishedAt: '2026-07-01T01:00:00Z' },
      { period: '2026-Q3', value: 180, definitionId: 'DEFINITION_2', vintageId: 'PUBLISHED_IN_2026', phase: 'PROVISIONAL', publishedAt: '2026-10-20T01:00:00Z' },
    ],
  });
  const parsed = parseUnifiedIndustrySeries(makeFeed([partial]), options);
  assert.equal(parsed.rowCount, 9);
  assert.equal(parsed.rows[2].changeYoY, 80);
  assert.equal(parsed.rows[2].accelerationYoYPp, null);
  assert.equal(parsed.rows[0].state, 'THEME_MISSING_IN_UNIFIED_FEED');
});

test('R19 changed definition, vintage, rights or malformed source must not become numeric evidence', () => {
  const failCases = [
    ['SOURCE_RIGHTS_NOT_VERIFIED', { source: { institution: 'SRC', url: 'https://example.org/source', reuseRights: 'UNVERIFIED' } }],
    ['MISSING_PRIMARY_SOURCE', { source: { institution: 'SRC', url: 'http://example.org' } }],
    ['SERIES_DEFINITION_OR_VINTAGE_DRIFT', { observations: [
      { period: '2025', value: 5, definitionId: 'DIFFERENT', vintageId: 'PUBLISHED_IN_2026', phase: 'FINAL', publishedAt: '2026-02-01T01:00:00Z' },
    ] }],
    ['INVALID_OR_DUPLICATED_PERIOD', { observations: [
      { period: '2025', value: 5, definitionId: 'DEFINITION_0', vintageId: 'PUBLISHED_IN_2026', phase: 'FINAL', publishedAt: '2026-02-01T01:00:00Z' },
      { period: '2025', value: 7, definitionId: 'DEFINITION_0', vintageId: 'PUBLISHED_IN_2026', phase: 'FINAL', publishedAt: '2026-02-01T01:00:00Z' },
    ] }],
  ];
  for (const [state, override] of failCases) {
    const row = parseUnifiedIndustrySeries(makeFeed([makeTheme(names[0], 0, override)]), options).rows[0];
    assert.equal(row.state, state);
    assert.equal(row.changeYoY, null);
  }
});

test('R19 future publication is not available on an earlier as-of date', () => {
  const future = makeTheme(names[0], 0, {
    observations: [
      { period: '2025', value: 150, definitionId: 'DEFINITION_0', vintageId: 'PUBLISHED_IN_2026', phase: 'FINAL', publishedAt: '2026-10-26T01:00:00Z' },
      { period: '2024', value: 125, definitionId: 'DEFINITION_0', vintageId: 'PUBLISHED_IN_2026', phase: 'FINAL', publishedAt: '2026-08-01T01:00:00Z' },
    ],
  });
  const row = parseUnifiedIndustrySeries(makeFeed([future]), options).rows[0];
  assert.equal(row.sourcePeriod, '2024');
  assert.equal(row.changeYoY, null);
});

test('R19 a common endpoint is optional and exactly URL-scoped, never theme-specific fallback', async () => {
  const calls = [];
  const fPayload = {
    status: 'READY', sourceStoredAt: '2026-10-25T01:00:00Z', sourceVersion: 'TEST',
    themes: names.map((theme) => ({ theme, score: 24, history: [{ date: '2026-10-24' }] })),
  };
  const fetchFn = async (url) => {
    calls.push(url);
    if (url === F_ENDPOINT) return { url, ok: true, json: async () => fPayload };
    if (url === PROPOSED_INDUSTRY_API) return { url, ok: true, json: async () => makeFeed() };
    throw new Error('UNEXPECTED_NETWORK_SOURCE');
  };
  const result = await runCommonSourceStage04({ fetchFn, asOfDate: '2026-10-25', industryFeedUrl: PROPOSED_INDUSTRY_API });
  assert.deepEqual(calls, [F_ENDPOINT, PROPOSED_INDUSTRY_API]);
  assert.equal(result.status, 'COMMON_INDUSTRY_RAW_INPUT_COMPLETE_UNRANKED');
  assert.equal(result.industryCommonSource.exactThemeHistoryVerifiedCount, 9);
  assert.ok(Math.abs(result.themes[0].industry.changeYoY - 20) < 1e-10);
  assert.equal(result.themes[0].approvedAttractivenessM, null);
  assert.equal(result.automatedTradeEnabled, false);
  const disallowed = await runCommonSourceStage04({ fetchFn, asOfDate: '2026-10-25', industryFeedUrl: 'https://another.org/industry' });
  assert.deepEqual(calls, [F_ENDPOINT, PROPOSED_INDUSTRY_API, F_ENDPOINT]);
  assert.equal(disallowed.industryCommonSource.feedFailureCode, 'UNAPPROVED_INDUSTRY_FEED_URL');
});

test('R19 malformed or cross-origin response never supplies a ranking', async () => {
  const fPayload = { status: 'READY', themes: names.map((theme) => ({
    theme, score: 20, history: [{ date: '2026-10-24' }],
  })) };
  const run = (industry) => runCommonSourceStage04({ asOfDate: '2026-10-25', industryFeedUrl: PROPOSED_INDUSTRY_API, fetchFn: async (url) =>
    url === F_ENDPOINT ? { url, ok: true, json: async () => fPayload } : industry });
  const drift = await run({ ok: true, url: 'https://another.org', json: async () => makeFeed() });
  assert.equal(drift.industryCommonSource.feedFailureCode, 'INDUSTRY_API_ORIGIN_DRIFT');
  assert.equal(drift.themes[0].officialRank, null);
  const invalid = await run({ ok: true, url: PROPOSED_INDUSTRY_API, json: async () => ({ status: 'FAKE_READY' }) });
  assert.equal(invalid.industryCommonSource.feedFailureCode, 'INDUSTRY_API_CONTRACT_UNVERIFIED');
  assert.equal(invalid.themes[0].officialRank, null);
});
