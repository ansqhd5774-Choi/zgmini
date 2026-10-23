import test from 'node:test';
import assert from 'node:assert/strict';
import {r158ScorePrices} from '../lib/market-score/theme-etf-provisional-score.mjs';
import {scoreEtfAdaptiveR2, buildThemeAumAdaptiveShadowR2, evaluateEtfRankStabilityR2,
  R2_RANK_MIN_PROPOSED, R2_HISTORY_WINDOW} from '../lib/market-score/theme-etf-adaptive-r2-shadow.mjs';
import {R2_INPUT_SCHEMA, validateAndEvaluateThemeR2Input}
  from '../scripts/pc-writer/theme-r2-shadow-readonly.mjs';

// Deterministic SYNTHETIC prices, NOT actual ETF returns or licensed source data.
function dates(n) {
  const out = [], start = Date.UTC(2023, 0, 2);
  for (let i = 0; out.length < n; i++) {
    const day = new Date(start + i * 86400000);
    if (day.getUTCDay() !== 0 && day.getUTCDay() !== 6) out.push(day.toISOString().slice(0, 10));
  }
  return out;
}
const synthetic = (i, seed = 0) => 90 + seed * 12 + i * (.027 + seed * .006)
  + Math.sin((i + seed * 3) / 12) * (2 + seed * .3)
  + Math.cos((i + seed * 7) / 41) * 1.7;
const prices = (n, seed) => Array.from({length: n}, (_, i) => synthetic(i, seed));
function inputs(n) {
  return {dates: dates(n), spyCloses: prices(n, 0), a: prices(n, 1), b: prices(n, 2)};
}
const aum = (ticker, d, initial) => d.map((date, i) => ({
  date, netAssetsAsOf: date, netAssetsUSD: initial + i * 1500, source: 'SYNTHETIC_TEST_NO_PROVIDER',
}));

test('188 stored prices suffice for first proposed 63-sample provisional ETF score', () => {
  const s = inputs(188);
  const result = scoreEtfAdaptiveR2({dates: s.dates, closes: s.a, spyCloses: s.spyCloses});
  assert.equal(R2_RANK_MIN_PROPOSED, 63);
  assert.equal(result.history.at(-2).score, null);
  assert.equal(result.history.at(-2).rankSampleN, 62);
  assert.equal(result.history.at(-1).rankSampleN, 63);
  assert.equal(result.history.at(-1).historyMaturity, 'SHORT_SAMPLE');
  assert.ok(result.history.at(-1).score >= 0 && result.history.at(-1).score <= 100);
  assert.equal(result.calendarCoverage, 188); // No made-up calendar dates.
});

test('377 prices: first 252-rank mature point; 628 prices: full 252-score 1Y chart', () => {
  const s = inputs(628);
  const scored = scoreEtfAdaptiveR2({dates: s.dates, closes: s.a, spyCloses: s.spyCloses});
  assert.equal(scored.history.length, R2_HISTORY_WINDOW);
  assert.equal(scored.history[0].rankSampleN, 252);
  assert.equal(scored.history[0].historyMaturity, 'MATURE');
  assert.equal(scored.history.filter(x => x.score !== null).length, 252);
  const old = scoreEtfAdaptiveR2({dates: s.dates.slice(0, 376),
    closes: s.a.slice(0, 376), spyCloses: s.spyCloses.slice(0, 376)});
  assert.equal(old.history.at(-1).rankSampleN, 251);
  const first = scoreEtfAdaptiveR2({dates: s.dates.slice(0, 377),
    closes: s.a.slice(0, 377), spyCloses: s.spyCloses.slice(0, 377)});
  assert.equal(first.history.at(-1).rankSampleN, 252);
});

