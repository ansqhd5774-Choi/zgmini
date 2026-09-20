import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calendarQuarterAverage,
  exactAlign,
  expandingPercentileRows,
  shiftMonth,
  yoyPercent,
} from '../lib/diagnostic-layer/series-math.mjs';
import {
  buildAssetBubbleBatchA,
  buildBatchAKnownComponents,
  buildDebtRiskBatchA,
  buildInflationBatchA,
  buildRecessionRealPce,
  buildSupplyShockRawBatchA,
} from '../lib/diagnostic-layer/batch-a-components.mjs';

const monthly = (startYear, count, fn) => {
  const out = [];
  for (let i = 0; i < count; i++) {
    const y = startYear + Math.floor(i / 12);
    const m = i % 12 + 1;
    out.push({observationDate:`${y}-${String(m).padStart(2,'0')}-01`, value:fn(i)});
  }
  return out;
};

const quarterly = (startYear, count, fn) => {
  const out = [];
  for (let i = 0; i < count; i++) {
    const y = startYear + Math.floor(i / 4);
    const m = (i % 4) * 3 + 1;
    out.push({observationDate:`${y}-${String(m).padStart(2,'0')}-01`, value:fn(i)});
  }
  return out;
};

test('month shifting and YoY use exact calendar dates, never nearest-date fill', () => {
  assert.equal(shiftMonth('2026-01-01', -1), '2025-12-01');
  const rows = [
    {observationDate:'2024-01-01',value:100},
    {observationDate:'2025-01-01',value:110},
    {observationDate:'2025-02-01',value:120},
  ];
  assert.deepEqual(yoyPercent(rows), [{observationDate:'2025-01-01',value:10.000000000000009}]);
});

test('exact alignment keeps only shared dates', () => {
  const out = exactAlign({
    a:[{observationDate:'2026-01-01',value:1},{observationDate:'2026-02-01',value:2}],
    b:[{observationDate:'2026-02-01',value:3}],
  });
  assert.deepEqual(out,[{observationDate:'2026-02-01',a:2,b:3}]);
});

test('expanding percentile is prefix-stable and has explicit warmup', () => {
  const prefix = [{observationDate:'2026-01-01',value:1},{observationDate:'2026-02-01',value:2}];
  const a = expandingPercentileRows(prefix,{minValid:2});
  const b = expandingPercentileRows([...prefix,{observationDate:'2026-03-01',value:100}],{minValid:2});
  assert.equal(a[0].value,b[0].value);
  assert.equal(a.length,1);
  assert.equal(b.length,2);
});

test('inflation Batch A encodes R15 targets and remains PARTIAL without expectations', () => {
  const pce = monthly(2010, 96, i => 100 * (1.02 ** (i/12)));
  const corePce = monthly(2010, 96, i => 100 * (1.021 ** (i/12)));
  const coreCpi = monthly(2010, 96, i => 100 * (1.026 ** (i/12)));
  const cpi = monthly(2010, 96, i => 100 * (1.025 ** (i/12)));
  const out = buildInflationBatchA({corePce,headlinePce:pce,coreCpi,headlineCpi:cpi});
  assert.equal(out.status,'PARTIAL');
  assert.deepEqual(out.missing,['inflationExpectations']);
  assert.equal(out.corePce.target,2);
  assert.ok(out.corePce.score.length > 0);
  assert.ok(out.coreCpi.target.length > 0);
  assert.ok(out.headlineCpi.target.length > 0);
  assert.equal(out.lookAheadSafe,false);
});

test('R13 real PCE uses exact 3M annualized formula and 60-value warmup', () => {
  const rows = monthly(2010, 80, i => 100 * (1.001 ** i));
  const out = buildRecessionRealPce(rows);
  const first = out.annualized3m[0];
  const expected = 100 * ((rows[3].value / rows[0].value) ** 4 - 1);
  assert.ok(Math.abs(first.value-expected) < 1e-12);
  assert.equal(out.score[0].validHistory,60);
});

test('quarter average requires all three calendar months', () => {
  const rows = [
    {observationDate:'2026-01-01',value:1},
    {observationDate:'2026-02-01',value:2},
    {observationDate:'2026-03-01',value:3},
    {observationDate:'2026-04-01',value:4},
    {observationDate:'2026-06-01',value:6},
  ];
  assert.deepEqual(calendarQuarterAverage(rows),[{observationDate:'2026-01-01',value:2}]);
});

