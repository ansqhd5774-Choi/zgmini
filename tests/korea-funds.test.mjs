import test from 'node:test';
import assert from 'node:assert/strict';
import {
 publicSnapshot,createKoreaFundsHandler,CACHE_MS,DEGRADED_CACHE_MS,
 PUBLIC_VERSION,PUBLIC_CACHE_KEY,PUBLIC_HISTORY_LIMIT,
} from '../worker/korea-funds.mjs';
import {REV7_VERSION,REV7_FACTORS,REV7_INDEX_ID} from '../worker/korea-rev7-engine.mjs';

const weights=Object.fromEntries(REV7_FACTORS.map(id=>[id,1/7]));
const date=i=>new Date(Date.UTC(2025,10,20)+i*86400000).toISOString().slice(0,10).replaceAll('-','');
const row=(i,score)=>{
 const factors=Object.fromEntries(REV7_FACTORS.map((id,index)=>[id,{id,raw:i+index,score:score+index/10}]));
 const compositeScore=REV7_FACTORS.reduce((sum,id)=>sum+factors[id].score,0)/7;
 return {
  date:date(i),methodology_version:REV7_VERSION,
  factors_json:JSON.stringify(factors),
  composite_json:JSON.stringify({id:REV7_INDEX_ID,score:compositeScore,status:'READY',observationDate:date(i),weights}),
  history_mode:'RECONSTRUCTED_CURRENT_VINTAGE',point_in_time_verified:0,calculated_at:'2026-09-18T00:00:00Z',
 };
};
const rows=Array.from({length:300},(_,i)=>row(i,40+(i%20)));
const complete=()=>({status:'COMPLETE',successfulTradingDates:1030});
const req=()=>new Request('https://local.test/api/indicators/korea-funds');

test('latest Revision 7 score equals the last valid public history value',async()=>{
 const d=await publicSnapshot({},{
  loadProgress:async()=>complete(),
  loadRows:async(_env,limit)=>rows.slice(-limit),
  clock:()=>new Date('2026-09-16T00:00:00Z'),
 });
 assert.equal(d.methodologyVersion,REV7_VERSION);
 assert.equal(d.composite.methodologyVersion,REV7_VERSION);
 assert.equal(d.composite.score,d.composite.history.at(-1).score);
 assert.equal(d.composite.observationDate,d.composite.history.at(-1).date);
 assert.equal(d.composite.scoreScale.max,100);
 assert.equal(d.indicators.length,7);
});

test('public history requests exactly the approved 270 Revision 7 observations',async()=>{
 let seenLimit=null;
 const d=await publicSnapshot({},{
  loadProgress:async()=>complete(),
  loadRows:async(_env,limit)=>{seenLimit=limit;return rows.slice(-limit);},
  clock:()=>new Date('2026-09-16T00:00:00Z'),
 });
 assert.equal(seenLimit,PUBLIC_HISTORY_LIMIT);
 assert.equal(PUBLIC_HISTORY_LIMIT,270);
 assert.equal(d.composite.history.length,270);
});

test('in-flight requests merge and subsequent visitors reuse the same Revision 7 snapshot',async()=>{
 let progressCalls=0,rowCalls=0;
 const h=createKoreaFundsHandler({
  loadProgress:async()=>{progressCalls++;await new Promise(r=>setTimeout(r,5));return complete();},
  loadRows:async(_env,limit)=>{rowCalls++;return rows.slice(-limit);},
  clock:()=>new Date('2026-09-16T00:00:00Z'),
 });
 const [a,b]=await Promise.all([h(req(),{}),h(req(),{})]);
 assert.deepEqual(await a.json(),await b.json());
 await h(req(),{});
 assert.equal(progressCalls,1);
 assert.equal(rowCalls,1);
});

test('query and method rejection happen before any D1 read',async()=>{
 const never=async()=>assert.fail('D1 read should not run');
 const h=createKoreaFundsHandler({loadProgress:never,loadRows:never});
 assert.equal((await h(new Request('https://local.test/api/indicators/korea-funds?refresh=1'),{})).status,400);
 assert.equal((await h(new Request(req(),{method:'POST'}),{})).status,405);
});

test('incomplete Revision 7 state fails closed without legacy fallback or fake neutral',async()=>{
 let rowCalls=0;
 const d=await publicSnapshot({},{
  loadProgress:async()=>({status:'RUNNING',successfulTradingDates:1000}),
  loadRows:async()=>{rowCalls++;return rows;},
 });
 assert.equal(rowCalls,0);
 assert.equal(d.composite.methodologyVersion,REV7_VERSION);
 assert.equal(d.composite.score,null);
 assert.equal(d.composite.fallbackApplied,false);
 assert.equal(d.composite.staleReason,'REV7_BACKFILL_NOT_COMPLETE');
 assert.equal(d.indicators.length,0);
});

test('public response excludes Revision 7 factor raw fields, secrets and provider payloads',async()=>{
 const h=createKoreaFundsHandler({
  loadProgress:async()=>complete(),
  loadRows:async(_env,limit)=>rows.slice(-limit),
  clock:()=>new Date('2026-09-16T00:00:00Z'),
 });
 const r=await h(req(),{KRX_API_KEY:'fixture-secret',BOK_API_KEY:'fixture-bok'});
 const s=await r.text();
 assert.ok(Buffer.byteLength(s)<131072);
 for(const token of ['fixture-secret','fixture-bok','"raw"','factors_json','composite_json','AUTH_KEY'])assert.ok(!s.includes(token),token);
 assert.equal(r.headers.get('set-cookie'),null);
});

test('previous observation and change are derived from actual Revision 7 snapshots',async()=>{
 const sample=[row(0,40),row(1,50),row(2,60)];
 const d=await publicSnapshot({},{
  loadProgress:async()=>complete(),
  loadRows:async()=>sample,
  clock:()=>new Date(`${sample.at(-1).date.slice(0,4)}-${sample.at(-1).date.slice(4,6)}-${sample.at(-1).date.slice(6,8)}T12:00:00Z`),
 });
 assert.equal(d.composite.observationDate,sample.at(-1).date);
 assert.equal(d.composite.previousObservationDate,sample.at(-2).date);
 assert.ok(Math.abs(d.composite.changePoints-10)<1e-9);
});

test('public cache identity is Revision 7 specific',()=>{
 assert.ok(PUBLIC_CACHE_KEY.includes(REV7_VERSION));
 assert.ok(PUBLIC_CACHE_KEY.includes(PUBLIC_VERSION));
 assert.ok(DEGRADED_CACHE_MS<CACHE_MS);
});
