import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {CNN_OBSERVED_ARCHIVE_KEY,CNN_OBSERVED_ARCHIVE_VERSION} from '../lib/cnn-observed-archive-r1.mjs';
import {sampleCnnObservedPoints} from '../lib/cnn-observed-sampling-r1.mjs';
import {addStoredCnnObservation,addStoredCnnVerifiedCheck} from '../lib/cnn-observed-reader-integrity-r1.mjs';

// Exercise the real Cloudflare GET source against two SELECT-only D1 result
// collections. Do not call CNN or mutate stored archive/checkpoint content.
const now=Date.parse('2026-11-17T00:00:00.000Z');
const routeText=readFileSync(new URL('../app/api/fear-greed/observations/route.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(routeText.replace(/^import [^\n]*\n/gm,''),{
 compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
}).outputText;
const day='2026-11-16';
const obs=(clock,score)=>({observedAt:day+'T'+clock+'Z',score});
const check=(clock,sourceClock,score)=>({
 checkedAt:day+'T'+clock+'.000Z',
 sourceObservedAt:day+'T'+sourceClock+'.000Z',
 score,
 sourceStoredAt:Date.parse(day+'T'+clock+'.000Z'),
});
const archive=(d,observations)=>({
 snapshot_key:d,body:JSON.stringify({version:CNN_OBSERVED_ARCHIVE_VERSION,date:d,observations}),
});
const checks=(d,values)=>({
 snapshot_key:d,body:JSON.stringify({version:'CNN_VERIFIED_CHECKS_R1',date:d,checks:values}),
});

function harness({stored=[],verified=[],timeNow=now}={}){
 class Clock extends Date{static now(){return timeNow;}}
 const queries=[];
 const env={DB:{prepare(sql){
  assert.match(sql,/^SELECT snapshot_key,body FROM public_feed_snapshots_v1/);
  assert.doesNotMatch(sql,/INSERT|UPDATE|DELETE|ALTER|DROP|CREATE/i);
  return {bind(...params){return {async all(){
   queries.push({sql,params});
   const rows=sql.includes("feed_key='fear-greed-verified-checks'")?verified:stored;
   if(sql.includes('ORDER BY snapshot_key DESC LIMIT 2')||sql.includes('ORDER BY snapshot_key DESC LIMIT 371')){
    assert.deepEqual(params,[CNN_OBSERVED_ARCHIVE_KEY]);
    return {results:[...rows].sort((a,b)=>b.snapshot_key.localeCompare(a.snapshot_key))
     .slice(0,sql.includes('LIMIT 2')?2:371)};
   }
   const from=params.at(-2),to=params.at(-1);
   return {results:rows.filter(x=>x.snapshot_key>=from&&x.snapshot_key<=to).slice(0,371)};
  }};}};
 }}};
 const exports={};
 const GET=new Function('exports','env','CNN_OBSERVED_ARCHIVE_KEY',
  'CNN_OBSERVED_ARCHIVE_VERSION','sampleCnnObservedPoints',
  'addStoredCnnObservation','addStoredCnnVerifiedCheck','Date','Response','URL',
  compiled+'\nreturn exports.GET;')(
  exports,env,CNN_OBSERVED_ARCHIVE_KEY,CNN_OBSERVED_ARCHIVE_VERSION,
  sampleCnnObservedPoints,addStoredCnnObservation,addStoredCnnVerifiedCheck,
  Clock,Response,URL);
 return {GET,queries};
}
const request=(period='1D')=>new Request('https://zgmini.kr/api/fear-greed/observations?period='+period);

test('R4 #36 observed 40→41 on different original CNN timestamps yields two chart points',async()=>{
 const {GET,queries}=harness({stored:[archive(day,[obs('12:00:00',40),obs('12:05:00',41)])]});
 const response=await GET(request());
 assert.equal(response.status,200);
 assert.equal(response.headers.get('x-data-source'),'STORED');
 const body=await response.json();
 assert.deepEqual(body.points.map(p=>p.score),[40,41]);
 assert.equal(body.totalObservedPoints,2);
 assert.equal(body.verifiedCheckCount,0);
 assert.equal(queries.length,2,'one stored archive and one separate stored PC-check read');
});

