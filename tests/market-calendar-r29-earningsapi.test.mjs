import test from 'node:test';
import assert from 'node:assert/strict';
import {EARNINGS_API_ENDPOINT,earningsApiNewYorkDay,earningsApiWindow,
 parseEarningsApiDay,validateEarningsApiRights,collectEarningsApiWindow}
 from '../staging/market-calendar/r28-earnings/lib/earnings-api-calendar.mjs';

const now=Date.parse('2026-10-28T15:00:00Z');
const rights={automatedFetch:true,pcStorage:true,commercialUse:true,publicDisplay:true,
 redistribution:true,reviewedAt:'2026-10-28',evidenceUrl:'https://example.org/license',
 evidenceNote:'Written redistribution and storage licence applicable to this product.'};
const response=(date,bucket='pre')=>JSON.stringify({date,pre:bucket==='pre'?[{symbol:'NVDA',name:'NVIDIA Corporation',epsEstimate:0}]:[],
 after:bucket==='after'?[{symbol:'AAPL',name:'Apple Inc.'}]:[],notSupplied:[]});
const storage=()=>{
 const values=new Map();
 return {values,store:{writeInput:async(k,body)=>{values.set(k,{body});},readInput:async k=>values.get(k)}};
};

test('New York date and 14 calendar days work across US daylight saving',()=>{
 assert.equal(earningsApiNewYorkDay(Date.parse('2026-11-01T03:59:59Z')),'2026-10-31');
 assert.equal(earningsApiNewYorkDay(Date.parse('2026-11-01T04:00:00Z')),'2026-11-01');
 const dates=earningsApiWindow(now);
 assert.equal(dates.length,14);
 assert.equal(dates[0],'2026-10-28');
 assert.equal(dates.at(-1),'2026-11-10');
 assert.throws(()=>earningsApiWindow(now,22),/HORIZON_INVALID/);
});

test('API response extracts only a date, session and ticker; no estimates or invented times',()=>{
 const rows=parseEarningsApiDay(JSON.stringify({date:'2026-11-02',pre:[{symbol:'NVDA',name:'NVIDIA',epsEstimate:3.1}],
  after:[{symbol:'AAPL',name:'Apple'}],notSupplied:[{symbol:'MSFT',name:'Microsoft'}]}),'2026-11-02');
 assert.deepEqual(rows.map(x=>x.marketSession),['before_market','after_market','unknown']);
 assert.ok(rows.every(x=>x.verification==='VENDOR_UNVERIFIED'&&!('time' in x)&&!('epsEstimate' in x)));
 assert.throws(()=>parseEarningsApiDay(response('2026-11-02'),'2026-11-03'),/DATE_MISMATCH/);
 assert.throws(()=>parseEarningsApiDay('{bad','2026-11-02'),/JSON_INVALID/);
 assert.throws(()=>parseEarningsApiDay(JSON.stringify({date:'2026-11-02',pre:[{symbol:'AAPL',name:'Apple'}],
  after:[{symbol:'AAPL',name:'Apple'}],notSupplied:[]}), '2026-11-02'),/DUPLICATE_TICKER/);
});

test('No network traffic with missing commercial public feed rights or API key',async()=>{
 assert.throws(()=>validateEarningsApiRights({...rights,redistribution:false}),/RIGHTS_NOT_VERIFIED/);
 const {store}=storage();let calls=0;
 const f=()=>{calls++;throw Error('MUST_NOT_FETCH');};
 await assert.rejects(()=>collectEarningsApiWindow({store,key:'release-calendar',now,fetchImpl:f,
  apiKey:'test-secret-123',rights:{...rights,redistribution:false}}),/RIGHTS_NOT_VERIFIED/);
 await assert.rejects(()=>collectEarningsApiWindow({store,key:'release-calendar',now,fetchImpl:f,
  apiKey:'',rights}),/KEY_MISSING/);
 assert.equal(calls,0);
});

test('14-day daily batch stores raw dates without secrets or publishing unconfirmed events',async()=>{
 const {store,values}=storage();const called=[];let count=0;
 const fetchImpl=async url=>{
  const parsed=new URL(url);called.push(parsed.searchParams.get('date'));
  assert.equal(parsed.origin,'https://api.earningsapi.com');
  assert.equal(parsed.pathname,'/v1/calendar/earnings');
  return {ok:true,url,headers:{get:()=> 'application/json'},text:async()=>response(parsed.searchParams.get('date'))};
 };
 const result=await collectEarningsApiWindow({store,key:'release-calendar',now,
  fetchImpl,apiKey:'test-secret-123',rights,countRequest:()=>count++});
 assert.equal(result.state.status,'READY');
 assert.equal(result.state.recordCount,14);
 assert.equal(result.state.publicationStatus,'HELD_UNCONFIRMED');
 assert.equal(count,14);assert.equal(called.length,14);assert.equal(values.size,15);
 assert.ok([...values.values()].every(v=>!JSON.stringify(v).includes('test-secret-123')&&
  v.body.sourceUrl===EARNINGS_API_ENDPOINT));
 const repeat=await collectEarningsApiWindow({store,key:'release-calendar',now:now+3600000,
  fetchImpl:()=>{throw Error('MUST_NOT_FETCH');},apiKey:'test-secret-123',rights,
  previous:{body:{sources:{earningsApi:result.state}}},countRequest:()=>count++});
 assert.equal(repeat.skipped,true);assert.equal(repeat.providerRequests,0);assert.equal(count,14);
 const afterOutputFailure=await collectEarningsApiWindow({store,key:'release-calendar',now:now+7200000,
  fetchImpl:()=>{throw Error('MUST_NOT_FETCH');},apiKey:'test-secret-123',rights});
 assert.equal(afterOutputFailure.skipped,true);
 assert.equal(afterOutputFailure.state.reason,'PREVIOUS_ATTEMPT_OUTCOME_UNKNOWN');
});

test('Failure is recorded for the NY day; no silent READY or immediate retries',async()=>{
 const {store}=storage();let calls=0;
 const result=await collectEarningsApiWindow({store,key:'release-calendar',now,
  fetchImpl:async()=>{calls++;return {ok:false,status:429};},apiKey:'test-secret-123',rights});
 assert.equal(result.state.status,'SOURCE_FAILED');assert.equal(result.providerRequests,1);
 const skip=await collectEarningsApiWindow({store,key:'release-calendar',now:now+3600000,
  fetchImpl:()=>{throw Error('MUST_NOT_FETCH');},apiKey:'test-secret-123',rights,
  previous:{body:{sources:{earningsApi:result.state}}}});
 assert.equal(skip.skipped,true);assert.equal(calls,1);
});