test('mature R2 price-score agrees with actual R158 across trailing three sessions', () => {
  const s = inputs(701);
  const old = r158ScorePrices(s.a, s.spyCloses);
  const now = scoreEtfAdaptiveR2({dates: s.dates, closes: s.a, spyCloses: s.spyCloses});
  for (let k = 0; k < 3; k++) {
    const point = now.history.at(-1-k);
    assert.equal(point.historyMaturity, 'MATURE');
    assert.ok(Math.abs(point.score - old[700-k]) < 1e-9,
      `trailing ${k} R2=${point.score}, R158=${old[700-k]}`);
  }
});

test('null/zero price gaps yield null and restart strict 125-session lookback', () => {
  const s = inputs(300);
  s.a[200] = null;
  const first = scoreEtfAdaptiveR2({dates: s.dates, closes: s.a, spyCloses: s.spyCloses});
  assert.equal(first.history.at(-1).score, null);
  assert.equal(first.history.at(-1).reason, 'PRICE_OR_FEATURE_HISTORY_MISSING');
  const s2 = inputs(300); s2.spyCloses[200] = 0;
  const second = scoreEtfAdaptiveR2({dates: s2.dates, closes: s2.a, spyCloses: s2.spyCloses});
  assert.equal(second.history.at(-1).score, null);
  const s3 = inputs(390); s3.spyCloses[200] = null;
  const recovered = scoreEtfAdaptiveR2({dates: s3.dates, closes: s3.a, spyCloses: s3.spyCloses});
  assert.equal(recovered.history.at(-1).rankSampleN, 64);
  assert.ok(Number.isFinite(recovered.history.at(-1).score));
});

test('two ETFs use exactly same-day AUM; one missing AUM blocks entire thematic score', () => {
  const s = inputs(200);
  const assetA = aum('QTUM', s.dates, 1_000_000_000);
  const assetB = aum('WQTM', s.dates, 10_000_000);
  const build = (bb=assetB) => buildThemeAumAdaptiveShadowR2({
    theme: '양자컴퓨팅', dates: s.dates, spyCloses: s.spyCloses,
    etfs: [{ticker: 'QTUM', closes: s.a, netAssets: assetA},
      {ticker: 'WQTM', closes: s.b, netAssets: bb}],
  });
  const full = build();
  assert.equal(full.publicationAuthorized, false);
  assert.equal(full.individualStocksUsed, 0);
  assert.equal(full.history.length, 200);
  assert.equal(full.validPoints, 13); // 200 stored prices - first 187 unscored.
  const firstReady = full.history[187];
  assert.ok(Number.isFinite(firstReady.score));
  const w = firstReady.weights;
  const a = assetA[187].netAssetsUSD, b = assetB[187].netAssetsUSD;
  assert.ok(Math.abs(w[0].weight - a/(a+b)) < 1e-12);
  assert.ok(Math.abs(w[1].weight - b/(a+b)) < 1e-12);
  const withoutLastAum = build(assetB.slice(0, -1));
  assert.equal(withoutLastAum.latestScore, null);
  assert.equal(withoutLastAum.history.at(-1).weights, null);
  assert.equal(withoutLastAum.history.at(-1).reason, 'AUM_MISSING_WQTM');
  const wrongAsOf = assetB.map(r => ({...r}));wrongAsOf.at(-1).netAssetsAsOf = s.dates.at(-2);
  assert.equal(build(wrongAsOf).history.at(-1).reason, 'AUM_INVALID_OR_UNRECONCILED_WQTM');
});

test('same chart preserves genuine gap dates and never backfills present AUM into history', () => {
  const s = inputs(628);
  const sparseA = aum('A', s.dates.slice(-10), 1_000_000);
  const sparseB = aum('B', s.dates.slice(-10), 1_000);
  const result = buildThemeAumAdaptiveShadowR2({theme: '테스트테마', dates: s.dates,
    spyCloses: s.spyCloses, etfs: [
      {ticker: 'AAA', closes: s.a, netAssets: sparseA},
      {ticker: 'BBB', closes: s.b, netAssets: sparseB},
    ]});
  assert.equal(result.history.length, 252);
  assert.equal(result.validPoints, 10);
  assert.equal(result.history[0].score, null);
  assert.equal(result.history[0].reason, 'AUM_MISSING_AAA');
  assert.equal(result.history.at(-1).weights[1].ticker, 'BBB');
});

