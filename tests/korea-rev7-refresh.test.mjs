import test from 'node:test';
import assert from 'node:assert/strict';
import {refreshKoreaRev7} from '../worker/korea-rev7-refresh.mjs';
const env={KRX_API_KEY:'test',BOK_API_KEY:'test'};
test('deferred calculation stores the provider date but never loads heavy history or claims a new score',async()=>{const f=fixture();const result=await refreshKoreaRev7({env,store:f.store,deferCalculation:true,now:new Date('2026-09-17T00:00:00Z'),fetchDate:async date=>({requestedDate:date,complete:true,status:'SUCCESS'}),calculate:()=>{throw Error('MUST_NOT_CALCULATE')}});assert.deepEqual(f.events,['persist']);assert.equal(result.calculated,false);assert.equal(result.scoreDate,'20260915');assert.equal(result.latestDate,'20260916');assert.equal(f.lease(),false)});
test('provider failures preserve safe reason and call count without exposing arbitrary errors',async()=>{
 const f=fixture();
 const args={env,store:f.store,now:new Date('2026-09-17T00:00:00Z')};
 const result=await refreshKoreaRev7({...args,fetchDate:async()=>{throw Object.assign(Error('UPSTREAM_HTTP_503'),{krxRequestCount:1,bokRequestCount:0});}});
 assert.equal(result.reason,'UPSTREAM_HTTP_503');assert.equal(result.providerRequests,1);assert.deepEqual(f.events,[]);
 const unsafe=await refreshKoreaRev7({...args,fetchDate:async()=>{throw Error('https://provider/private-key');}});
 assert.equal(unsafe.reason,'COLLECT_FAILED');assert.equal(JSON.stringify(unsafe).includes('private-key'),false);
});
function fixture(){
 let date='20260915',scoreDate=date,lease=false;const events=[];
 const store={
  acquireLease:async()=>{lease=true;return true},renewLease:async()=>{},releaseLease:async()=>{lease=false},
  getBackfillProgress:async()=>({latestProcessedDate:date,successfulTradingDates:1030}),
  getLatestCompleteDate:async()=>date,getLatestSnapshot:async()=>({date:scoreDate}),
  saveDate:async raw=>{events.push('persist');date=raw.requestedDate},
  getHistory:async()=>{events.push('read');return {date}},
  saveSnapshot:async result=>{events.push('score');scoreDate=result.observationDate;return true},
  markBackfillStatus:async()=>{},
 };
 return {store,events,lease:()=>lease};
}
test('forward collection commits raw, reads stored input and persists score, then no-ops',async()=>{
 const f=fixture();let calls=0;
 const args={env,store:f.store,now:new Date('2026-09-17T00:00:00Z'),
 fetchDate:async date=>{calls++;return {requestedDate:date,complete:true,status:'SUCCESS',krxRequestCount:5,bokRequestCount:2}},
 calculate:({date})=>({observationDate:date,score:48})};
 const r=await refreshKoreaRev7(args);
 assert.equal(r.scoreDate,'20260916');assert.equal(r.providerRequests,7);
 assert.equal(r.status,'COMPLETE');assert.equal(r.caughtUp,true);assert.equal(r.nextDate,null);
 assert.deepEqual(f.events,['persist','read','score']);assert.equal(f.lease(),false);
 await refreshKoreaRev7(args);assert.equal(calls,1);
});
test('failed calculation resumes stored input without repeating provider calls',async()=>{
 const f=fixture();let calls=0;
 const args={env,store:f.store,now:new Date('2026-09-17T00:00:00Z'),fetchDate:async date=>{calls++;return {requestedDate:date,complete:true,status:'SUCCESS'}},calculate:()=>{throw Error('test')}};
 assert.equal((await refreshKoreaRev7(args)).phase,'CALCULATE');
 assert.equal((await refreshKoreaRev7({...args,calculate:({date})=>({observationDate:date,score:0})})).calculated,true);
 assert.equal(calls,1);assert.equal(f.lease(),false);
});
test('recent empty data is retried and not permanently stored as a holiday',async()=>{
 const f=fixture();
 const r=await refreshKoreaRev7({env,store:f.store,now:new Date('2026-09-17T00:00:00Z'),fetchDate:async date=>({requestedDate:date,complete:true,status:'NO_TRADING_OBSERVATION'})});
 assert.equal(r.storedDates,0);assert.deepEqual(f.events,[]);
 assert.equal(r.status,'WAITING_PUBLICATION');assert.equal(r.caughtUp,false);assert.equal(r.nextDate,'20260916');
});
test('a successful bounded chunk is not confused with caught-up collection',async()=>{
 const f=fixture();
 const r=await refreshKoreaRev7({env,store:f.store,now:new Date('2026-09-30T00:00:00Z'),fetchDate:async date=>({requestedDate:date,complete:true,status:'SUCCESS'}),calculate:({date})=>({observationDate:date,score:48})});
 assert.equal(r.status,'BACKLOG');assert.equal(r.caughtUp,false);
 assert.equal(r.processedThrough,'20260916');assert.equal(r.targetDate,'20260929');assert.equal(r.nextDate,'20260917');
});
test('missing credentials and concurrent run make zero provider calls',async()=>{
 const f=fixture();const fetchDate=()=>{throw Error('must not call')};
 assert.equal((await refreshKoreaRev7({env:{},store:f.store,fetchDate})).status,'CONFIGURATION_MISSING');
 f.store.acquireLease=async()=>false;
 assert.equal((await refreshKoreaRev7({env,store:f.store,fetchDate})).status,'ALREADY_RUNNING');
});
test('closed weekends do not block the next trading day',async()=>{
 const f=fixture();await f.store.saveDate({requestedDate:'20260925'});f.events.length=0;
 const r=await refreshKoreaRev7({env,store:f.store,now:new Date('2026-09-28T00:00:00Z'),maxDates:2,fetchDate:async date=>({requestedDate:date,complete:true,status:'NO_TRADING_OBSERVATION'}),calculate:({date})=>({observationDate:date,score:48})});
 assert.equal(r.processedThrough,'20260927');assert.equal(r.caughtUp,true);assert.equal(r.storedDates,2);
});
test('evening collection attempts current published day but never invents unavailable data',async()=>{
 const f=fixture();await f.store.saveDate({requestedDate:'20260929'});
 let requested;
 const r=await refreshKoreaRev7({env,store:f.store,now:new Date('2026-09-30T09:00:00Z'),fetchDate:async date=>{requested=date;return {requestedDate:date,complete:true,status:'NO_TRADING_OBSERVATION'};},calculate:({date})=>({observationDate:date,score:48})});
 assert.equal(requested,'20260930');assert.equal(r.status,'WAITING_PUBLICATION');assert.equal(r.storedDates,0);assert.equal(r.targetDate,'20260930');
});
