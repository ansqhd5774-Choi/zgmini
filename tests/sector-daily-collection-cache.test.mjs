import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {collectAlpacaIncremental} from '../scripts/pc-writer/alpaca-incremental.mjs';
import {collectSectorFearGreedR3EtfIncremental} from '../scripts/pc-writer/sector-fear-greed-r3-etf-incremental.mjs';
import {SECTOR_FEAR_GREED_R3_BENCHMARKS} from '../lib/market-score/sector-fear-greed-r3-rolling.mjs';
const now=Date.parse('2026-10-16T08:00:00Z'),checkedAt='2026-10-15T16:30:00Z';
const write=(base,name,value)=>fs.writeFileSync(path.join(base,name),JSON.stringify(value));
function fixture(t){const base=fs.mkdtempSync(path.join(os.tmpdir(),'sector-cache-'));t.after(()=>fs.rmSync(base,{recursive:true,force:true}));fs.writeFileSync(path.join(base,'providers.env'),'APCA_API_KEY_ID=fixture\nAPCA_API_SECRET_KEY=fixture\n');return base;}
test('stock collector fetches a new target date within 20 hours and caches the completed target',async t=>{
 const base=fixture(t),dir=path.join(base,'asset-r10-alpaca');fs.mkdirSync(dir);
 write(dir,'group-1.json',[{ticker:'ABC'}]);write(dir,'incremental-checkpoint.json',{through:'2026-10-14'});
 write(base,'local-asset-bubble-r10-alpaca-collection.json',{checkedAt,storageVerified:true});
 let calls=0;const fetchImpl=async url=>{calls++;assert.equal(new URL(url).searchParams.get('end'),'2026-10-15T23:59:59Z');return Response.json({bars:{ABC:[{t:'2026-10-15T04:00:00Z',c:100,v:10}]}});};
 const out=await collectAlpacaIncremental(base,{now,fetchImpl});assert.equal(out.storageVerified,true);assert.equal(calls,1);
 assert.equal(JSON.parse(fs.readFileSync(path.join(dir,'incremental-checkpoint.json'))).through,'2026-10-15');
 assert.equal((await collectAlpacaIncremental(base,{now:now+1000,fetchImpl})).status,'CACHED');assert.equal(calls,1);
});
test('ETF collector fetches a new target date within 20 hours and caches the completed target',async t=>{
 const base=fixture(t),series=Object.fromEntries(SECTOR_FEAR_GREED_R3_BENCHMARKS.map(x=>[x,[{date:'2026-10-09',close:100,volume:10}]]));
 write(base,'local-sector-fear-greed-r1-iex-price-history.json',{series});
 write(base,'local-sector-fear-greed-r3-etf-incremental-last-run.json',{checkedAt,storageVerified:true,requestEnd:'2026-10-14'});
 let calls=0;const fetchImpl=async url=>{calls++;assert.equal(new URL(url).searchParams.get('end'),'2026-10-15T23:59:59Z');return Response.json({bars:Object.fromEntries(SECTOR_FEAR_GREED_R3_BENCHMARKS.map(x=>[x,[{t:'2026-10-09T04:00:00Z',c:100,v:10},{t:'2026-10-15T04:00:00Z',c:101,v:12}]]))});};
 const out=await collectSectorFearGreedR3EtfIncremental(base,{now,fetchImpl});assert.equal(out.commonLatest,'2026-10-15');assert.equal(calls,1);
 assert.equal((await collectSectorFearGreedR3EtfIncremental(base,{now:now+1000,fetchImpl})).status,'CACHED');assert.equal(calls,1);
});
test('stock collector retains failure backoff when the target date changes',async t=>{
 const base=fixture(t);fs.mkdirSync(path.join(base,'asset-r10-alpaca'));
 write(base,'local-asset-bubble-r10-alpaca-collection.json',{checkedAt:new Date(now-60000).toISOString(),storageVerified:false});
 const out=await collectAlpacaIncremental(base,{now,fetchImpl:()=>{throw Error('MUST_NOT_FETCH');}});assert.equal(out.status,'CACHED');
});
