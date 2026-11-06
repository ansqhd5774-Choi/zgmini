import test from 'node:test';
import assert from 'node:assert/strict';
import {
 EARNINGS_API_ENDPOINT,earningsApiNewYorkDay,earningsApiForwardDay,
 collectEarningsApiForwardDay,collectEarningsApiWindow
} from '../lib/earnings-api-calendar.mjs';
import {collectEarningsApiForwardLocal,FORWARD_STATUS_KEY}
 from '../scripts/pc-writer/earnings-api-local.mjs';

const rights={automatedFetch:true,pcStorage:true,redistribution:false,
 reviewedAt:'2026-10-28',evidenceUrl:'https://www.earningsapi.com/docs/examples/calendar-backfill-sync',
 evidenceNote:'Official documentation explains private daily calendar synchronization.'};
const key='release-calendar';
const apiKey='not-a-real-api-key';
const makeStore=()=>{
 const rows=new Map();
 return {rows,async readInput(id){return rows.get(id)??null;},
  async writeInput(id,body){rows.set(id,{body});}};
};
const fixture=(day)=>JSON.stringify({date:day,
 pre:[{symbol:'AAPL',name:'Apple Inc.',epsEstimate:1.25}],after:[],notSupplied:[]});
const mockResponse=(url,day,{status=200}={})=>({ok:status===200,status,url,
 headers:{get:()=> 'application/json'},text:async()=>fixture(day)});
const base=({store,now,fetchImpl,countRequest=()=>{}})=>({store,key,now,fetchImpl,
 countRequest,apiKey,rights,scope:'pc_private'});

test('D+30 is a New York calendar date, independent of KST and DST clock jumps',()=>{
 assert.equal(earningsApiForwardDay(Date.parse('2026-11-07T02:00:00Z')),'2026-12-06');
 assert.equal(earningsApiForwardDay(Date.parse('2026-03-08T04:30:00Z')),'2026-04-06');
 assert.equal(earningsApiForwardDay(Date.parse('2026-03-08T07:30:00Z')),'2026-04-07');
 assert.equal(earningsApiForwardDay(Date.parse('2026-11-01T05:30:00Z')),'2026-12-01');
 assert.equal(earningsApiForwardDay(Date.parse('2026-11-01T06:30:00Z')),'2026-12-01');
});

test('one NY-day attempt fetches D+30 only once and persists the original vendor body',async()=>{
 const now=Date.parse('2026-11-07T02:00:00Z'),store=makeStore();
 const requested=[];let wrapped=0;
 const fetchImpl=async url=>{
  requested.push(url);
  return mockResponse(url,new URL(url).searchParams.get('date'));
 };
 const first=await collectEarningsApiForwardDay(base({store,now,fetchImpl,
  countRequest:()=>wrapped++}));
 assert.equal(first.providerRequests,1);
 assert.equal(wrapped,1);
 assert.equal(first.state.status,'READY');
 assert.equal(first.state.attemptedNyDay,'2026-11-06');
 assert.deepEqual(first.state.coveredDays,['2026-12-06']);
 assert.equal(requested.length,1);
 assert.equal(new URL(requested[0]).origin,new URL(EARNINGS_API_ENDPOINT).origin);
 assert.equal(new URL(requested[0]).searchParams.get('date'),'2026-12-06');
 const saved=await store.readInput('release-calendar:earnings-api:2026-12-06');
 assert.equal(JSON.parse(saved.body.text).pre[0].epsEstimate,1.25);
 const second=await collectEarningsApiForwardDay(base({store,now,fetchImpl}));
 assert.equal(second.skipped,true);
 assert.equal(second.providerRequests,0);
 assert.equal(requested.length,1);
 assert.ok(store.rows.has('release-calendar:earnings-api:forward-30-attempt:2026-11-06'));
});

test('failed response never overwrites saved data or retries during the same NY day',async()=>{
 const now=Date.parse('2026-11-07T14:00:00Z'),store=makeStore();
 await store.writeInput('release-calendar:earnings-api:2026-12-07',{
  text:fixture('2026-12-07'),requestedDate:'2026-12-07',sourceUrl:EARNINGS_API_ENDPOINT});
 let calls=0;
 const fetchImpl=async url=>{calls++;return mockResponse(url,'2026-12-07',{status:503});};
 const first=await collectEarningsApiForwardDay(base({store,now,fetchImpl}));
 assert.equal(first.state.status,'SOURCE_FAILED');
 assert.equal(first.providerRequests,1);
 const second=await collectEarningsApiForwardDay(base({store,now,fetchImpl}));
 assert.equal(second.providerRequests,0);
 assert.equal(calls,1);
 assert.equal(JSON.parse((await store.readInput('release-calendar:earnings-api:2026-12-07')).body.text).pre[0].epsEstimate,1.25);
});

