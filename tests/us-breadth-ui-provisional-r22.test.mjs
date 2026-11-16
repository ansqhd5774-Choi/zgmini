import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const code=fs.readFileSync(new URL('../app/market-breadth-strip.tsx',import.meta.url),'utf8');
const style=fs.readFileSync(new URL('../app/market-breadth-strip.module.css',import.meta.url),'utf8');

test('approved current-only US provisional request never falls back to retired confirmed history',()=>{
 assert.match(code,/startStoredRefresh\(/);
 assert.match(code,/fetch\('\/api\/market-breadth\?market=usa&phase=provisional'/);
 assert.match(code,/if \(response\.ok\) body = await response\.json\(\) as unknown/);
 assert.match(code,/catch \{\s*body = null;/);
 assert.match(code,/setProvisional\(current(?:Iex|Us)Provisional\(body\) \? body : null\)/);
 assert.match(code,/const data = market === "usa" \? activeProvisional : normalizedCounts\(counts\)/);
 for(const forbidden of ['MarketParquet','confirmed-r2','market-breadth-r2-history','lastHistory','activeConfirmed']){
  assert.equal(code.includes(forbidden),false,forbidden);
 }
});

test('live US data is guarded by exact phase, source, NY date, percentages and short lifetime',()=>{
 assert.match(code,/record\.status !== "PROVISIONAL"/);
 assert.match(code,/ALPACA_IEX_15MIN_SPLIT/);
 assert.match(code,/record\.slotEndUtc/);
 assert.match(code,/timeZone: "America\/New_York"/);
 assert.match(code,/near100\(record\.risingPct, record\.fallingPct, record\.unchangedPct, record\.unobservedPct\)/);
 assert.match(code,/INCOMPLETE_PAGINATION/);
 assert.match(code,/activeProvisional\.unobservedPct\.toFixed\(1\)/);
});

test('same card height, Korean counts and mobile colors are preserved without fake R2 expand',()=>{
 assert.match(style,/height: 41px;/);
 assert.match(code,/normalizedCounts\(counts\)/);
 assert.match(code,/market === "usa" \? "미제공" : "연결 예정"/);
 assert.doesNotMatch(code,/aria-expanded|styles\.toggleArrow|setExpanded\(/);
 assert.match(style,/\.stats\[data-provisional="true"\]/);
 assert.match(style,/\.up, \.rising \{ color: var\(--zg-positive\); \}/);
 assert.match(style,/\.down, \.falling \{ color: var\(--zg-danger\); \}/);
 assert.doesNotMatch(style,/\.percent \{ display: none;/);
});
