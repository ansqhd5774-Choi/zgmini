import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {sampleCnnObservedPoints} from '../lib/cnn-observed-sampling-r1.mjs';
import {COMPOSITE_OBSERVED_PREFIX,COMPOSITE_OBSERVED_VERSION} from '../lib/composite-observed-history-r1.mjs';

const now=Date.parse('2026-11-16T13:00:00.000Z');
const source=readFileSync(new URL('../app/api/market-score/observations/route.ts',import.meta.url),'utf8');
// Compile the actual Cloudflare route with only its three imports dependency-
// injected: this tests the production GET implementation without touching D1.
const compiled=ts.transpileModule(source.replace(/^import [^\n]*\n/gm,''),{
 compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
}).outputText;
class Clock extends Date{static now(){return now;}}
const key='composite-observed:2026-11-16';
const point=(clock,score,asOfDate='2026-11-16')=>({calculatedAt:'2026-11-16T'+clock+'Z',score,asOfDate,signature:'fixture'});
const archive=(date,points)=>({snapshot_key:COMPOSITE_OBSERVED_PREFIX+date,body:JSON.stringify({
 version:COMPOSITE_OBSERVED_VERSION,date,points,
})});
function harness(rows=[]){
 const reads=[];
 const env={DB:{prepare(sql){
  assert.match(sql,/^SELECT snapshot_key,body FROM market_public_snapshots_v1 WHERE snapshot_key BETWEEN/);
  assert.doesNotMatch(sql,/INSERT|UPDATE|DELETE/);
  return {bind(from,to){return {async all(){
   reads.push({from,to});
   return {results:rows.filter(row=>row.snapshot_key>=from&&row.snapshot_key<=to).slice(0,371)};
  }};}};
 }}};
 const exports={};
 const GET=new Function('exports','env','COMPOSITE_OBSERVED_PREFIX','COMPOSITE_OBSERVED_VERSION','sampleCnnObservedPoints','Date','Response','URL',
  compiled+'\nreturn exports.GET;')(exports,env,COMPOSITE_OBSERVED_PREFIX,COMPOSITE_OBSERVED_VERSION,sampleCnnObservedPoints,Clock,Response,URL);
 return {GET,reads};
}
const req=period=>new Request('https://zgmini.kr/api/market-score/observations?period='+period);

test('R4 #26: 1D GET returns genuine 50→53→56 calculation points in timestamp order',async()=>{
 const stored=archive('2026-11-16',[point('12:10:00',56),point('12:00:00',50),point('12:05:00',53)]);
 const {GET,reads}=harness([stored]);
 const response=await GET(req('1D'));
 assert.equal(response.status,200);
 const data=await response.json();
 assert.equal(data.status,'READY');
 assert.equal(data.availableDays,1);
 assert.equal(data.totalObservedPoints,3);
 assert.equal(data.sampled,false);
 assert.equal(data.timeMeaning,'PC_CALCULATED_AT');
 assert.deepEqual(data.points.map(x=>x.score),[50,53,56]);
 assert.deepEqual(data.points.map(x=>x.observedAt),['2026-11-16T12:00:00.000Z','2026-11-16T12:05:00.000Z','2026-11-16T12:10:00.000Z']);
 assert.equal(reads.length,1);
});
test('R4 #26: identical replay at same calculation instant is idempotent',async()=>{
 const stored=archive('2026-11-16',[point('12:00:00',50),point('12:00:00',50)]);
 const data=await (await harness([stored]).GET(req('1D'))).json();
 assert.deepEqual(data.points.map(x=>x.score),[50]);
 assert.equal(data.totalObservedPoints,1);
});
test('R4 #26: conflicting scores at one calculation instant are not silently overwritten',async()=>{
 const stored=archive('2026-11-16',[point('12:00:00',50),point('12:00:00',55)]);
 const response=await harness([stored]).GET(req('1D'));
 assert.equal(response.status,503);
 assert.equal((await response.json()).status,'INVALID_STORED_SCORE');
});
test('R4 #26: conflicting observation dates at one instant also fail closed',async()=>{
 const stored=archive('2026-11-16',[point('12:00:00',50),point('12:00:00',50,'2026-10-01')]);
 const response=await harness([stored]).GET(req('1D'));
 assert.equal(response.status,503);
});
test('R4 #26: future points outside existing five-minute clock allowance fail closed',async()=>{
 const response=await harness([archive('2026-11-16',[point('13:06:00',56)])]).GET(req('1D'));
 assert.equal(response.status,503);
 assert.equal((await response.json()).status,'INVALID_STORED_SCORE');
});
test('R4 #26: negative, null, nonnumeric and out-of-range scores are not invented',async()=>{
 for(const score of [null,-1,101,'50']){
  const response=await harness([archive('2026-11-16',[point('12:00:00',score)])]).GET(req('1D'));
  assert.equal(response.status,503);
 }
});
test('R4 #33: missing archive is PENDING and never triggers calculation/provider calls',async()=>{
 const {GET,reads}=harness([]);
 const response=await GET(req('1D'));
 assert.equal(response.status,200);
 assert.equal((await response.json()).status,'PENDING');
 assert.equal(reads.length,1);
});
test('R4 #26: invalid period is rejected before any storage read',async()=>{
 const {GET,reads}=harness([]);
 const response=await GET(req('5Y'));
 assert.equal(response.status,400);
 assert.deepEqual(reads,[]);
});
test('R4 #26: 1W returns ordered actual observations across two distinct days',async()=>{
 const rows=[archive('2026-11-16',[point('12:05:00',56)]),archive('2026-11-15',[{
  calculatedAt:'2026-11-15T12:05:00Z',score:50,asOfDate:'2026-11-15',signature:'fixture',
 }])];
 const data=await (await harness(rows).GET(req('1W'))).json();
 assert.deepEqual(data.points.map(x=>x.score),[50,56]);
 assert.equal(data.availableDays,2);
});

