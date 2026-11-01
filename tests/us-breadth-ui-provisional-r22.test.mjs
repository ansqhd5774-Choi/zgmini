import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const code=fs.readFileSync(new URL('../app/market-breadth-strip.tsx',import.meta.url),'utf8');
const style=fs.readFileSync(new URL('../app/market-breadth-strip.module.css',import.meta.url),'utf8');

test('IEX provisional has an independent stored-only 15m reader and clears stale responses',()=>{
  assert.match(code,/market=usa&phase=provisional/);
  assert.match(code,/startStoredRefresh\(/);
  assert.match(code,/if \(!response\.ok\) \{ setProvisional\(null\); return; \}/);
  assert.match(code,/catch \{[\s\S]*?setProvisional\(null\)/);
  assert.match(code,/age > 30 \* 60_000/);
  assert.match(code,/record\.observedCount \+ record\.missingCount !== record\.expectedCount/);
  assert.doesNotMatch(code,/minimumCoverage|directionAgreement|\.98/);
});

test('metadata, NY time and incomplete pages are labeled without rewriting R1 history',()=>{
  assert.match(code,/`\$\{name\} 잠정`/);
  assert.match(code,/activeProvisional\.observedCount/);
  assert.match(code,/activeProvisional\.missingCount/);
  assert.match(code,/timeZone:"America\/New_York"/);
  assert.match(code,/INCOMPLETE_PAGINATION/);
  assert.match(code,/market-breadth\/history\?market=usa/);
  assert.match(code,/body\.universe !== 'SP500'/);
  assert.match(code,/기존 S&P 500 확정치 1년 이력/);
});

test('same 41px card and colors are preserved, with only provisional small-screen width correction',()=>{
  assert.match(style,/height: 41px;/);
  assert.match(style,/\.stats\[data-provisional="true"\]/);
  assert.match(style,/\.up, \.rising \{ color: var\(--zg-positive\); \}/);
  assert.match(style,/\.down, \.falling \{ color: var\(--zg-danger\); \}/);
});
