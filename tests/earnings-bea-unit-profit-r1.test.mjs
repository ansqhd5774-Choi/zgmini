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