test('asset valuation starts no earlier than 1997Q1 and requires 12 valid values', () => {
  const financial = quarterly(1995, 20, i => 100+i);
  const nonfinancial = quarterly(1995, 20, i => 200+i);
  const gdp = quarterly(1995, 20, i => 1000+i);
  const risk = quarterly(1990, 40, i => 50+i/10);
  const m2 = monthly(1990, 120, i => 100+i);
  const out = buildAssetBubbleBatchA({
    publicFinancialEquity:financial,
    publicNonfinancialEquity:nonfinancial,
    nominalGdp:gdp,
    riskAssetShare:risk,
    m2,
  });
  assert.ok(out.valuation.raw.every(row=>row.observationDate>='1997-01-01'));
  assert.equal(out.valuation.score[0].validHistory,12);
  const firstRaw = out.valuation.raw[0];
  const aligned = exactAlign({f:financial,n:nonfinancial,g:gdp}).find(x=>x.observationDate===firstRaw.observationDate);
  assert.ok(Math.abs(firstRaw.value-(aligned.f+aligned.n)/aligned.g) < 1e-12);
});

test('asset risk-share R2 uses 4Q change and 12-change warmup', () => {
  const risk = quarterly(1990, 30, i => 40+i);
  const out = buildAssetBubbleBatchA({riskAssetShare:risk});
  assert.equal(out.riskAssetShare.change4q[0].value,4);
  assert.equal(out.riskAssetShare.score[0].validHistory,12);
});

test('asset excess liquidity uses quarterly M2 average YoY minus nominal GDP YoY', () => {
  const m2 = monthly(2000, 120, i => 100+i);
  const gdp = quarterly(2000, 40, i => 1000+10*i);
  const out = buildAssetBubbleBatchA({m2,nominalGdp:gdp});
  assert.ok(out.excessLiquidity.m2QuarterAverage.length > 0);
  assert.ok(out.excessLiquidity.raw.length > 0);
  assert.ok(out.excessLiquidity.score.length > 0);
  assert.equal(out.excessLiquidity.score[0].validHistory,20);
});

test('debt R7 rate burden and capacity use approved formulas and warmups', () => {
  const interest = quarterly(2000, 40, i => 100+i);
  const gva = quarterly(2000, 40, i => 1000+2*i);
  const profit = quarterly(2000, 40, i => 500+3*i);
  const out = buildDebtRiskBatchA({netInterest:interest,grossValueAdded:gva,profitsBeforeTax:profit});
  assert.ok(Math.abs(out.rateBurden.raw[0].value-10) < 1e-12);
  assert.ok(Math.abs(out.debtServiceCapacity.level[0].value-5) < 1e-12);
  assert.equal(out.rateBurden.score[0].validHistory,20);
  assert.equal(out.debtServiceCapacity.levelScore[0].validHistory,20);
  assert.equal(out.debtServiceCapacity.momentumScore[0].validHistory,20);
  assert.ok(out.debtServiceCapacity.score.length > 0);
});

test('supply Batch A only emits raw approved transforms when score warmup is unresolved', () => {
  const wti = monthly(2020, 24, i => 50+i);
  const gas = monthly(2020, 24, i => 2+i/10);
  const cpi = monthly(2020, 24, i => 100+i);
  const core = monthly(2020, 24, i => 100+i*0.8);
  const out = buildSupplyShockRawBatchA({wti,gasoline:gas,headlineCpi:cpi,coreCpi:core});
  assert.equal(out.status,'RAW_ONLY_PARTIAL');
  assert.match(out.reason,/WARMUP_NOT_ENCODED/);
  assert.ok(out.wtiShock.length>0);
  assert.ok(out.gasolineShock.length>0);
  assert.ok(out.headlineCoreGap.length>0);
});

test('full Batch A output does not fabricate unresolved diagnostic components', () => {
  const out = buildBatchAKnownComponents({});
  assert.ok(out.unresolvedByDesign.liquidity.includes('fundingStressFull'));
  assert.ok(out.unresolvedByDesign.credit.includes('bondVolatilityScoreStdevConvention'));
  assert.ok(out.unresolvedByDesign.earnings.includes('allExternalProviderComponents'));
  assert.ok(out.assetBubble.missing.includes('breadthDivergenceScore'));
  assert.equal(out.inflation.lookAheadSafe,false);
});
