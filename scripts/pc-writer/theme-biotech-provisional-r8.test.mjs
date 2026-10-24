import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateBiotechProvisionalR8,readVerifiedMarketParquetBiotech,BIOTECH_PROVISIONAL_KEY} from './theme-biotech-provisional-r8.mjs';
import {runBiotechR8} from './theme-biotech-auto-r8.mjs';
import {biotechApprovedSevenTokenR8,R8_APPROVED_SEVEN_CORE_SHA256} from './theme-biotech-seven-auth-r8.mjs';
import {validBiotechProvisionalR1,addVerifiedBiotechProvisionalR1} from '../../worker/theme-biotech-provisional-r1.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';

const NOW=Date.parse('2026-10-24T07:00:00Z');
function fixture(){
 const days=Array.from({length:628},(_,i)=>new Date(Date.UTC(2025,1,1+i)).toISOString().slice(0,10));
 const date=days.at(-1);
 const prices=s=>Array.from({length:628},(_,i)=>s+i/12+Math.sin(i/4)*0.2);
 const tables={IBB:new Map(days.map((d,i)=>[d,prices(110)[i]])),
  XBI:new Map(days.map((d,i)=>[d,prices(90)[i]])),SPY:new Map(days.map((d,i)=>[d,prices(320)[i]]))};
 const gmh={common:days,tables,manifestSha256:'a'.repeat(64)};
 const history=days.slice(-252).map((d,i)=>({date:d,score:30+i/1000}));
 const confirmed={status:'READY',phase:'CONFIRMED',etfs:['IBB','XBI'],referenceSymbol:'SPY',
  observationDate:date,score:history.at(-1).score,history,licensingRiskAcceptedByPublisher:true};
 const previous=Object.fromEntries(['IBB','XBI','SPY'].map(s=>[s,tables[s].get(date)]));
 const date1=new Date(Date.parse(date+'T00:00:00Z')+86400000).toISOString().slice(0,10);
 const date2=new Date(Date.parse(date+'T00:00:00Z')+172800000).toISOString().slice(0,10);
 const parquet={status:'VERIFIED',dates:[
  {date,prices:previous,sourceStoredAt:new Date(NOW-3600000).toISOString(),fileSha256:'b'.repeat(64)},
  {date:date1,prices:Object.fromEntries(Object.entries(previous).map(([s,v])=>[s,v*1.005])),
   sourceStoredAt:new Date(NOW-1800000).toISOString(),fileSha256:'c'.repeat(64)},
  {date:date2,prices:Object.fromEntries(Object.entries(previous).map(([s,v])=>[s,v*1.015])),
   sourceStoredAt:new Date(NOW-1200000).toISOString(),fileSha256:'d'.repeat(64)},
 ]};
 return {confirmed,gmh,parquet};
}

test('R8 publishes only verified new biotech date-score points; confirmed 252 unchanged',()=>{
 const f=fixture(),before=JSON.stringify(f.confirmed);
 const {status,record,points}=calculateBiotechProvisionalR8({...f,now:NOW});
 assert.equal(status,'PRIVATE_PROVISIONAL_CANDIDATE');
 assert.equal(record.points.length,2);assert.equal(record.sourceFiles.length,3);
 assert.equal(record.confirmedScore,f.confirmed.score);
 assert.equal(JSON.stringify(f.confirmed),before);
 assert.ok(points.every(p=>p.date>f.confirmed.observationDate&&p.score>=0&&p.score<=100));
 assert.equal(validBiotechProvisionalR1(record,{theme:'바이오·신약',history:f.confirmed.history,score:f.confirmed.score},
  {now:NOW,storedAt:NOW}),true);
});

test('R8 rejects price-mode discontinuity and never fabricates incomplete observations',()=>{
 const f=fixture();f.parquet.dates[0].prices.XBI*=1.09;
 assert.throws(()=>calculateBiotechProvisionalR8({...f,now:NOW}),/R8_PRICE_MODES_NOT_RECONCILED/);
 const g=fixture();g.parquet.dates[1].prices.IBB=null;
 assert.throws(()=>calculateBiotechProvisionalR8({...g,now:NOW}),/R8_/);
});

