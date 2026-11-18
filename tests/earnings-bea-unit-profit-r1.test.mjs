import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {parseBeaUnitProfitCsv,buildBeaUnitProfitSource,UNIT_PROFIT_SERIES}
 from '../lib/market-score/earnings-bea-unit-profit-source-r1.mjs';
import {validateBeaUnitProfit,beaUnitFreshness,beaUnitWriter,readBeaUnitResponse,
 BEA_UNIT_ROUTE,BEA_UNIT_SNAPSHOT_KEY} from '../worker/earnings-bea-unit-profit-r1.mjs';

const source=[`observation_date,${UNIT_PROFIT_SERIES}`,
 '2025-04-01,0.216','2025-07-01,0.219','2025-10-01,0.222',
 '2026-01-01,0.231','2026-04-01,0.250'].join('\n')+'\n';
const now=Date.parse('2026-10-27T08:00:00.000Z');
const hash=createHash('sha256').update(source).digest('hex');
const payload=()=>buildBeaUnitProfitSource(source,{sourceVersion:hash,sourceStoredAt:now});

test('source parses five adjacent quarterly BEA unit-profit values without relabeling as profit margin',()=>{
 const rows=parseBeaUnitProfitCsv(source);
 assert.deepEqual(rows.map(x=>x.date),['2025-06-30','2025-09-30','2025-12-31','2026-03-31','2026-06-30']);
 const p=payload();
 assert.equal(p.indicator.value,0.250);
 assert.equal(p.indicator.previousValue,0.231);
 assert.ok(Math.abs(p.indicator.change-0.019)<1e-10);
 assert.equal(p.indicator.unit,'USD_PER_REAL_GVA_UNIT');
 assert.equal(p.historyMode,'CURRENT_VINTAGE_SOURCE_PERIOD_END');
 assert.equal(validateBeaUnitProfit(p,{now}),p);
 assert.equal(beaUnitFreshness(p,{now}).status,'FRESH');
 assert.equal(beaUnitFreshness(p,{now:Date.parse('2027-03-01T00:00:00Z')}).status,'STALE');
});

test('bad source header, duplicate quarter, missing quarter, malformed numeric and future date fail closed',()=>{
 const bad=[source.replace(UNIT_PROFIT_SERIES,'WRONG'),source.replace('2025-07-01','2025-04-01'),
  source.replace('2025-07-01','2025-08-01'),source.replace('0.231','NaN'),
  source.replace('2026-04-01','2027-04-01')];
 for(const data of bad)assert.throws(()=>parseBeaUnitProfitCsv(data));
 const corrupted=structuredClone(payload());corrupted.indicator.history[3].value=99;
 assert.throws(()=>validateBeaUnitProfit(corrupted,{now}));
 const mislabel=structuredClone(payload());mislabel.indicator.unit='PERCENT';
 assert.throws(()=>validateBeaUnitProfit(mislabel,{now}));
});

function fakeDb(){
 let row=null,writes=0;
 return {getWrites:()=>writes,prepare(sql){return {bind(...args){return {
  async first(){return row;},
  async run(){assert.match(sql,/INSERT INTO market_public_snapshots_v1/);writes++;
   row={body:args[1],stored_at:args[2]};return {meta:{changes:1}};}
 };}};}};
}

test('isolated D1 readback succeeds; public route is stored-only and never mutates',async()=>{
 const db=fakeDb(),request=new Request('https://zgmini.kr'+BEA_UNIT_ROUTE);
 assert.equal((await readBeaUnitResponse(request,db,{now})).status,503);
 assert.equal(db.getWrites(),0);
 const storedAt=now+1000;
 const written=await beaUnitWriter(db).write(payload(),{storedAt});
 assert.equal(written.status,'READBACK_VERIFIED');
 assert.equal(written.key,BEA_UNIT_SNAPSHOT_KEY);
 assert.equal(db.getWrites(),1);
 const current=await readBeaUnitResponse(request,db,{now:storedAt+2000});
 assert.equal(current.status,200);
 const body=await current.json();
 assert.equal(body.indicator.value,0.25);
 assert.equal(body.status,'READY');
 assert.equal(db.getWrites(),1);
 assert.equal((await beaUnitWriter(db).write(payload(),{storedAt:storedAt+5000})).status,'ALREADY_STORED');
 assert.equal(db.getWrites(),1);
 assert.equal((await readBeaUnitResponse(new Request(request.url,{method:'POST'}),db)).status,405);
 assert.equal((await readBeaUnitResponse(new Request(request.url+'?x=1'),db)).status,400);
 assert.equal((await readBeaUnitResponse(request,db,{now:Date.parse('2027-03-01T00:00:00Z')})).status,503);
});

