import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {CNN_OBSERVED_ARCHIVE_KEY,CNN_OBSERVED_ARCHIVE_VERSION} from '../lib/cnn-observed-archive-r1.mjs';
import {sampleCnnObservedPoints,projectCnnObservedPeriodPoints} from '../lib/cnn-observed-sampling-r1.mjs';
import {addStoredCnnObservation,addStoredCnnVerifiedCheck} from '../lib/cnn-observed-reader-integrity-r1.mjs';

// Exercise the real Cloudflare GET source against two SELECT-only D1 result
// collections. Do not call CNN or mutate stored archive/checkpoint content.
const now=Date.parse('2026-11-17T00:00:00.000Z');
const routeText=readFileSync(new URL('../app/api/fear-greed/observations/route.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(routeText.replace(/^import [^\n]*\n/gm,''),{
 compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
}).outputText;
class Clock extends Date{static now(){return now;}}
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

function harness({stored=[],verified=[]}={}){
 const queries=[];
 const env={DB:{prepare(sql){
  assert.match(sql,/^SELECT snapshot_key,body FROM public_feed_snapshots_v1/);
  assert.doesNotMatch(sql,/INSERT|UPDATE|DELETE|ALTER|DROP|CREATE/i);
  return {bind(...params){return {async all(){
   queries.push({sql,params});
   const rows=sql.includes("feed_key='fear-greed-verified-checks'")?verified:stored;
   const from=params.at(-2),to=params.at(-1);
   return {results:rows.filter(x=>x.snapshot_key>=from&&x.snapshot_key<=to).slice(0,371)};
  }};}};
 }}};
 const exports={};
 const GET=new Function('exports','env','CNN_OBSERVED_ARCHIVE_KEY',
  'CNN_OBSERVED_ARCHIVE_VERSION','sampleCnnObservedPoints',
  'projectCnnObservedPeriodPoints','addStoredCnnObservation','addStoredCnnVerifiedCheck','Date','Response','URL',
  compiled+'\nreturn exports.GET;')(
  exports,env,CNN_OBSERVED_ARCHIVE_KEY,CNN_OBSERVED_ARCHIVE_VERSION,
  sampleCnnObservedPoints,projectCnnObservedPeriodPoints,addStoredCnnObservation,addStoredCnnVerifiedCheck,
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


test('R2 1M: index-based sampling cannot substitute the last real source in each 5-hour interval',async()=>{
 const base=Date.parse('2026-11-10T00:00:00.000Z');
 const original=Array.from({length:4000},(_,i)=>({
  observedAt:new Date(base+i*60000).toISOString(),
  score:[19,80,26,70][i%4],
 }));
 const byDay=new Map();
 for(const point of original){
  const date=point.observedAt.slice(0,10);
  const list=byDay.get(date)??[];
  list.push(point);byDay.set(date,list);
 }
 const stored=[...byDay].map(([date,points])=>archive(date,points));
 const {GET,queries}=harness({stored});
 const response=await GET(request('1M'));
 assert.equal(response.status,200);
 const actual=await response.json();
 assert.equal(actual.status,'READY');
 assert.equal(actual.totalObservedPoints,original.length);
 assert.equal(actual.sampled,true);
 assert.equal(queries.length,2,'the GET only reads public archive and PC check rows');
 const lastByBucket=new Map();
 for(const p of original)lastByBucket.set(Math.floor(Date.parse(p.observedAt)/(300*60000)),p);
 const expected=[...lastByBucket.values()].map(p=>p.observedAt);
 assert.deepEqual(actual.points.map(p=>p.observedAt),expected,
  'every returned 5-hour bucket must end at its real last source observedAt');
 assert.deepEqual(actual.points.map(p=>p.score),[...lastByBucket.values()].map(p=>p.score));
 assert.equal(actual.points.at(-1).observedAt,original.at(-1).observedAt);
 // Reproduce why index-extrema sampling used by other feeds is inappropriate here.
 const extrema=sampleCnnObservedPoints(original);
 const wrongByBucket=new Map();
 for(const p of extrema)wrongByBucket.set(Math.floor(Date.parse(p.observedAt)/(300*60000)),p);
 assert.ok(expected.some((at,i)=>wrongByBucket.get([...lastByBucket.keys()][i])?.observedAt!==at),
  'the former pipeline can discard exact last-of-interval observations');
 assert.deepEqual(original.at(-1),{observedAt:expected.at(-1),score:actual.points.at(-1).score});
});

test('R2 3M, 6M, 1Y: each New York day keeps the last real source across UTC midnight',async()=>{
 const source=[
  {observedAt:'2026-11-15T23:30:00.000Z',score:16},
  {observedAt:'2026-11-16T01:30:00.000Z',score:17},
  {observedAt:'2026-11-16T14:00:00.000Z',score:18},
  {observedAt:'2026-11-16T23:30:00.000Z',score:0},
 ];
 const stored=[
  archive('2026-11-15',source.slice(0,1)),
  archive('2026-11-16',source.slice(1)),
 ];
 for(const period of ['3M','6M','1Y']){
  const response=await harness({stored}).GET(request(period));
  assert.equal(response.status,200);
  const data=await response.json();
  assert.deepEqual(data.points.map(p=>p.observedAt),[source[1].observedAt,source[3].observedAt],
   period+' day boundary is America/New_York, not UTC midnight');
  assert.deepEqual(data.points.map(p=>p.score),[17,0],period+' must preserve real zero');
  assert.equal(data.totalObservedPoints,4);
  assert.equal(data.sampled,true);
  assert.deepEqual(data.checkedPoints,[]);
 }
 // Explicit <=7d historical lookups remain unsampled, regardless of the period button.
 const customRequest=new Request('https://zgmini.kr/api/fear-greed/observations?period=3M&from=2026-11-15&to=2026-11-16');
 const custom=await (await harness({stored}).GET(customRequest)).json();
 assert.deepEqual(custom.points.map(p=>p.observedAt),source.map(p=>p.observedAt));
 assert.equal(custom.sampled,false);
});
