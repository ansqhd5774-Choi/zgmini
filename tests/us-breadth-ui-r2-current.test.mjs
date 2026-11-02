import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../app/market-breadth-strip.tsx', import.meta.url), 'utf8');
const block = source.match(/function validConfirmedCurrent\(value: unknown\): value is UsaConfirmedR2Record \{[\s\S]*?\n\}\n\nfunction normalizedCounts/);
assert.ok(block, 'UI confirmed-current validator is present');
const runnable = block[0].replace(/\n\nfunction normalizedCounts$/, '')
  .replace('function validConfirmedCurrent(value: unknown): value is UsaConfirmedR2Record {',
    'function validConfirmedCurrent(value) {')
  .replace('const record = value as UsaConfirmedR2Record;', 'const record = value;');
const validPercent = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100;
const near100 = (...parts) => Math.abs(parts.reduce((sum, n) => sum + n, 0) - 100) <= 0.2;
const validConfirmedCurrent = new Function('validPercent', 'near100',
  runnable + '\nreturn validConfirmedCurrent;')(validPercent, near100);
const confirmed = {market: 'usa', phase: 'CONFIRMED', status: 'READY',
  publicationStage: 'PUBLIC_FINAL', source: 'MARKETPARQUET_STOCK_DAILY',
  universe: 'US_MARKETPARQUET_ACTIVE_STOCKS', observationDate: '2026-10-30',
  previousDate: '2026-10-29', risingPct: 26.4217645250538,
  fallingPct: 67.78358438364587, unchangedPct: 5.794651091300338};
const provisional = {phase: 'PROVISIONAL', risingPct: 47, fallingPct: 41,
  unchangedPct: 2, unobservedPct: 10};
const history = {date: '2026-10-29', risingPct: 50, fallingPct: 45,
  unchangedPct: 5};

test('R2 current accepts only an independently final, percent-only MarketParquet projection', () => {
  assert.equal(validConfirmedCurrent(confirmed), true);
  assert.equal(validConfirmedCurrent({...confirmed, source: 'SP500_STORED_MARKETPARQUET_FREE_SAMPLE'}), false);
  assert.equal(validConfirmedCurrent({...confirmed, phase: 'PROVISIONAL'}), false);
  assert.equal(validConfirmedCurrent({...confirmed, status: 'CANDIDATE'}), false);
  assert.equal(validConfirmedCurrent({...confirmed, publicationStage: 'STAGING_ONLY'}), false);
  assert.equal(validConfirmedCurrent({...confirmed, fallingPct: 60}), false);
  assert.equal(validConfirmedCurrent({...confirmed, observationDate: '2026-10-28'}), false);
});

test('IEX provisional wins, then R2 current, then immutable R2 history fallback', () => {
  assert.match(source, /activeProvisional \?\? activeConfirmed \?\? lastHistory \?\? null/);
  const select = (p, c, h) => p ?? c ?? h ?? null;
  assert.equal(select(provisional, confirmed, history), provisional);
  assert.equal(select(null, confirmed, history), confirmed);
  assert.equal(select(null, null, history), history);
  assert.equal(select(null, null, null), null);
});

test('refresh reads independent read-only phases; history remains a separate API', () => {
  assert.match(source, /readPercent\("provisional", signal\), readPercent\("confirmed-r2", signal\)/);
  assert.match(source, /Promise\.all\(\[/);
  assert.match(source, /fetch\('\/api\/market-breadth-r2-history\?market=usa'/);
  assert.match(source, /setConfirmed\(validConfirmedCurrent\(currentBody\)/);
  assert.doesNotMatch(source, /fetch\([^\n]*market-breadth\?market=usa"/);
});
