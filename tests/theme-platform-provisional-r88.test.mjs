import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {calculateStoredR88} from '../scripts/pc-writer/theme-platform-provisional-r88.mjs';
import {R88_VERSION,R88_PRICE_MODE,R88_PUBLIC_ROSTER} from
 '../worker/theme-nine-r88-provisional.mjs';
import {THEME_NINE_R37_METHOD,THEME_NINE_R37_VERSION} from
 '../worker/theme-nine-r37-public.mjs';

const asOf='2026-10-30T06:59:59.000Z';
const observed=new Date('2026-10-30T07:00:00.000Z');
const base=()=>({status:'READY',modelRevision:THEME_NINE_R37_VERSION,
 methodologyVersion:THEME_NINE_R37_METHOD,r32ProvisionalReaderVersion:R88_VERSION,
 confirmedObservationDate:'2026-10-28'});
const context=()=>({replayContext:{
 scores:{source:{latestSpySessionDate:'2026-10-28'}},
 evidence:{roster:{groups:[]}},sessions:new Map([['SPY',[]]])}});
const record=()=>({status:'READY',version:R88_VERSION,phase:'PROVISIONAL',
 methodologyVersion:THEME_NINE_R37_METHOD,sourcePriceMode:R88_PRICE_MODE,
 confirmedObservationDate:'2026-10-28',observationDate:'2026-10-29',
 sourceVersion:'d'.repeat(64),asOf,sourceStoredAt:asOf,
 themes:R88_PUBLIC_ROSTER.map(t=>({theme:t.theme,
  approvedEtfs:t.etfs,points:[{date:'2026-10-29',score:52}]}))});
function setup(t,candidate=record()){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'zg-theme-r88-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const dir=path.join(root,'themes','legacy-nine-r88-provisional');
 fs.mkdirSync(dir,{recursive:true});
 const bytes=Buffer.from(JSON.stringify(candidate,null,2)+'\n');
 const sha=createHash('sha256').update(bytes).digest('hex');
 const file=path.join(dir,`THEME_NINE_R88_PROVISIONAL_${candidate.observationDate}_${sha}.json`);
 fs.writeFileSync(file,bytes);
 fs.utimesSync(file,new Date(asOf),new Date(asOf));
 return {root,dir,file,sha};
}
const injections=(candidate=record())=>({
 readSaved:async({dates})=>{
  assert.deepEqual(dates,['2026-10-28','2026-10-29']);
  return {rows:new Map(),hashes:new Map(),sourceStoredAt:asOf};
 },
 compile:()=>({source:'MARKETPARQUET_ETF_DAILY_SPLIT_ADJUSTED'}),
 calculate:({base:publicBase,now})=>{
  assert.equal(publicBase.modelRevision,THEME_NINE_R37_VERSION);
  assert.equal(now,Date.parse(asOf));
  return candidate;
 },
 validate:(candidate,publicBase,{now,storedAt})=>{
  assert.equal(now,Date.parse(asOf));
  assert.equal(storedAt,Date.parse(asOf));
  return true;
 }});

test('replays one immutable R32 provisional artifact for all eight themes without provider or D1 calls',async t=>{
 const {root,sha,dir}=setup(t);
 const initial=fs.readdirSync(dir);
 const result=await calculateStoredR88({dataRoot:root,publicBase:base(),
  confirmedResult:context(),now:observed,...injections()});
 assert.equal(result.artifactSha256,sha);
 assert.equal(result.currentVisibility,'UNKNOWN_D1_STORED_AT_NOT_READ');
 assert.equal(result.rows.length,8);
 assert.deepEqual(result.rows.map(r=>r.label),R88_PUBLIC_ROSTER.map(r=>r.theme));
 assert.equal(result.rows.every(r=>r.methodologyVersion===THEME_NINE_R37_METHOD&&
  r.observationDate==='2026-10-29'&&r.confirmedObservationDate==='2026-10-28'),true);
 assert.deepEqual(fs.readdirSync(dir),initial);
});

test('historical R88 replay remains verified after eight-day Reader freshness expires',async t=>{
 const {root,sha}=setup(t);
 const result=await calculateStoredR88({dataRoot:root,publicBase:base(),
  confirmedResult:context(),now:new Date('2026-11-20T07:00:00Z'),...injections()});
 assert.equal(result.artifactSha256,sha);
 assert.equal(result.rows.length,8);
 assert.equal(result.currentVisibility,'UNKNOWN_D1_STORED_AT_NOT_READ');
 assert.equal(result.historicalReaderContract,'SHAPE_VERIFIED_WITH_REPLAY_CLOCK');
});

test('blocks legacy PAIR50 base, missing public base and missing cached R47 context',async t=>{
 const {root}=setup(t);
 await assert.rejects(calculateStoredR88({dataRoot:root,publicBase:null,
  confirmedResult:context(),now:observed,...injections()}),/PUBLIC_CONFIRMED_R32_BASE_REQUIRED/);
 await assert.rejects(calculateStoredR88({dataRoot:root,publicBase:{...base(),
  methodologyVersion:'ETF_ONLY_T40_R20_V40_PAIR50'},
  confirmedResult:context(),now:observed,...injections()}),/PUBLIC_CONFIRMED_R32_BASE_REQUIRED/);
 await assert.rejects(calculateStoredR88({dataRoot:root,publicBase:base(),
  confirmedResult:{},now:observed,...injections()}),/CONFIRMED_REPLAY_CONTEXT_REQUIRED/);
});

test('fails closed for mutated saved bytes and changed recalculated score',async t=>{
 const {root,file}=setup(t);
 const altered=record();altered.themes[0].points[0].score=53;
 await assert.rejects(calculateStoredR88({dataRoot:root,publicBase:base(),
  confirmedResult:context(),now:observed,...injections(altered)}),
  /SAVED_CANDIDATE_REPLAY_MISMATCH/);
 fs.appendFileSync(file,' ');
 await assert.rejects(calculateStoredR88({dataRoot:root,publicBase:base(),
  confirmedResult:context(),now:observed,...injections()}),
  /CANDIDATE_FILENAME_SHA_MISMATCH/);
});
