import test from 'node:test';
import assert from 'node:assert/strict';
import {createKoreaFundsHandler,CACHE_MS,DEGRADED_CACHE_MS} from '../worker/korea-funds.mjs';
import {REV7_VERSION,REV7_FACTORS,REV7_INDEX_ID} from '../worker/korea-rev7-engine.mjs';

const weights=Object.fromEntries(REV7_FACTORS.map(id=>[id,1/7]));
const row=(date,score)=>{
 const factors=Object.fromEntries(REV7_FACTORS.map((id,index)=>[id,{id,raw:index,score:score+index/10}]));
 const compositeScore=REV7_FACTORS.reduce((sum,id)=>sum+factors[id].score,0)/7;
 return {
  date,methodology_version:REV7_VERSION,
  factors_json:JSON.stringify(factors),
  composite_json:JSON.stringify({id:REV7_INDEX_ID,score:compositeScore,status:'READY',observationDate:date,weights}),
  history_mode:'RECONSTRUCTED_CURRENT_VINTAGE',point_in_time_verified:0,calculated_at:'2026-09-18T00:00:00Z',
 };
};
const rows=[row('20260913',48),row('20260914',49),row('20260915',50)];
const req=()=>new Request('https://local.test/api/indicators/korea-funds');

test('initial incomplete Revision 7 snapshot retries after degraded cache TTL',async()=>{
 const oldNow=Date.now;
 let now=Date.parse('2026-09-15T12:00:00Z');
 let ready=false,progressCalls=0,rowCalls=0;
 Date.now=()=>now;
 try{
  const handler=createKoreaFundsHandler({
   clock:()=>new Date('2026-09-15T12:00:00Z'),
   loadProgress:async()=>{progressCalls++;return ready?{status:'COMPLETE',successfulTradingDates:1030}:{status:'RUNNING',successfulTradingDates:1000};},
   loadRows:async()=>{rowCalls++;return rows;},
  });

  const first=await (await handler(req(),{})).json();
  assert.equal(first.composite.methodologyVersion,REV7_VERSION);
  assert.equal(first.composite.score,null);
  assert.equal(first.composite.staleReason,'REV7_BACKFILL_NOT_COMPLETE');
  assert.equal(rowCalls,0);
  const progressAfterFailure=progressCalls;

  now+=DEGRADED_CACHE_MS-1;
  await handler(req(),{});
  assert.equal(progressCalls,progressAfterFailure);

  assert.ok(DEGRADED_CACHE_MS<CACHE_MS);
  ready=true;
  now+=2;
  const second=await (await handler(req(),{})).json();
  assert.ok(progressCalls>progressAfterFailure);
  assert.equal(rowCalls,1);
  assert.equal(second.composite.methodologyVersion,REV7_VERSION);
  assert.equal(second.composite.fallbackApplied,false);
  assert.equal(second.composite.status,'READY');
  assert.equal(second.indicators.length,7);
  assert.equal(typeof second.composite.score,'number');
 }finally{
  Date.now=oldNow;
 }
});

test('healthy Revision 7 snapshot keeps normal cache TTL',async()=>{
 const oldNow=Date.now;
 let now=Date.parse('2026-09-15T12:00:00Z');
 let progressCalls=0,rowCalls=0;
 Date.now=()=>now;
 try{
  const handler=createKoreaFundsHandler({
   clock:()=>new Date('2026-09-15T12:00:00Z'),
   loadProgress:async()=>{progressCalls++;return {status:'COMPLETE',successfulTradingDates:1030};},
   loadRows:async()=>{rowCalls++;return rows;},
  });

  const first=await (await handler(req(),{})).json();
  assert.equal(first.composite.methodologyVersion,REV7_VERSION);
  assert.equal(first.composite.status,'READY');
  const progressAfterFirst=progressCalls,rowAfterFirst=rowCalls;

  now+=DEGRADED_CACHE_MS+1000;
  await handler(req(),{});
  assert.equal(progressCalls,progressAfterFirst);
  assert.equal(rowCalls,rowAfterFirst);
 }finally{
  Date.now=oldNow;
 }
});