test('Reader appends biotech dashed points while preserving seven original score maps',async()=>{
 const f=fixture(),{record}=calculateBiotechProvisionalR8({...f,now:NOW});
 const old={date:record.points[0].date,scores:{'로봇·자동화':64}};
 const base={status:'READY',phase:'PROVISIONAL',themes:[
  ...Array.from({length:7},(_,i)=>({theme:'seven'+i})),
  {theme:'바이오·신약',score:f.confirmed.score,history:f.confirmed.history}],
  provisional:{asOf:new Date(NOW).toISOString(),points:[old]}};
 const db={prepare:()=>({bind:()=>({first:async()=>({body:JSON.stringify(record),stored_at:NOW})})})};
 const before=JSON.stringify(base);
 const r=await addVerifiedBiotechProvisionalR1(db,base,{now:NOW});
 assert.equal(JSON.stringify(base),before);assert.deepEqual(r.themes,base.themes);
 assert.equal(r.provisional.points[0].scores['로봇·자동화'],64);
 assert.equal(r.provisional.points[0].scores['바이오·신약'],record.points[0].score);
 assert.equal(r.provisional.points[1].scores['바이오·신약'],record.points[1].score);
});

test('R8 private candidate does not write D1; publish writes only R8 key',async()=>{
 const f=fixture(),candidate=calculateBiotechProvisionalR8({...f,now:NOW});
 let writes=0;
 const db={read:async k=>k==='theme-biotech-optional-r2'?{body:f.confirmed,storedAt:NOW}:null,
  writeVersioned:async(k,p)=>{assert.equal(k,BIOTECH_PROVISIONAL_KEY);assert.equal(p.version,candidate.record.version);writes++;return {status:'WRITTEN',changes:1}}};
 const r7=async()=>({status:'NO_NEW_CONFIRMED_SESSION',providerCalls:0});
 const build=async()=>candidate;
 const p=await runBiotechR8({dataRoot:'unused',r7,db,build,now:()=>NOW});
 assert.equal(p.status,'PRIVATE_PROVISIONAL_VERIFIED_NOT_PUBLISHED');assert.equal(writes,0);
 const q=await runBiotechR8({dataRoot:'unused',r7,db,build,now:()=>NOW,allowPublish:true});
 assert.equal(q.status,'R8_D1_READBACK_VERIFIED_API_PENDING');assert.equal(writes,1);
});