test('R4 #36 exact CNN observedAt with identical score dedupes without generating a point',async()=>{
 const body=await (await harness({stored:[archive(day,[obs('12:00:00',40),obs('12:00:00',40)])]}).GET(request())).json();
 assert.equal(body.totalObservedPoints,1);
 assert.deepEqual(body.points.map(p=>p.score),[40]);
});

test('R4 #36 conflicting stored score for same CNN observedAt fails closed with 503',async()=>{
 const resp=await harness({stored:[archive(day,[obs('12:00:00',40),obs('12:00:00',41)])]}).GET(request());
 assert.equal(resp.status,503);
 assert.equal((await resp.json()).status,'STORED_ARCHIVE_INVALID');
});

test('R4 #36 official corrected archived score stored once displays exactly its new value',async()=>{
 const body=await (await harness({stored:[archive(day,[obs('12:00:00',41)])]}).GET(request())).json();
 assert.deepEqual(body.points.map(p=>p.score),[41]);
 assert.equal(body.totalObservedPoints,1);
});

test('R4 #36 PC check time is not a new CNN observation or different origin timestamp',async()=>{
 const stored=[archive(day,[obs('12:00:00',40)])];
 const verified=[checks(day,[check('12:15:00','12:00:00',40),check('12:30:00','12:00:00',40)])];
 const body=await (await harness({stored,verified}).GET(request())).json();
 assert.equal(body.status,'READY');
 assert.equal(body.totalObservedPoints,1);
 assert.equal(body.verifiedCheckCount,2);
 assert.deepEqual(body.points.map(p=>p.observedAt),[day+'T12:00:00.000Z']);
 assert.deepEqual(body.checkedPoints.map(p=>p.checkedAt),
  [day+'T12:15:00.000Z',day+'T12:30:00.000Z']);
 assert.equal(body.checkTimeMeaning,'PC_VERIFIED_STORED_AT');
});

test('R4 #36 same checkedAt with conflicting verified scores fails closed independently',async()=>{
 const resp=await harness({verified:[checks(day,[
  check('12:15:00','12:00:00',40),check('12:15:00','12:00:00',41),
 ])]}).GET(request());
 assert.equal(resp.status,503);
 assert.equal((await resp.json()).status,'STORED_CHECKS_INVALID');
});

test('R4 #36 same checkedAt with different sourceObservedAt also fails closed',async()=>{
 const resp=await harness({verified:[checks(day,[
  check('12:15:00','12:00:00',40),check('12:15:00','12:05:00',40),
 ])]}).GET(request());
 assert.equal(resp.status,503);
});

test('R4 #36 identical PC check replay is idempotent but never a CNN point',async()=>{
 const body=await (await harness({verified:[checks(day,[
  check('12:15:00','12:00:00',40),check('12:15:00','12:00:00',40),
 ])]}).GET(request())).json();
 assert.equal(body.totalObservedPoints,0);
 assert.equal(body.verifiedCheckCount,1);
 assert.equal(body.checkedPoints.length,1);
});

test('R4 #36 missing real observations remains PENDING without collection/provider calls',async()=>{
 const {GET,queries}=harness();
 const response=await GET(request());
 assert.equal(response.status,200);
 const body=await response.json();
 assert.equal(body.status,'PENDING');
 assert.deepEqual(body.points,[]);
 assert.deepEqual(body.checkedPoints,[]);
 assert.equal(queries.length,2);
});

test('R4 #36 invalid period is rejected before any D1 read',async()=>{
 const {GET,queries}=harness();
 const resp=await GET(request('5Y'));
 assert.equal(resp.status,400);
 assert.deepEqual(queries,[]);
});

test('R4 #36 invalid point cannot silently become a zero observation',async()=>{
 for(const score of [null,-1,101,'40']){
  const resp=await harness({stored:[archive(day,[obs('12:00:00',score)])]}).GET(request());
  assert.equal(resp.status,503);
 }
});

test('R4 #36 1W returns only actual sorted original source timestamps',async()=>{
 const d0='2026-11-15',d1='2026-11-16';
 const stored=[
  archive(d1,[obs('12:05:00',41)]),
  archive(d0,[{observedAt:d0+'T13:00:00Z',score:40}]),
 ];
 const body=await (await harness({stored}).GET(request('1W'))).json();
 assert.deepEqual(body.points.map(p=>p.score),[40,41]);
 assert.equal(body.availableDays,2);
});

