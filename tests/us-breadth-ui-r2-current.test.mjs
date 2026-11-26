import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync(new URL('../app/market-breadth-strip.tsx',import.meta.url),'utf8');
const retired=fs.readFileSync(new URL('../app/api/market-breadth-r2-history/route.ts',import.meta.url),'utf8');
const current=fs.readFileSync(new URL('../app/api/market-breadth/route.ts',import.meta.url),'utf8');

test('only the paid full-US R2 reader replaces the retired free route',()=>{
 assert.match(current,/if\(phase==='confirmed-r2'\)return fullMarketConfirmedR2GET\(\)/);
 assert.match(current,/readPaidUsR2Feed\(coreSnapshotsDb\(\),\{mode:'current'\}\)/);
 assert.match(retired,/readPaidUsR2Feed\(native.DB_CORE\?\?native.DB,\{mode:'history'\}\)/);
 assert.doesNotMatch(current,/MARKETPARQUET_REMOVED_CODE|MARKETPARQUET_FREE_SAMPLE/);
 assert.doesNotMatch(retired,/MARKETPARQUET_REMOVED_CODE|readFullMarketPercentHistory/);
 assert.doesNotMatch(retired,/market_public_snapshots_v1/);
});

test('retired MarketParquet is neither fetched nor treated as last valid current in the UI',()=>{
 for(const marker of ['MarketParquet','MARKETPARQUET','confirmed-r2','lastHistory','validConfirmedCurrent','activeConfirmed','market-breadth-r2-history'])
  assert.equal(source.includes(marker),false,marker);
 assert.match(source,/const data = market === "usa" \? activeProvisional : normalizedCounts\(counts\)/);
 assert.match(source,/market === "usa" \? "미제공" : "연결 예정"/);
});

test('empty or invalid live publication leaves US numeric cells missing, not replaced with last historic score',()=>{
 assert.match(source,/const incoming = currentIexProvisional\(body\) \? body : null/);
 assert.match(source,/setProvisional\(previous => newestUsIexPercentPublication\(/);
 assert.match(source,/currentIexProvisional\(previous\) \? previous : null, incoming/);
 assert.match(source,/if \(response\.ok\) body = await response\.json\(\) as unknown;/);
 assert.match(source,/catch \{\s*body = null;/);
 assert.match(source,/pct === undefined \? "—"/);
 assert.doesNotMatch(source,/setConfirmed|setHistory|\?\? lastHistory/);
});