test('R8 uses the approved seven-theme resolver and credential without executing its publisher',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'biotech-r8-approved-auth-'));
 const home=path.join(root,'theme-market-history-r131','marketparquet-r167');
 fs.mkdirSync(home,{recursive:true});fs.mkdirSync(path.join(root,'pc-writer'),{recursive:true});
 const original='approved-seven-core-test-fixture';
 fs.writeFileSync(path.join(home,'r179-publish-core.mjs'),original);
 fs.writeFileSync(path.join(root,'pc-writer','config.json'),JSON.stringify({
  enabled:true,collectionTarget:'pc',source:'a'.repeat(40)}));
 const events=[];
 try{
  const token=await biotechApprovedSevenTokenR8({dataRoot:root,
   expectedCoreSha256:createHash('sha256').update(original).digest('hex'),
   importer:async url=>{
    if(url.endsWith('r175-source.mjs'))return {resolvePublisherSource:(config,{auditFile})=>{
     events.push(['source',config.source,auditFile]);
     return {root:path.join(root,'approved-repo'),head:'b'.repeat(40)};
    }};
    if(url.endsWith('scripts/pc-writer/d1.mjs'))return {credential:repo=>{
     events.push(['credential',repo]);return 'fixture-token-not-logged';
    }};
    throw Error('UNEXPECTED_IMPORT');
   }});
  assert.equal(token,'fixture-token-not-logged');
  assert.deepEqual(events.map(item=>item[0]),['source','credential']);
  assert.ok(events[0][2].includes('themes'));
  assert.equal(R8_APPROVED_SEVEN_CORE_SHA256,
   'f9ea0a1bfaf52909b7a434b65ba93887f56660bc979a3cb7e0992597bc9f3b68');
  await assert.rejects(()=>biotechApprovedSevenTokenR8({dataRoot:root,importer:async()=>{
   throw Error('CORE_CHANGED_SHOULD_PREVENT_IMPORT');
  }}),/R8_APPROVED_SEVEN_CORE_CHANGED/);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('R8 injects the existing seven-theme credential into the R7 confirmed and R8 provisional writers',async()=>{
 const f=fixture(),candidate=calculateBiotechProvisionalR8({...f,now:NOW});
 const used=[],recordKeys=[];
 const db={read:async key=>key==='theme-biotech-optional-r2'?{body:f.confirmed,storedAt:NOW}:null,
  writeVersioned:async key=>{recordKeys.push(key);return {status:'WRITTEN',changes:1};}};
 const report=await runBiotechR8({dataRoot:'unused',allowPublish:true,
  tokenFn:async()=>{used.push('credential');return 'approved-token';},
  r7DbFactory:({tokenFn})=>{assert.equal(tokenFn(),'approved-token');used.push('r7-db');return {};},
  dbFactory:({tokenFn})=>{assert.equal(tokenFn(),'approved-token');used.push('r8-db');return db;},
  r7:async ({db:r7Db})=>{assert.deepEqual(r7Db,{});used.push('r7-run');return {status:'NO_NEW_CONFIRMED_SESSION'};},
  build:async()=>candidate,now:()=>NOW});
 assert.equal(report.status,'R8_D1_READBACK_VERIFIED_API_PENDING');
 assert.deepEqual(used,['credential','r7-db','r8-db','r7-run']);
 assert.deepEqual(recordKeys,[BIOTECH_PROVISIONAL_KEY]);
});

test('R8 reads actual target ETF rows and rejects audit-only evidence or missing symbol',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'biotech-r8-parquet-'));
 const archive=path.join(root,'theme-market-history-r131','marketparquet-r165');
 const audits=path.join(root,'theme-market-history-r131','marketparquet-r167');
 fs.mkdirSync(archive,{recursive:true});fs.mkdirSync(audits,{recursive:true});
 const name='etf_daily_2026-10-21.parquet',bytes=Buffer.alloc(32,0);
 bytes.write('PAR1',0);bytes.writeUInt32LE(8,24);bytes.write('PAR1',28);
 const sha=createHash('sha256').update(bytes).digest('hex');
 fs.writeFileSync(path.join(archive,name),bytes);
 fs.writeFileSync(path.join(audits,'etf_daily_2026-10-21.audit.json'),JSON.stringify({
  date:'2026-10-21',sha256:sha,complete:true,source:'MARKETPARQUET_ETF_DAILY_SPLIT_ADJUSTED',
  prices:{IBB:111,XBI:95,SPY:332}}));
 try{
  const missing=await readVerifiedMarketParquetBiotech(root,{confirmedDate:'2026-10-21',
   parquetReader:async()=>[{date:'2026-10-21',symbol:'IBB',close:111},
    {date:'2026-10-21',symbol:'SPY',close:332}]});
  assert.equal(missing.status,'MISSING_REAL_TARGET_ROWS');
  const good=await readVerifiedMarketParquetBiotech(root,{confirmedDate:'2026-10-21',
   parquetReader:async()=>[{date:'2026-10-21',symbol:'IBB',close:111},
    {date:'2026-10-21',symbol:'XBI',close:95},{date:'2026-10-21',symbol:'SPY',close:332}]});
  assert.equal(good.status,'VERIFIED');assert.equal(good.dates[0].prices.XBI,95);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
