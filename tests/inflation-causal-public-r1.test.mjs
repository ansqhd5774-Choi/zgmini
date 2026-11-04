import assert from 'node:assert/strict';
import test from 'node:test';
import {INFLATION_CAUSAL_19} from '../lib/inflation-causal-public-catalog.mjs';
import {INFLATION_CAUSAL_PUBLIC_KEY,INFLATION_CAUSAL_PUBLIC_ROUTE,
 INFLATION_CAUSAL_PUBLIC_SCHEMA,validateInflationCausalPublic,
 readInflationCausalPublicResponse,inflationCausalPublicWriter} from '../worker/inflation-causal-public-r1.mjs';

const savedAt=Date.parse('2026-11-04T10:00:00Z');
const row=m=>({id:m.id,series:m.series,unit:m.unit,status:'PENDING',
 value:null,previousValue:null,observationDate:null,previousObservationDate:null,
 availableAt:null,sourceStoredAt:null,history:[]});
const payload=()=>({schemaVersion:INFLATION_CAUSAL_PUBLIC_SCHEMA,status:'PARTIAL',
 score:null,sourceVersion:'RESEARCH_PUBLIC_R1_SHA_TEST',sourceStoredAt:savedAt-3600000,
 indicators:INFLATION_CAUSAL_19.map(row)});
const ready=r=>({...r,status:'READY',value:0,previousValue:2,
 observationDate:'2026-09',previousObservationDate:'2026-08',
 availableAt:'2026-10-01T00:00:00Z',sourceStoredAt:'2026-10-02T00:00:00Z',
 history:[{date:'2026-08',value:2},{date:'2026-09',value:0}]});

test('catalog has 19 unique original candidate IDs; 20 and duplicate 27 not included',()=>{
 assert.equal(INFLATION_CAUSAL_19.length,19);
 assert.equal(new Set(INFLATION_CAUSAL_19.map(r=>r.id)).size,19);
 assert.equal(new Set(INFLATION_CAUSAL_19.map(r=>r.series)).size,19);
 assert.equal(INFLATION_CAUSAL_19.some(r=>r.id==='20'||r.id==='27'),false);
});
test('PENDING is valid coverage and does not manufacture raw values or scores',()=>{
 const p=payload();assert.equal(validateInflationCausalPublic(p,{now:savedAt}).status,'PARTIAL');
 assert.equal(p.score,null);assert(p.indicators.every(r=>r.value===null));
});
test('one real zero observation remains a valid value, not missing',()=>{
 const p=payload();p.indicators[0]=ready(p.indicators[0]);
 assert.equal(validateInflationCausalPublic(p,{now:savedAt}).indicators[0].value,0);
});
test('READY requires all 19 actual values; cannot pretend full coverage',()=>{
 const p=payload();p.status='READY';
 assert.throws(()=>validateInflationCausalPublic(p,{now:savedAt}),/COVERAGE_INVALID/);
 p.indicators=p.indicators.map(ready);
 assert.equal(validateInflationCausalPublic(p,{now:savedAt}).status,'READY');
});
test('unknown series, wrong unit, raw leak and duplicate identity are rejected',()=>{
 const p=payload();
 const cases=[{...p,indicators:p.indicators.map((r,i)=>i===0?{...r,id:'20'}:r)},
  {...p,indicators:p.indicators.map((r,i)=>i===0?{...r,unit:'%' }:r)},
  {...p,indicators:p.indicators.map((r,i)=>i===0?{...r,rawArchive:'secret'}:r)},
  {...p,indicators:p.indicators.map((r,i)=>i===0?{...r,value:123}:r)}];
 for(const doc of cases)assert.throws(()=>validateInflationCausalPublic(doc,{now:savedAt}));
});
test('source version and timestamp cannot claim future or unknown lineage',()=>{
 assert.throws(()=>validateInflationCausalPublic({...payload(),sourceStoredAt:savedAt+1},{now:savedAt}));
 assert.throws(()=>validateInflationCausalPublic({...payload(),sourceVersion:'x'},{now:savedAt}));
});
function fakeDb(){
 let saved=null;const calls=[];
 return {
  calls,
  prepare(sql){
   return {
    bind(...params){
     calls.push({sql,params});
     return {
      async first(){return saved;},
      async run(){saved={body:params[1],stored_at:params[2]};return {meta:{changes:1}};}
     };
    }
   };
  }
 };
}
test('GET/HEAD only read the independent D1 key; never call providers',async()=>{
 const db=fakeDb(),url='https://example.test'+INFLATION_CAUSAL_PUBLIC_ROUTE;
 const get=await readInflationCausalPublicResponse(new Request(url),db);
 assert.equal(get.status,200);assert.equal((await get.json()).status,'PENDING');
 assert.equal(db.calls.length,1);
 assert.equal(db.calls[0].params[0],INFLATION_CAUSAL_PUBLIC_KEY);
 const head=await readInflationCausalPublicResponse(new Request(url,{method:'HEAD'}),db);
 assert.equal(head.status,200);assert.equal(await head.text(),'');
 const post=await readInflationCausalPublicResponse(new Request(url,{method:'POST'}),db);
 assert.equal(post.status,405);
 const query=await readInflationCausalPublicResponse(new Request(url+'?evil=1'),db);
 assert.equal(query.status,400);
});
test('writer stores only approved sidecar key with readback; repeated checkpoint remains idempotent',async()=>{
 const db=fakeDb(),p=payload();
 const result=await inflationCausalPublicWriter(db).write(p,{storedAt:savedAt});
 assert.equal(result.status,'READBACK_VERIFIED');assert.equal(result.key,INFLATION_CAUSAL_PUBLIC_KEY);
 const response=await readInflationCausalPublicResponse(
  new Request('https://example.test'+INFLATION_CAUSAL_PUBLIC_ROUTE),db,{now:savedAt});
 assert.equal(response.status,200);assert.equal((await response.json()).status,'PARTIAL');
 const again=await inflationCausalPublicWriter(db).write(p,{storedAt:savedAt+1000});
 assert.equal(again.status,'ALREADY_STORED');
 const modified=payload();modified.indicators[0]=ready(modified.indicators[0]);
 await assert.rejects(()=>inflationCausalPublicWriter(db).write(modified,{storedAt:savedAt+1000}),
  /CHECKPOINT_CONFLICT/);
});