test('R4 #26: stored source day must be a real, canonical UTC calendar date',async()=>{
 const invalid=['2026-02-30','2026-11-31','2026-13-01','2026-00-01',
  '20261116','2026-11-16T00:00:00Z',' 2026-11-16','2026-11-16 '];
 for(const asOfDate of invalid){
  const response=await harness([archive('2026-11-16',[point('12:00:00',50,asOfDate)])]).GET(req('1D'));
  assert.equal(response.status,503,asOfDate);
  assert.equal((await response.json()).status,'INVALID_STORED_SCORE',asOfDate);
 }
});

test('R4 #26: untrusted asOfDate types cannot be silently replaced by null',async()=>{
 for(const asOfDate of [20261116,0,true,[],{},['2026-11-16']]){
  const response=await harness([archive('2026-11-16',[point('12:00:00',50,asOfDate)])]).GET(req('1D'));
  assert.equal(response.status,503,JSON.stringify(asOfDate));
  assert.equal((await response.json()).status,'INVALID_STORED_SCORE');
 }
});

test('R4 #26: asOfDate after the actual UTC calculation day is rejected',async()=>{
 for(const asOfDate of ['2026-11-17','2026-11-18','2026-12-01','2099-01-01']){
  const response=await harness([archive('2026-11-16',[point('12:55:00',50,asOfDate)])]).GET(req('1D'));
  assert.equal(response.status,503,asOfDate);
 }
});

test('R4 #26: valid source dates include past revisions, calculation day and zero',async()=>{
 const rows=[archive('2026-11-16',[
  point('12:00:00',0,'2026-10-31'),
  point('12:15:00',51,'2026-11-15'),
  point('12:55:00',52,'2026-11-16'),
 ])];
 const response=await harness(rows).GET(req('1D'));
 assert.equal(response.status,200);
 const data=await response.json();
 assert.equal(data.status,'READY');
 assert.deepEqual(data.points.map(p=>p.score),[0,51,52]);
 assert.deepEqual(data.points.map(p=>p.asOfDate),['2026-10-31','2026-11-15','2026-11-16']);
});

test('R4 #26: missing and null source dates remain explicit null without inventing one',async()=>{
 const rows=[archive('2026-11-16',[
  {...point('12:00:00',0),asOfDate:null},
  {...point('12:15:00',50),asOfDate:undefined},
 ])];
 const response=await harness(rows).GET(req('1D'));
 assert.equal(response.status,200);
 const data=await response.json();
 assert.equal(data.status,'READY');
 assert.deepEqual(data.points.map(p=>p.asOfDate),[null,null]);
});

test('R4 #26: one corrupt date rejects the entire stored range, not partial points',async()=>{
 const response=await harness([archive('2026-11-16',[
  point('12:00:00',0,'2026-11-16'),
  point('12:15:00',50,'2026-02-31'),
 ])]).GET(req('1D'));
 assert.equal(response.status,503);
 assert.deepEqual(await response.json(),{status:'INVALID_STORED_SCORE'});
});

test('R4 #26: identical score replay with conflicting valid source days still fails closed',async()=>{
 const response=await harness([archive('2026-11-16',[
  point('12:00:00',50,'2026-11-15'),
  point('12:00:00',50,'2026-11-16'),
 ])]).GET(req('1D'));
 assert.equal(response.status,503);
});