test('invalid calendars and ranks fail closed without silent dates or size assumptions', () => {
  const s = inputs(200);
  assert.throws(() => scoreEtfAdaptiveR2({dates: [...s.dates].reverse(),
    closes: s.a, spyCloses: s.spyCloses}), /DATE_ORDER/);
  assert.throws(() => scoreEtfAdaptiveR2({dates: s.dates,
    closes: s.a.slice(1), spyCloses: s.spyCloses}), /PRICE_DATE_ALIGNMENT/);
  assert.throws(() => scoreEtfAdaptiveR2({dates: s.dates,
    closes: s.a, spyCloses: s.spyCloses, minRankObservations: 253}), /RANK_MIN_INVALID/);
  assert.throws(() => buildThemeAumAdaptiveShadowR2({theme: 'x', dates: s.dates,
    spyCloses: s.spyCloses, etfs: [
      {ticker: 'AAA', closes: s.a, netAssets: []},
      {ticker: 'AAA', closes: s.b, netAssets: []},
    ]}), /AT_LEAST_TWO_DISTINCT_ETFS/);
});

test('sample-size validation compares the exact same mature date to short virtual ETF histories', () => {
  const s = inputs(701);
  const result = evaluateEtfRankStabilityR2({dates: s.dates, closes: s.a,
    spyCloses: s.spyCloses, samples: [63, 126], maxAnchors: 12});
  assert.equal(result.status, 'PRIVATE_RESEARCH_ONLY_NOT_VALIDATED_FOR_PRODUCTION');
  assert.deepEqual(result.sampleComparisons.map(x => x.sampleN), [63, 126]);
  for (const comparison of result.sampleComparisons) {
    assert.equal(comparison.pairedObservations, 12);
    assert.ok(comparison.meanAbsoluteError !== null);
    assert.ok(comparison.maximumAbsoluteError >= comparison.meanAbsoluteError);
    assert.equal(comparison.anchors.length, 12);
    assert.equal(comparison.anchors[0].date, s.dates.at(-1));
    assert.ok(comparison.anchors.every(a => Number.isFinite(a.shortSampleScore)));
  }
  const tooShort = inputs(180);
  const unavailable = evaluateEtfRankStabilityR2({dates: tooShort.dates,
    closes: tooShort.a, spyCloses: tooShort.spyCloses});
  assert.equal(unavailable.sampleComparisons[0].pairedObservations, 0);
  assert.equal(unavailable.sampleComparisons[0].meanAbsoluteError, null);
});

test('offline PC evaluator returns compact scored metadata with no prices or publication grant', () => {
  const s = inputs(400);
  const input = {schema: R2_INPUT_SCHEMA, benchmark: 'SPY', theme: '양자컴퓨팅',
    dates: s.dates, spyCloses: s.spyCloses, etfs: [
      {ticker: 'QTUM', closes: s.a, netAssets: aum('QTUM', s.dates, 1_000_000_000)},
      {ticker: 'WQTM', closes: s.b, netAssets: aum('WQTM', s.dates, 10_000_000)},
    ]};
  const r = validateAndEvaluateThemeR2Input(input,{maxAnchors:4});
  assert.equal(r.status, 'PRIVATE_NUMERIC_SHADOW');
  assert.equal(r.publicationAuthorized, false);
  assert.equal(r.providerCalls, 0);
  assert.equal(r.databaseWrites, 0);
  assert.equal(r.calendarCoverage, 252);
  assert.equal(r.validPoints, 213); // first valid price index 187, total length 400.
  assert.equal(r.sensitivity.length, 2);
  assert.equal('spyCloses' in r, false);
  assert.equal('closes' in r, false);
  assert.equal(r.lastFive.length, 5);
  assert.throws(() => validateAndEvaluateThemeR2Input({...input,schema:'INVALID'}), /INPUT_SCHEMA_INVALID/);
});
