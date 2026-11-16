import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync(new URL('../app/market-breadth-strip.tsx',import.meta.url),'utf8');
const retired=fs.readFileSync(new URL('../app/api/market-breadth-r2-history/route.ts',import.meta.url),'utf8');
const current=fs.readFileSync(new URL('../app/api/market-breadth/route.ts',import.meta.url),'utf8');

test('disallowed R2 confirmed phase is explicitly retired in the existing API',()=>{
 assert.match(current,/if\(phase==='confirmed-r2'\)return fullMarketConfirmedR2GET\(\)/);
 assert.match(current,/MARKETPARQUET_REMOVED_CODE/);
 assert.match(retired,/MARKETPARQUET_REMOVED_CODE/);
 assert.match(retired,/status:503/);
 assert.doesNotMatch(retired,/\.prepare\(/);
});

test('retired MarketParquet is neither fetched nor treated as last valid current in the UI',()=>{
 for(const marker of ['MarketParquet','MARKETPARQUET','confirmed-r2','lastHistory','validConfirmedCurrent','activeConfirmed','market-breadth-r2-history'])
  assert.equal(source.includes(marker),false,marker);
 assert.match(source,/const data = market === "usa" \? activeProvisional : normalizedCounts\(counts\)/);
 assert.match(source,/market === "usa" \? "미제공" : "연결 예정"/);
});

test('empty or invalid live publication leaves US numeric cells missing, not replaced with last historic score',()=>{
 assert.match(source,/setProvisional\(current(?:Iex|Us)Provisional\(body\) \? body : null\)/);
 assert.match(source,/if \(response\.ok\) body = await response\.json\(\) as unknown;/);
 assert.match(source,/catch \{\s*body = null;/);
 assert.match(source,/pct === undefined \? "—"/);
 assert.doesNotMatch(source,/setConfirmed|setHistory|\?\? lastHistory/);
});
