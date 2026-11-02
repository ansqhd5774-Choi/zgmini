import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const code = fs.readFileSync(new URL('../app/market-breadth-strip.tsx', import.meta.url), 'utf8');
const style = fs.readFileSync(new URL('../app/market-breadth-strip.module.css', import.meta.url), 'utf8');

test('IEX provisional and R2 confirmed have independent stored-only readers that clear stale responses', () => {
  assert.match(code, /readPercent\("provisional", signal\), readPercent\("confirmed-r2", signal\)/);
  assert.match(code, /fetch\(`\/api\/market-breadth\?market=usa&phase=\$\{phase\}`/);
  assert.match(code, /startStoredRefresh\(/);
  assert.match(code, /return response\.ok \? await response\.json\(\) as unknown : null;/);
  assert.match(code, /catch \{\s+return null;/);
  assert.match(code, /setProvisional\(currentIexProvisional\(iexBody\) \? iexBody : null\)/);
  assert.match(code, /setConfirmed\(validConfirmedCurrent\(currentBody\) \? currentBody : null\)/);
  assert.match(code, /age > 30 \* 60_000/);
  assert.match(code, /record\.source !== "ALPACA_IEX_15MIN_SPLIT"/);
  assert.match(code, /record\.status !== "PROVISIONAL"/);
  assert.match(code, /near100\(record\.risingPct, record\.fallingPct, record\.unchangedPct, record\.unobservedPct\)/);
  assert.doesNotMatch(code, /minimumCoverage|directionAgreement|\.98/);
});

test('metadata, NY time and incomplete pages are labeled with strict R2 history and no legacy R1 fallback', () => {
  assert.match(code, /`\$\{name\} 잠정`/);
  assert.match(code, /activeProvisional\.unobservedPct\.toFixed\(1\)/);
  assert.match(code, /timeZone:"America\/New_York"/);
  assert.match(code, /INCOMPLETE_PAGINATION/);
  assert.match(code, /market-breadth-r2-history\?market=usa/);
  assert.match(code, /body\.universe !== "US_MARKETPARQUET_ACTIVE_STOCKS"/);
  assert.match(code, /body\.publicationStage !== "PUBLIC_FINAL"/);
  assert.doesNotMatch(code, /market-breadth\/history\?market=usa|useStoredIndex|validUsBreadthRecord/);
  assert.doesNotMatch(code, /numberFormat|className=\{styles\.count\}|개,/);
  assert.match(code, /현재 장중 수치 아님/);
});

test('same 41px card and colors are preserved, percentages remain visible on mobile', () => {
  assert.match(style, /height: 41px;/);
  assert.match(style, /\.stats\[data-provisional="true"\]/);
  assert.match(style, /\.up, \.rising \{ color: var\(--zg-positive\); \}/);
  assert.match(style, /\.down, \.falling \{ color: var\(--zg-danger\); \}/);
  assert.doesNotMatch(style, /\.percent \{ display: none;/);
});