test('mismatched provider date cannot write a future input',async()=>{
 const now=Date.parse('2026-11-07T14:00:00Z'),store=makeStore();
 const result=await collectEarningsApiForwardDay(base({store,now,
  fetchImpl:async url=>mockResponse(url,'2026-12-08')}));
 assert.equal(result.state.status,'SOURCE_FAILED');
 assert.equal(result.providerRequests,1);
 assert.equal(store.rows.has('release-calendar:earnings-api:2026-12-07'),false);
});

test('legacy same-day status cannot suppress a first D+30 GET',async()=>{
 const now=Date.parse('2026-11-07T14:00:00Z'),store=makeStore();
 let calls=0;
 const previous={body:{sources:{earningsApi:{status:'READY',
  attemptedNyDay:'2026-11-07',coveredDays:['2026-11-07','2026-11-08'],
  checkedAt:'2026-11-07T14:00:00.000Z'}}}};
 const result=await collectEarningsApiForwardDay({...base({store,now,
  fetchImpl:async url=>{
   calls++;
   return mockResponse(url,new URL(url).searchParams.get('date'));
  }}),previous});
 assert.equal(calls,1);
 assert.equal(result.providerRequests,1);
 assert.deepEqual(result.state.coveredDays,['2026-12-07']);
});

test('legacy 14-day contract and checkpoint naming remain unchanged',async()=>{
 const now=Date.parse('2026-11-07T14:00:00Z'),store=makeStore();
 let calls=0;
 const result=await collectEarningsApiWindow({...base({store,now,
  fetchImpl:async url=>{
   calls++;
   return mockResponse(url,new URL(url).searchParams.get('date'));
  }}),horizonDays:2});
 assert.equal(result.providerRequests,2);
 assert.equal(calls,2);
 assert.equal(result.state.attemptedNyDay,earningsApiNewYorkDay(now));
 assert.deepEqual(result.state.coveredDays,['2026-11-07','2026-11-08']);
 assert.ok(store.rows.has('release-calendar:earnings-api:attempt:2026-11-07'));
});

test('Core-local D+30 uses one GET then zero, with a separate status and unchanged legacy input',async()=>{
 const now=Date.parse('2026-11-07T14:00:00Z'),store=makeStore();
 const legacy={status:'READY',attemptedNyDay:'2026-11-07',recordCount:14,
  coveredDays:['2026-11-07','2026-11-08']};
 await store.writeInput('release-calendar:earnings-api:status',legacy);
 const calls=[];
 const fetchImpl=async url=>{
  calls.push(url);
  return mockResponse(url,new URL(url).searchParams.get('date'));
 };
 const args={store,now,fetchImpl,apiKey};
 const first=await collectEarningsApiForwardLocal(args);
 const again=await collectEarningsApiForwardLocal(args);
 assert.equal(first.providerRequests,1);
 assert.equal(again.providerRequests,0);
 assert.equal(again.skipped,true);
 assert.equal(calls.length,1);
 assert.equal(new URL(calls[0]).searchParams.get('date'),'2026-12-07');
 assert.equal((await store.readInput(FORWARD_STATUS_KEY)).body.status,'READY');
 assert.deepEqual((await store.readInput('release-calendar:earnings-api:status')).body,legacy);
 assert.ok(store.rows.has('release-calendar:earnings-api:2026-12-07'));
});

test('Core-local D+30 HTTP failure cannot trigger another same-day GET',async()=>{
 const now=Date.parse('2026-11-07T14:00:00Z'),store=makeStore();
 let requests=0;
 const args={store,now,apiKey,fetchImpl:async url=>{
  requests++;
  return mockResponse(url,'2026-12-07',{status:503});
 }};
 assert.equal((await collectEarningsApiForwardLocal(args)).status,'SOURCE_FAILED');
 assert.equal((await collectEarningsApiForwardLocal(args)).providerRequests,0);
 assert.equal(requests,1);
});
