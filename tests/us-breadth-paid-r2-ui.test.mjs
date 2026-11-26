import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const panel=fs.readFileSync(new URL('../app/market-breadth-paid-r2-panel.tsx',import.meta.url),'utf8');
const cnn=fs.readFileSync(new URL('../app/fear-greed/usa/cnn-panel.tsx',import.meta.url),'utf8');

test('US uses paid full-market percent reader; legacy IEX/free source not used',()=>{
  assert.match(cnn,/PaidUsBreadthR2Panel period=\{selectedPeriod\}/);
  assert.match(panel,/\/api\/market-breadth\?market=usa&phase=confirmed-r2/);
  assert.match(panel,/\/api\/market-breadth-r2-history\?market=usa/);
  assert.match(panel,/MARKETPARQUET_PAID_SPLIT_ADJUSTED_DAILY/);
  assert.doesNotMatch(panel,/\/api\/market-breadth\?market=usa&phase=provisional/);
  assert.doesNotMatch(panel,/MARKETPARQUET_FREE_SAMPLE/);
  assert.doesNotMatch(panel,/ALPACA_IEX/);
});
test('chart uses actual percentages as independent lines, no fabricated counts',()=>{
  assert.match(panel,/pathFor\(points,"risingPct"\)/);
  assert.match(panel,/pathFor\(points,"unchangedPct"\)/);
  assert.match(panel,/pathFor\(points,"fallingPct"\)/);
  assert.match(panel,/points\.length<2/);
  assert.match(panel,/checkedHistory\(past\)/);
  assert.doesNotMatch(panel,/eligibleCount\s*[:=]|counts\s*[:=]|rawPrices\s*[:=]/);
  assert.doesNotMatch(panel,/<circle\b/);
});
test('unverified current score remains missing and history retains its real date',()=>{
  assert.match(panel,/setCurrent\(checkedCurrent\(latest\)\?latest:null\)/);
  assert.match(panel,/setHistory\(checkedHistory\(past\)\?past:null\)/);
  assert.match(panel,/available\?\.risingPct/);
  assert.match(panel,/history\.lastDate/);
  assert.match(panel,/history\.historyComplete/);
});
