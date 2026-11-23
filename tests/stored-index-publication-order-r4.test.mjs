import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {acceptsStoredUpdate,REFRESH_INTERVAL_MS} from '../lib/market-score/live-refresh.mjs';
import {nextStoredIndexPublicationOrder} from '../lib/market-score/stored-index-publication-order-r4.mjs';
import {earningsProjectionReason} from '../lib/earnings-info-projection-status-r1.mjs';

const iso=minute=>`2026-11-18T${minute}:00.000Z`;
const body=(score,updatedAt,observedAt='2026-11-18')=>({status:'READY',observedAt,updatedAt,score});
const response=(data,{publishedAt=null,sourceAt=null}={})=>({
 ok:true,status:200,headers:new Headers({
  ...(publishedAt?{'x-projection-published-at':publishedAt}:{}),
  ...(sourceAt?{'x-projection-source-at':sourceAt}:{}),
 }),json:async()=>data,
});

// Evaluate the actual TypeScript hook with injected React state and read-only
// stored GET fixtures; no browser, source collection, Writer, or D1 writes.
const hookSource=readFileSync(new URL('../components/use-stored-index.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(hookSource,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function harness(outputs,{url='/api/earnings-recession-indicators',exposeProjectionReason=false}={}){
 const states=[],fetches=[];
 let refresh=null,stop=null;
 const react={
  useState(initial){const key=states.length;states.push(initial);return [initial,next=>{states[key]=typeof next==='function'?next(states[key]):next;}];},
  useEffect(fn){stop=fn();},
  startTransition(fn){fn();},
 };
 const require=(path)=>{
  if(path==='react')return react;
  if(path==='../lib/market-score/live-refresh.mjs')return {
   acceptsStoredUpdate,
   startStoredRefresh(fn){refresh=fn;return ()=>{};},
  };
  if(path==='../lib/market-score/stored-index-publication-order-r4.mjs')return {nextStoredIndexPublicationOrder};
  if(path==='../lib/earnings-info-projection-status-r1.mjs')return {earningsProjectionReason};
  throw Error('UNEXPECTED_IMPORT:'+path);
 };
 const expectedUrl=url;
 const fetch=async(url,options)=>{
  assert.equal(url,expectedUrl);
  assert.equal(options.cache,'no-store');
  assert.ok(options.signal instanceof AbortSignal);
  const current=outputs[fetches.length];
  assert.ok(current,'unexpected extra fetch');
  fetches.push(current);
  return current;
 };
 const exports={};
 const useStoredIndex=new Function('require','exports','fetch',compiled+'\nreturn exports.useStoredIndex;')(require,exports,fetch);
 useStoredIndex(url,null,true,exposeProjectionReason);
 assert.ok(refresh,'hook must attach the stored-refresh callback');
 return {
  step:async()=>{await refresh(new AbortController().signal);return {payload:states[0],loading:states[1],error:states[2],publishedAt:states[3]};},
  called:()=>fetches.length,
  cleanup:()=>stop?.(),
 };
}

test('W06: newer publication with older source clock reaches card; older or missing publication does not',async()=>{
 const releases=[
  response(body(53,iso('12:00')),{publishedAt:iso('12:00'),sourceAt:iso('11:00')}),
  response(body(54,iso('12:05')),{publishedAt:iso('12:05'),sourceAt:iso('10:00')}),
  response(body(55,iso('12:06')),{publishedAt:iso('12:04'),sourceAt:iso('13:00')}),
  response(body(56,iso('12:07')),{sourceAt:iso('15:00')}),
  response(body(0,iso('12:10')),{publishedAt:iso('12:10'),sourceAt:iso('09:00')}),
  response(body(61,iso('12:11'),'2026-11-17'),{publishedAt:iso('12:11'),sourceAt:iso('16:00')}),
 ];
 const h=harness(releases);
 const first=await h.step();
 assert.equal(first.payload.score,53);
 assert.equal(first.publishedAt,iso('12:00'));
 assert.equal(first.loading,false);
 const corrected=await h.step();
 assert.equal(corrected.payload.score,54,'newly published correction must not be blocked by older source time');
 assert.equal(corrected.publishedAt,iso('12:05'));
 assert.equal((await h.step()).payload.score,54,'older published event must not win despite newer source clock');
 assert.equal((await h.step()).payload.score,54,'missing explicit published stamp must not replace verified event');
 const zero=await h.step();
 assert.equal(zero.payload.score,0,'legitimate new score zero is retained');
 assert.equal(zero.publishedAt,iso('12:10'));
 assert.equal((await h.step()).payload.score,0,'new publication cannot regress to older observation date');
 assert.equal(h.called(),6);
 h.cleanup();
});

test('legacy source-only feeds keep source ordering without pretending a publication timestamp',async()=>{
 const h=harness([
  response(body(52,iso('12:00')),{sourceAt:iso('11:00')}),
  response(body(53,iso('12:05')),{sourceAt:iso('10:00')}),
  response(body(0,iso('12:10')),{sourceAt:iso('12:00')}),
 ]);
 assert.equal((await h.step()).payload.score,52);
 assert.equal((await h.step()).payload.score,52);
 const latest=await h.step();
 assert.equal(latest.payload.score,0);
 assert.equal(latest.publishedAt,null);
 h.cleanup();
});

test('separate header clocks and 60-second scheduler contract stay intact',()=>{
 assert.equal(REFRESH_INTERVAL_MS,60000);
 let point=nextStoredIndexPublicationOrder(null,{publishedAt:iso('12:00'),snapshotAt:iso('11:00')});
 point=nextStoredIndexPublicationOrder(point,{publishedAt:iso('12:00'),snapshotAt:iso('10:00')});
 assert.ok(point,'same publication time may contain verified revision');
 assert.equal(nextStoredIndexPublicationOrder(point,{publishedAt:'2026-11-18T11:59:00.000Z',snapshotAt:iso('14:00')}),null);
 assert.equal(nextStoredIndexPublicationOrder(point,{publishedAt:null,snapshotAt:iso('15:00')}),null);
 assert.equal(nextStoredIndexPublicationOrder(null,{publishedAt:null,snapshotAt:null}).publication,null);
});

const server503=reason=>({ok:false,status:503,
 headers:new Headers(),json:async()=>({status:'unavailable',reason})});

test('W06 opt-in BEA/QFR 503 reasons retain last valid, expire stale and recover on verified 200',async()=>{
 const h=harness([
  response(body(12,iso('12:00')),{publishedAt:iso('12:00'),sourceAt:iso('11:00')}),
  server503('STORED_PROJECTION_PENDING'),
  server503('PROJECTION_READ_UNAVAILABLE'),
  server503('SOURCE_RETRIEVAL_EXPIRED'),
  response(body(13,iso('12:10')),{publishedAt:iso('12:10'),sourceAt:iso('12:09')}),
 ],{url:'/api/earnings-recession-bea-unit-profit',exposeProjectionReason:true});
 assert.equal((await h.step()).payload.score,12);
 const pending=await h.step();
 assert.equal(pending.payload.score,12);
 assert.equal(pending.error,'STORED_PROJECTION_PENDING');
 const unavailable=await h.step();
 assert.equal(unavailable.payload.score,12);
 assert.equal(unavailable.error,'PROJECTION_READ_UNAVAILABLE');
 const stale=await h.step();
 assert.equal(stale.payload,null,'expired payload must not be displayed as current');
 assert.equal(stale.publishedAt,null);
 assert.equal(stale.error,'SOURCE_RETRIEVAL_EXPIRED');
 const restored=await h.step();
 assert.equal(restored.payload.score,13);
 assert.equal(restored.error,null);
 assert.equal(restored.publishedAt,iso('12:10'));
 h.cleanup();
});

test('non-opt-in hook callers never expose BEA/QFR 503 reasons',async()=>{
 const h=harness([server503('STORED_PROJECTION_INVALID')]);
 const r=await h.step();
 assert.equal(r.error,'UPDATE_FAILED');
 assert.equal(r.payload,null);
 h.cleanup();
});