test('R4-15 BEA unit public GET/HEAD verifies stored checkpoint cannot predate raw source',async()=>{
 const validPayload=payload(),builtAt=now+1000;
 const row=projection=>({body:JSON.stringify({payload:validPayload,projection}),
   stored_at:projection.builtAt});
 const projection={status:'READY',sourceStoredAt:validPayload.sourceStoredAt,
   sourceVersion:validPayload.sourceVersion,builtAt};
 let stored=row(projection),reads=0,mutations=0;
 const db={prepare(sql){
   assert.match(sql,/^SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=\?$/);
   return {bind(key){
     assert.equal(key,BEA_UNIT_SNAPSHOT_KEY);
     return {async first(){reads++;return stored;}};
   }};
 }};
 const get=new Request('https://zgmini.kr'+BEA_UNIT_ROUTE);
 const head=new Request(get.url,{method:'HEAD'});
 const good=await readBeaUnitResponse(get,db,{now:now+3000});
 assert.equal(good.status,200);
 assert.equal(good.headers.get('x-public-projection'),'STORED');
 assert.equal(good.headers.get('cache-control'),'no-store');
 assert.equal((await good.json()).indicator.value,0.25);
 const goodHead=await readBeaUnitResponse(head,db,{now:now+3000});
 assert.equal(goodHead.status,200);
 assert.equal(await goodHead.text(),'');
 // Before the fix this corrupt source-time ordering returned public READY 200.
 stored=row({...projection,builtAt:now-1});
 const invalidGet=await readBeaUnitResponse(get,db,{now:now+3000});
 assert.equal(invalidGet.status,503);
 assert.equal((await invalidGet.json()).reason,'STORED_PROJECTION_INVALID');
 const invalidHead=await readBeaUnitResponse(head,db,{now:now+3000});
 assert.equal(invalidHead.status,503);
 assert.equal(await invalidHead.text(),'');
 assert.equal(reads,4);
 assert.equal(mutations,0);
});

test('R4-15 BEA unit public GET rejects broken D1 stored metadata without source fetch',async()=>{
 const validPayload=payload(),build=now+1000;
 const original={status:'READY',sourceStoredAt:validPayload.sourceStoredAt,
   sourceVersion:validPayload.sourceVersion,builtAt:build};
 const request=new Request('https://zgmini.kr'+BEA_UNIT_ROUTE);
 let stored;
 const db={prepare(sql){
   assert.match(sql,/^SELECT body,stored_at FROM market_public_snapshots_v1/);
   return {bind(key){
     assert.equal(key,BEA_UNIT_SNAPSHOT_KEY);
     return {first:async()=>stored};
   }};
 }};
 const corruptions=[
   {projection:{...original,builtAt:now+4000},stored_at:now+4000}, // future
   {projection:{...original,sourceVersion:'f'.repeat(64)},stored_at:build},
   {projection:{...original,sourceStoredAt:now-500},stored_at:build},
   {projection:original,stored_at:build+1},
   {projection:{...original,builtAt:now-1},stored_at:now-1}
 ];
 for(const changed of corruptions){
   stored={body:JSON.stringify({payload:validPayload,projection:changed.projection}),
     stored_at:changed.stored_at};
   const response=await readBeaUnitResponse(request,db,{now:now+3000});
   assert.equal(response.status,503);
   assert.equal((await response.json()).reason,'STORED_PROJECTION_INVALID');
 }
 stored=null;
 const pending=await readBeaUnitResponse(request,db,{now:now+3000});
 assert.equal(pending.status,503);
 assert.equal((await pending.json()).reason,'STORED_PROJECTION_PENDING');
});