test('W06 1D keeps last source 24h across Saturday/Sunday with independent current PC checks',async()=>{
 const friday='2026-11-13',thursday='2026-11-12',sunday='2026-11-15';
 const stored=[
  archive(thursday,[
   {observedAt:thursday+'T18:00:00.000Z',score:11},
   {observedAt:thursday+'T21:00:00.000Z',score:12},
  ]),
  archive(friday,[{observedAt:friday+'T20:00:00.000Z',score:13}]),
 ];
 const checkedAt=sunday+'T14:00:00.000Z';
 const verified=[checks(sunday,[{
  checkedAt,sourceObservedAt:friday+'T20:00:00.000Z',
  score:13,sourceStoredAt:Date.parse(checkedAt),
 }])];
 const {GET,queries}=harness({stored,verified,timeNow:Date.parse(sunday+'T19:00:00Z')});
 const result=await (await GET(request('1D'))).json();
 assert.equal(result.status,'READY');
 assert.deepEqual(result.points.map(p=>p.observedAt),[
  thursday+'T21:00:00.000Z',friday+'T20:00:00.000Z',
 ]);
 assert.deepEqual(result.points.map(p=>p.score),[12,13]);
 assert.deepEqual(result.range,{start:thursday,end:friday});
 assert.deepEqual(result.checkedPoints.map(p=>p.checkedAt),[checkedAt]);
 assert.equal(queries.length,2);
 assert.match(queries[0].sql,/ORDER BY snapshot_key DESC LIMIT 2/);
 assert.deepEqual(queries[1].params,[sunday.replace(/15$/,'14'),sunday],
  'PC verification remains wall-clock dated, not anchored to old CNN source');
});

test('W06 1D advances on next real source after multi-day closure without inventing intervening points',async()=>{
 const friday='2026-11-13',monday='2026-11-16';
 const stored=[
  archive(friday,[{observedAt:friday+'T20:00:00.000Z',score:10}]),
  archive(monday,[{observedAt:monday+'T13:00:00.000Z',score:14}]),
 ];
 const body=await (await harness({stored,timeNow:Date.parse(monday+'T14:00:00Z')}).GET(request('1D'))).json();
 assert.equal(body.status,'READY');
 assert.deepEqual(body.points.map(p=>p.observedAt),[monday+'T13:00:00.000Z']);
 assert.deepEqual(body.range,{start:'2026-11-15',end:monday});
 assert.equal(body.totalObservedPoints,1);
 const week=await (await harness({stored,timeNow:Date.parse(monday+'T14:00:00Z')}).GET(request('1W'))).json();
 assert.deepEqual(week.points.map(p=>p.score),[10,14],
  'week history still includes Friday original and Monday original');
});

test('W06 1D falls back to the last populated source day across empty holiday archive rows',async()=>{
 const friday='2026-11-27',saturday='2026-11-28',sunday='2026-11-29';
 const stored=[
  archive(friday,[{observedAt:friday+'T21:00:00.000Z',score:17.9}]),
  archive(saturday,[]),archive(sunday,[]),
 ];
 const {GET,queries}=harness({stored,timeNow:Date.parse(sunday+'T20:00:00Z')});
 const response=await GET(request('1D'));
 assert.equal(response.status,200);
 const body=await response.json();
 assert.deepEqual(body.points.map(p=>p.score),[17.9]);
 assert.equal(body.range.end,friday);
 assert.equal(queries.length,3,'fallback only for empty archives');
 assert.match(queries[1].sql,/ORDER BY snapshot_key DESC LIMIT 371/);
 assert.match(queries[2].sql,/fear-greed-verified-checks/);
});

test('W06 fallback never conceals a malformed recent public archive',async()=>{
 const friday='2026-11-27',saturday='2026-11-28',sunday='2026-11-29';
 const stored=[
  archive(friday,[{observedAt:friday+'T21:00:00.000Z',score:17.9}]),
  archive(saturday,[]),
  {snapshot_key:sunday,body:'{broken-json'},
 ];
 const response=await harness({stored,timeNow:Date.parse(sunday+'T20:00:00Z')}).GET(request('1D'));
 assert.equal(response.status,503);
 assert.equal((await response.json()).status,'STORED_ARCHIVE_INVALID');
});
