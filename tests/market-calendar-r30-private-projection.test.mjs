import test from 'node:test';
import assert from 'node:assert/strict';
import {earningsApiWindow,EARNINGS_API_ENDPOINT} from '../lib/earnings-api-calendar.mjs';
import {readEarningsApiPrivateProjection,EARNINGS_API_R30_PRIVATE_KEY} from '../lib/earnings-api-private-projection.mjs';
import {collectEarningsApiLocal} from '../scripts/pc-writer/earnings-api-local.mjs';

const now=Date.parse('2026-10-28T15:00:00Z');
const days=earningsApiWindow(now);
const sourceState=(count)=>({status:'READY',attemptedNyDay:days[0],checkedAt:new Date(now).toISOString(),
 coveredDays:days,recordCount:count,publicationStatus:'HELD_UNCONFIRMED'});
const sample=(day,i=0)=>JSON.stringify({date:day,
 pre:[{symbol:'MSFT',name:'Microsoft Corporation',epsEstimate:123}],
 after:i===0?[{symbol:'GOOGL',name:'Alphabet Inc.'}]:[],
 notSupplied:[],});
const local=()=>{
 const data=new Map(),writes=[];
 const store={readInput:async k=>data.get(k)??null,
  writeInput:async(k,body)=>{writes.push(k);data.set(k,{body});},
  writeOutput:()=>{throw Error('R30_MUST_NOT_WRITE_PUBLIC_OUTPUT');}};
 return {store,data,writes};
};
const seed=(db,make=sample)=>{
 days.forEach((day,i)=>db.data.set(`release-calendar:earnings-api:${day}`,
  {body:{text:make(day,i),requestedDate:day,sourceUrl:EARNINGS_API_ENDPOINT}}));
};

test('R30 reads 14 existing PC inputs without API calls or public writes',async()=>{
 const db=local();seed(db);
 const result=await readEarningsApiPrivateProjection({store:db.store,sourceState:sourceState(15),now});
 assert.equal(result.scope,'PC_PRIVATE');assert.equal(result.status,'READY_PRIVATE');
 assert.equal(result.publicDisplay,false);assert.equal(result.redistribution,false);
 assert.equal(result.publicationStatus,'HELD_UNCONFIRMED');
 assert.equal(result.recordCount,15);assert.equal(result.priorityCount,15);
 assert.equal(db.writes.length,0);
 assert.ok(result.events.every(e=>e.verification==='VENDOR_UNVERIFIED'&&e.time===null));
 assert.ok(result.events.every(e=>!('epsEstimate' in e)&&!('revenue' in e)&&!('apiKey' in e)));
 assert.equal(result.events.find(e=>e.ticker==='GOOGL').marketSession,'after_market');
});

test('R30 handles 2,609 company rows in a single private snapshot, still zero requests',async()=>{
 const db=local();let global=0;
 seed(db,(day,i)=>{
  const bucket=[];
  for(let n=0;n<(i===13?191:186);n++){
   const value=global++;
   bucket.push({symbol:'T'+String(value).padStart(5,'0'),name:'Example Co '+value});
  }
  return JSON.stringify({date:day,pre:bucket,after:[],notSupplied:[]});
 });
 const recordCount=days.reduce((sum,day)=>sum+JSON.parse(db.data.get(`release-calendar:earnings-api:${day}`).body.text).pre.length,0);
 assert.equal(recordCount,2609); // 13 * 186 + 191, independent of the API
 const projection=await readEarningsApiPrivateProjection({store:db.store,sourceState:sourceState(recordCount),now});
 assert.equal(projection.recordCount,recordCount);assert.equal(db.writes.length,0);
});

test('R30 rejects incomplete, stale and inconsistent private source snapshots',async()=>{
 const db=local();seed(db);
 await assert.rejects(readEarningsApiPrivateProjection({store:db.store,sourceState:sourceState(14),now}),/COUNT_MISMATCH/);
 await assert.rejects(readEarningsApiPrivateProjection({store:db.store,
  sourceState:{...sourceState(15),attemptedNyDay:'2026-10-27'},now}),/COVERAGE_INVALID/);
 db.data.delete(`release-calendar:earnings-api:${days[3]}`);
 await assert.rejects(readEarningsApiPrivateProjection({store:db.store,
  sourceState:sourceState(15),now}),/INPUT_MISSING_OR_INVALID/);
});

test('automatic R30 projection is saved privately after one successful R29 cycle',async()=>{
 const db=local();let calls=0;
 const response=url=>{const date=new URL(url).searchParams.get('date');return {
  ok:true,url,headers:{get:()=>'application/json'},
  text:async()=>JSON.stringify({date,pre:[{symbol:'NVDA',name:'NVIDIA'}],after:[],notSupplied:[]}),
 };};
 const result=await collectEarningsApiLocal({store:db.store,apiKey:'local-private-secret',now,
  fetchImpl:async url=>{calls++;return response(url);}});
 assert.equal(calls,14);assert.equal(result.projectionStatus,'READY_PRIVATE');
 assert.equal(result.projectionCount,14);
 assert.equal(db.data.get(EARNINGS_API_R30_PRIVATE_KEY).body.events.length,14);
 assert.equal(db.data.get(EARNINGS_API_R30_PRIVATE_KEY).body.publicDisplay,false);
 assert.ok([...db.data.values()].every(v=>!JSON.stringify(v).includes('local-private-secret')));
 const again=await collectEarningsApiLocal({store:db.store,apiKey:'local-private-secret',now:now+60000,
  fetchImpl:()=>{throw Error('NO_REPEAT_API');}});
 assert.equal(again.providerRequests,0);assert.equal(again.skipped,true);
 assert.equal(calls,14);
});

test('R30 whole-window replacement removes obsolete date when vendor revises it',async()=>{
 const db=local();seed(db);
 const original=await readEarningsApiPrivateProjection({store:db.store,sourceState:sourceState(15),now});
 assert.ok(original.events.some(e=>e.id===`earnings-vendor-googl-${days[0]}`));
 const first=JSON.parse(db.data.get(`release-calendar:earnings-api:${days[0]}`).body.text);
 first.after=[];db.data.get(`release-calendar:earnings-api:${days[0]}`).body.text=JSON.stringify(first);
 const second=JSON.parse(db.data.get(`release-calendar:earnings-api:${days[1]}`).body.text);
 second.after=[{symbol:'GOOGL',name:'Alphabet Inc.'}];
 db.data.get(`release-calendar:earnings-api:${days[1]}`).body.text=JSON.stringify(second);
 const revised=await readEarningsApiPrivateProjection({store:db.store,sourceState:sourceState(15),now});
 assert.ok(!revised.events.some(e=>e.id===`earnings-vendor-googl-${days[0]}`));
 assert.ok(revised.events.some(e=>e.id===`earnings-vendor-googl-${days[1]}`));
});
