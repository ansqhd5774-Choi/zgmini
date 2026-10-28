import test from 'node:test';import assert from 'node:assert/strict';
import {openStore,hash} from '../scripts/iran-progress/store.mjs';
import {attachIranUpdateHistory,validateIranUpdateHistory,iranUpdateWindowStart} from '../lib/iran-progress/intraday-history-r1.mjs';
import {recordIranPublishedUpdate,readIranPublishedUpdates,withIranPublishedUpdates} from '../scripts/iran-progress/published-updates-r1.mjs';
import {publishIranR5Provisional} from '../scripts/iran-progress/publication.mjs';
const at=Date.parse('2026-10-28T09:20:00Z');
const body=(time=at,value=7.92)=>({version:'IRAN_DAILY_PROVISIONAL_R5_2',sourceVersion:'IRAN_R5_K21_R3_5_BALANCED',asOfDate:'2026-10-28',publishedAt:time,score:value,collectionCheckedAt:time-1200000,sourceStoredAt:time-3600000,acceptedEventCount:28});
const verified=b=>({status:'VERIFIED',bodyHash:hash(b)});
test('each verified publication remains immutable, including unchanged score and retry idempotency',()=>{
 const s=openStore(':memory:');try{
  const first=withIranPublishedUpdates(s,body(at-6*3600000,7.13));recordIranPublishedUpdate(s,first,verified(first));
  recordIranPublishedUpdate(s,first,verified(first));assert.equal(readIranPublishedUpdates(s).length,1);
  const second=withIranPublishedUpdates(s,body());assert.deepEqual(second.updateHistory.map(p=>p.value),[7.13,7.92]);recordIranPublishedUpdate(s,second,verified(second));
  const third=withIranPublishedUpdates(s,body(at+3600000));recordIranPublishedUpdate(s,third,verified(third));
  assert.equal(readIranPublishedUpdates(s).length,3);assert.deepEqual(third.updateHistory.map(p=>p.value),[7.13,7.92,7.92]);
  assert.throws(()=>recordIranPublishedUpdate(s,{...first,score:99},verified({...first,score:99})),/IMMUTABLE/);
 }finally{s.close();}
});
test('failed or unverified publication never becomes a public observation',()=>{
 const s=openStore(':memory:');try{for(const result of [{status:'FAILED'},{status:'REMOTE_NEWER_PRESERVED'},{status:'VERIFIED',bodyHash:'wrong'}])assert.throws(()=>recordIranPublishedUpdate(s,body(),result),/READBACK_REQUIRED/);assert.equal(readIranPublishedUpdates(s).length,0);}finally{s.close();}
});
test('KST fourteen calendar days are retained, old ledger is preserved and methods never get stitched',()=>{
 const s=openStore(':memory:');try{
  const b=body(),start=iranUpdateWindowStart(b);assert.equal(new Date(start).toISOString(),'2026-10-14T15:00:00.000Z');
  for(const [time,value]of [[start-1,5],[start,6],[at-3600000,7]]){const v={...body(time,value),asOfDate:'2026-10-28'};recordIranPublishedUpdate(s,v,verified(v));}
  const next=withIranPublishedUpdates(s,b);assert.equal(next.updateHistory.length,3);assert.equal(readIranPublishedUpdates(s).length,3);
  assert(next.updateHistory.every(p=>p.at>=start));
  assert.equal(withIranPublishedUpdates(s,{...b,sourceVersion:'different-method'}).updateHistory.length,1);
 }finally{s.close();}
});
test('history rejects future, unsorted, duplicated or mismatched latest points; no daily backfill is invented',()=>{
 const b=attachIranUpdateHistory(body());assert.equal(b.updateHistory.length,1);assert.equal(validateIranUpdateHistory(b),true);
 for(const point of [{...b.updateHistory[0],value:50},{...b.updateHistory[0],at:at+1}])assert.equal(validateIranUpdateHistory({...b,updateHistory:[point]}),false);
 assert.equal(validateIranUpdateHistory({...b,updateHistory:[b.updateHistory[0],b.updateHistory[0]]}),false);
 assert.equal(validateIranUpdateHistory({...b,updateHistoryVersion:'unknown'}),false);
 assert.equal(validateIranUpdateHistory(body()),true,'Existing daily payload remains readable');
 assert.throws(()=>attachIranUpdateHistory(body(),[{version:'IRAN_PUBLISHED_UPDATES_R1',verification:'D1_READBACK_VERIFIED',point:{...b.updateHistory[0],value:200}}]),/LEDGER_INVALID/);
});
test('publisher recovers actual remote timeline after local interruption; failed write adds no observation',async()=>{
 const s=openStore(':memory:'),rows=new Map();let fail=false;
 const remote={async query(db,sql,[key]){return {results:rows.has(key)?[rows.get(key)]:[]};},async request(db,batch){if(fail)throw Error('fixture outage');for(const q of batch){const[key,body,stored_at]=q.params;rows.set(key,{body,stored_at});}}};
 const full=(time,value)=>({...body(time,value),status:'PROVISIONAL',sourceMethod:'R5_21_OCT_13_K21',anchorDate:'2026-10-21',anchorScore:13,anchorAssessedAt:Date.parse('2026-10-20T21:35:00Z'),classifierVersion:'IRAN_EVENT_RULES_R3_5',sensitivityScale:21,probability:false,calibrated:false,completeEventCoverage:false,verifiedWarState:false,possibleDuplicateCount:0,history:Array.from({length:14},(_,i)=>({date:'2026-10-'+String(15+i),value,carried:false,reportedEvents:1,verifiedEvents:0}))});
 try{
  const first=full(at-6*3600000,7.13);await publishIranR5Provisional(remote,'fixture',first,{now:at,store:s});assert.equal(readIranPublishedUpdates(s).length,1);
  const next=full(at,7.92);await publishIranR5Provisional(remote,'fixture',next,{now:at});
  assert.deepEqual(next.updateHistory.map(p=>p.value),[7.13,7.92]);assert.equal(readIranPublishedUpdates(s).length,1,'Simulate missing local append');
  const third=full(at+3600000,7.92);await publishIranR5Provisional(remote,'fixture',third,{now:at+3600000,store:s});assert.deepEqual(third.updateHistory.map(p=>p.value),[7.13,7.92,7.92]);
  fail=true;await assert.rejects(publishIranR5Provisional(remote,'fixture',full(at+7200000,8),{now:at+7200000,store:s}),/OUTCOME_UNKNOWN/);assert.equal(readIranPublishedUpdates(s).length,2);
 }finally{s.close();}
});
