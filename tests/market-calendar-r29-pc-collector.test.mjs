import test from 'node:test';
import assert from 'node:assert/strict';
import {validateEarningsApiRights,parseEarningsApiDay} from '../lib/earnings-api-calendar.mjs';
import {collectEarningsApiLocal} from '../scripts/pc-writer/earnings-api-local.mjs';

const at=Date.parse('2026-10-28T15:00:00Z');
const makeStore=()=>{
 const data=new Map(),writes=[];
 const store={readInput:async k=>data.get(k)??null,
  writeInput:async(k,body)=>{writes.push(k);data.set(k,{body});},
  writeOutput:()=>{throw Error('MUST_NOT_PUBLISH_VENDOR_FEED');}};
 return {store,data,writes};
};
const apiResponse=url=>{
 const date=new URL(url).searchParams.get('date');
 return {ok:true,url,headers:{get:()=> 'application/json'},text:async()=>JSON.stringify({
  date,pre:[{symbol:'MSFT',name:'Microsoft Corporation'}],after:[],notSupplied:[]})};
};

test('PC-private storage rights do not assert public redistribution rights',()=>{
 const privateRights={automatedFetch:true,pcStorage:true,redistribution:false,
  reviewedAt:'2026-10-28',evidenceUrl:'https://www.earningsapi.com/docs/examples/calendar-backfill-sync',
  evidenceNote:'Daily sync storage by date and time bucket is an official example.'};
 assert.equal(validateEarningsApiRights(privateRights,{scope:'pc_private'}),privateRights);
 assert.throws(()=>validateEarningsApiRights(privateRights),/RIGHTS_NOT_VERIFIED/);
 assert.throws(()=>validateEarningsApiRights({...privateRights,pcStorage:false},{scope:'pc_private'}),/RIGHTS_NOT_VERIFIED/);
 assert.throws(()=>validateEarningsApiRights({...privateRights,redistribution:true},{scope:'pc_private'}),/PRIVATE_SCOPE_INVALID/);
});

test('PC Core worker stores 14 private inputs, no D1 output and no key in records',async()=>{
 const {store,data,writes}=makeStore();let calls=0;
 const run=await collectEarningsApiLocal({store,apiKey:'private-key-123',now:at,
  fetchImpl:async url=>{calls++;return apiResponse(url);}});
 assert.equal(run.status,'READY');assert.equal(run.providerRequests,14);
 assert.equal(run.recordCount,14);assert.equal(run.publicationStatus,'HELD_UNCONFIRMED');
 assert.equal(calls,14);
 assert.equal(data.size,17); // 14 daily inputs, quota marker, state and R30 private view
 assert.equal(run.projectionStatus,'READY_PRIVATE');
 assert.equal(run.projectionCount,14);
 assert.equal(data.get('release-calendar:earnings-api:private-events')?.body?.scope,'PC_PRIVATE');
 assert.ok(writes.every(k=>k.startsWith('release-calendar:earnings-api:')));
 assert.ok([...data.values()].every(v=>!JSON.stringify(v).includes('private-key-123')));
 assert.ok([...data.keys()].every(k=>k!=='release-calendar'));
 const sameDay=await collectEarningsApiLocal({store,apiKey:'private-key-123',now:at+3600000,
  fetchImpl:()=>{throw Error('SHOULD_NOT_REQUEST_TWICE');}});
 assert.equal(sameDay.skipped,true);assert.equal(sameDay.providerRequests,0);
 assert.equal(calls,14);
});

test('No API request if no key; 429 preserved as failure with daily quota guard',async()=>{
 const {store,data}=makeStore();let calls=0;
 const noKey=await collectEarningsApiLocal({store,apiKey:'',now:at,
  fetchImpl:()=>{throw Error('SHOULD_NOT_CALL');}});
 assert.equal(noKey.status,'SKIPPED_NO_KEY');assert.equal(data.size,0);
 const fail=await collectEarningsApiLocal({store,apiKey:'private-key-123',now:at,
  fetchImpl:async()=>{calls++;return {ok:false,status:429};}});
 assert.equal(fail.status,'SOURCE_FAILED');assert.equal(fail.providerRequests,1);
 assert.equal(calls,1);
 const skip=await collectEarningsApiLocal({store,apiKey:'private-key-123',now:at+60000,
  fetchImpl:()=>{throw Error('SHOULD_NOT_RETRY');}});
 assert.equal(skip.skipped,true);assert.equal(skip.providerRequests,0);
 assert.equal(calls,1);
 assert.ok(data.has('release-calendar:earnings-api:status'));
});

test('Vendor reports have no issuer-confirmed label or fabricated clock time',()=>{
 const rows=parseEarningsApiDay(JSON.stringify({date:'2026-11-02',pre:[],
  after:[{symbol:'AAPL',name:'Apple Inc.'}],notSupplied:[]}), '2026-11-02');
 assert.deepEqual(rows.map(x=>x.verification),['VENDOR_UNVERIFIED']);
 assert.ok(rows.every(x=>!('time' in x)&&!('confirmed' in x)));
});
