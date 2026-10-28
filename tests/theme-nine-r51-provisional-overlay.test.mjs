import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {buildNineR51PrivateProvisionalOverlay,
 buildNineR51ExistingPublicProvisionalOverlay,R51_PUBLIC_LEGACY_SOURCE,
 R51_APPROVED_ROSTER}
 from '../scripts/pc-writer/theme-nine-r51-provisional-overlay.mjs';
import {stageNineR51Current}
 from '../scripts/pc-writer/theme-nine-r51-stage-current.mjs';
import {addVerifiedNineR37,eligibleNineR37,THEME_NINE_R37_ROSTER,
 THEME_NINE_R37_ROSTER_SHA,THEME_NINE_R37_METHOD,THEME_NINE_R37_VERSION}
 from '../worker/theme-nine-r37-public.mjs';

const dates=Array.from({length:252},(_,i)=>new Date(
 Date.parse('2026-10-23T00:00:00Z')-(251-i)*86400000).toISOString().slice(0,10));
const recent=[...dates.slice(1),'2026-10-26'];
const symbols=[...new Set(THEME_NINE_R37_ROSTER.flatMap(t=>t.etfs))];
const hash='a'.repeat(64);
test('R51 approved roster stays byte-for-byte aligned with public R37',()=>{
 assert.deepEqual(R51_APPROVED_ROSTER,THEME_NINE_R37_ROSTER);
});

test('R51 stage imports without a worker tree in its isolated PC install folder',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'r51-pc-install-'));
 t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const scriptDir=new URL('../scripts/pc-writer/',import.meta.url);
 for(const name of ['theme-nine-r48-r47-bridge.mjs',
  'theme-nine-r51-provisional-overlay.mjs','theme-nine-r51-stage-current.mjs']){
  fs.copyFileSync(new URL(name,scriptDir),path.join(dir,name));
 }
 const isolated=await import(pathToFileURL(path.join(dir,'theme-nine-r51-stage-current.mjs')).href);
 assert.equal(typeof isolated.stageNineR51Current,'function');
});
const candidate=(observed,d,score)=>({
 contract:'THEME_NINE_R48_R47_PRIVATE_R37_CANDIDATE_V1',
 status:'PRIVATE_CANDIDATE_NOT_PUBLISHED',version:THEME_NINE_R37_VERSION,
 methodologyVersion:THEME_NINE_R37_METHOD,sourcePriceMode:'RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE',
 rosterSha256:THEME_NINE_R37_ROSTER_SHA,sourceContract:'THEME_NINE_R47_PRIVATE_RECURRING_NINE_THEME_SHADOW_V1',
 historicalAumMode:'FIXED_OFFICIAL_ISSUER_AUM_SNAPSHOT_WITH_ORIGINAL_DATES',
 benchmark:'SPY',individualStocksUsed:0,ETFPositions:64,uniqueETFs:63,
 observationDate:observed,phase:'CONFIRMED',rawManifestSha256:hash,
 r25InputSha256:hash,shadowSha256:hash,officialAumEvidenceSha256:hash,
 baselineManifestSha256:hash,deltaManifestSha256:hash,derivedOnlyNoRaw:true,
 officialAumAsOf:Object.fromEntries(symbols.map(s=>[s,'2026-10-01'])),
 publicationAuthorized:false,upstreamCommercialRightsVerified:false,
 derivedLicenseVerified:false,sourcePriceReconciled:false,
 sourceManifestVerified:false,privateReplayVerified:false,
 themes:THEME_NINE_R37_ROSTER.map(t=>({theme:t.theme,etfs:[...t.etfs],
  score,history:d.map(date=>({date,score:date===observed?score:50}))})),
});
const base=candidate('2026-10-23',dates,50);
const next=candidate('2026-10-26',recent,65);
const laterDates=[...recent.slice(1),'2026-10-27'];
const later=candidate('2026-10-27',laterDates,70);
for(const item of later.themes){
 const provisional=item.history.find(p=>p.date==='2026-10-26');
 provisional.score=65;
}
const visible=[...THEME_NINE_R37_ROSTER.slice(0,7).map(t=>({
 theme:t.theme,etfs:['OLD'],score:47,history:base.themes[0].history})),
 {theme:'바이오·신약',etfs:['OLD'],score:47,history:base.themes[0].history},
 {theme:'데이터센터·전력',etfs:['GRID'],score:47,history:base.themes[0].history},
 {theme:'우주·위성',etfs:['UFO','NASA'],score:47,history:base.themes[0].history}];
const publicBase={status:'READY',version:'THEME_ETF_ONLY_R144_252_PUBLIC_V1',
 methodologyVersion:'ETF_ONLY_T40_R20_V40_PAIR50',sourceVersion:'LEGACY_SOURCE',
 phase:'PROVISIONAL',observationDate:'2026-10-23',
 confirmedObservationDate:'2026-10-23',themes:visible,
 provisional:{asOf:'2026-10-27T00:00:00Z',points:[
  {date:'2026-10-26',scores:Object.fromEntries(visible.map(t=>[t.theme,47]))}]}};

test('R51 maps only actual R48 scores into the existing public provisional dates',async()=>{
 const p=buildNineR51PrivateProvisionalOverlay({confirmed:base,latest:next,publicBase});
 assert.equal(p.phase,'PROVISIONAL');
 assert.equal(p.observationDate,'2026-10-23');
 assert.equal(p.themes[0].history.length,252);
 assert.deepEqual(p.themes[0].history,base.themes[0].history);
 assert.equal(p.provisional.points.length,1);
 assert.deepEqual(p.provisional.points.map(z=>z.date),['2026-10-26']);
 assert.deepEqual(Object.keys(p.provisional.points[0].scores),
  THEME_NINE_R37_ROSTER.map(t=>t.theme));
 assert.equal(p.provisional.points[0].scores['로봇·자동화'],65);
 assert.equal(p.publicationAuthorized,false);
 assert.equal(p.d1Writes,0);
 const now=Date.parse('2026-10-27T01:00:00Z');
 assert.equal(eligibleNineR37(p,publicBase,{now,storedAt:now-1000}),false);
 const approved={...p,status:'READY',publicationAuthorized:true,
  upstreamCommercialRightsVerified:true,derivedLicenseVerified:true,
  sourcePriceReconciled:true,sourceManifestVerified:true,privateReplayVerified:true,
  sourceStoredAt:'2026-10-27T00:55:00Z',publishedAt:'2026-10-27T00:56:00Z'};
 assert.equal(eligibleNineR37(approved,publicBase,{now,storedAt:now-1000}),true);
 const db={prepare(){return {bind(){return {async first(){return {
  body:JSON.stringify(approved),stored_at:now-1000};}};}};}};
 const result=await addVerifiedNineR37(db,publicBase,{now});
 assert.equal(result.themes.length,10);
 assert.equal(result.provisional.points[0].scores['로봇·자동화'],65);
 assert.equal(result.provisional.points[0].scores['우주·위성'],47);
 assert.equal(result.provisional.points[0].scores['AI·반도체'],undefined);
});

test('R51 rejects missing dates, score rewrites and fabricated provisional points',()=>{
 const input={confirmed:base,latest:next,publicBase};
 const noDate={...next,observationDate:'2026-10-24'};
 assert.throws(()=>buildNineR51PrivateProvisionalOverlay({...input,latest:noDate}),
  /SOURCE_DATES_OR_SCORES/);
 const rewritten=structuredClone(next);
 rewritten.themes[0].history[12].score=74;
 assert.throws(()=>buildNineR51PrivateProvisionalOverlay({...input,latest:rewritten}),
  /CONFIRMED_HISTORY_RECALC_DRIFT/);
 const tooMany={...publicBase,provisional:{points:[
  {date:'2026-10-24'},{date:'2026-10-25'},{date:'2026-10-26'}]}};
 assert.throws(()=>buildNineR51PrivateProvisionalOverlay({...input,publicBase:tooMany}),
  /PUBLIC_CONFIRMED_ANCHOR/);
 const wrongDates={...publicBase,provisional:{points:[{date:'2026-10-27'}]}};
 assert.throws(()=>buildNineR51PrivateProvisionalOverlay({...input,publicBase:wrongDates}),
  /PROVISIONAL_DATES_MISSING/);
});

test('R51 uses an already-scored 27 Oct historical point from a later R48 snapshot',()=>{
 const result=buildNineR51PrivateProvisionalOverlay({
  confirmed:base,latest:later,publicBase});
 assert.deepEqual(result.provisional.points.map(p=>p.date),['2026-10-26']);
 assert.equal(result.provisional.points[0].scores['방산'],65);
 assert.equal(result.provisionalLineage.latestObservationDate,'2026-10-27');
 assert.equal(result.provisionalLineage.publicProvisionalEndDate,'2026-10-26');
 assert.deepEqual(result.themes[0].history,base.themes[0].history);
});

test('R51 connects public 27 Oct provisional from 28 Oct R48 history without 27 Oct candidate',()=>{
 const d26=Array.from({length:252},(_,i)=>new Date(
  Date.parse('2026-10-26T00:00:00Z')-(251-i)*86400000).toISOString().slice(0,10));
 const older=candidate('2026-10-26',d26,50);
 const d28=[...d26.slice(2),'2026-10-27','2026-10-28'];
 const future=candidate('2026-10-28',d28,70);
 for(const row of future.themes)row.history.find(p=>p.date==='2026-10-27').score=65;
 const public27={...publicBase,observationDate:'2026-10-26',
  confirmedObservationDate:'2026-10-26',
  themes:visible.map(t=>({...t,history:older.themes[0].history})),
  provisional:{asOf:'2026-10-28T03:00:00Z',points:[
   {date:'2026-10-27',scores:Object.fromEntries(visible.map(t=>[t.theme,47]))}]}};
 const result=buildNineR51PrivateProvisionalOverlay({
  confirmed:older,latest:future,publicBase:public27});
 assert.equal(result.provisional.points[0].date,'2026-10-27');
 assert.equal(result.provisional.points[0].scores['핀테크'],65);
 assert.equal(result.provisionalLineage.latestObservationDate,'2026-10-28');
});

test('R51 mirrors the real public API with 26 Oct anchor also in provisional dates',()=>{
 const d26=Array.from({length:252},(_,i)=>new Date(
  Date.parse('2026-10-26T00:00:00Z')-(251-i)*86400000).toISOString().slice(0,10));
 const older=candidate('2026-10-26',d26,50);
 const d28=[...d26.slice(2),'2026-10-27','2026-10-28'];
 const future=candidate('2026-10-28',d28,70);
 for(const row of future.themes){
  row.history.find(p=>p.date==='2026-10-26').score=50;
  row.history.find(p=>p.date==='2026-10-27').score=65;
 }
 const actualPublic={...publicBase,observationDate:'2026-10-26',
  confirmedObservationDate:'2026-10-26',
  themes:visible.map(t=>({...t,history:older.themes[0].history})),
  provisional:{asOf:'2026-10-28T05:00:00Z',points:[
   {date:'2026-10-26',scores:Object.fromEntries(visible.map(t=>[t.theme,50]))},
   {date:'2026-10-27',scores:Object.fromEntries(visible.map(t=>[t.theme,65]))}]}};
 const result=buildNineR51PrivateProvisionalOverlay({
  confirmed:older,latest:future,publicBase:actualPublic});
 assert.deepEqual(result.provisional.points.map(p=>p.date),
  ['2026-10-26','2026-10-27']);
 assert.equal(result.provisional.points[0].scores['로봇·자동화'],50);
 assert.equal(result.provisional.points[1].scores['로봇·자동화'],65);
 const now=Date.parse('2026-10-28T06:00:00Z');
 const record={...result,status:'READY',publicationAuthorized:true,
  upstreamCommercialRightsVerified:false,derivedLicenseVerified:false,
  sourcePriceReconciled:false,accountGoodStandingVerified:false,
  anonymousScopeIndependentlyConfirmed:false,
  licensingRiskAcceptedByPublisher:true,
  rightsBasis:'OFFICIAL_TERMS_DERIVED_WORKS_ANONYMOUS_SCOPE_UNCONFIRMED',
  sourceTermsUrl:'https://getmarkethistory.com/docs/terms',
  sourceManifestVerified:true,privateReplayVerified:true,
  sourceStoredAt:'2026-10-28T05:55:00Z',publishedAt:'2026-10-28T05:56:00Z'};
 assert.equal(eligibleNineR37(record,actualPublic,{now,storedAt:now-1000}),true);
 const invalid={...record,provisional:{...record.provisional,
  points:[record.provisional.points[0],record.provisional.points[0]]}};
 assert.equal(eligibleNineR37(invalid,actualPublic,{now,storedAt:now-1000}),false);
});

test('R51 reads private immutable R48 snapshots and stages provisional scores offline',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'theme-nine-r51-'));
 t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const input=path.join(dir,'themes','legacy-nine-r48-private-candidate');
 fs.mkdirSync(input,{recursive:true});
 const write=(record)=>{
  const bytes=Buffer.from(JSON.stringify(record,null,2)+'\n');
  const digest=createHash('sha256').update(bytes).digest('hex').slice(0,16);
  const name=`THEME_NINE_R48_PRIVATE_CANDIDATE_${record.observationDate}_${digest}.json`;
  fs.writeFileSync(path.join(input,name),bytes,{flag:'wx'});
 };
 write(base);
 const wait=await stageNineR51Current({dataRoot:dir,publicBase,
  provisionalMode:'R32_DATED'});
 assert.equal(wait.status,'WAIT_R48_ALIGNED_SNAPSHOTS');
 assert.deepEqual(wait.missing,['LATEST_PROVISIONAL']);
 write(next);
 const result=await stageNineR51Current({dataRoot:dir,publicBase,
  provisionalMode:'R32_DATED'});
 assert.equal(result.status,'R51_PRIVATE_PROVISIONAL_STAGED_NOT_PUBLISHED');
 assert.equal(result.scoreCount,9);
 assert.equal(result.d1Writes,0);
 const actual=JSON.parse(fs.readFileSync(result.candidatePath,'utf8'));
 assert.equal(actual.provisional.points[0].scores['로봇·자동화'],65);
 assert.equal(actual.publicationAuthorized,false);
 const repeated=await stageNineR51Current({dataRoot:dir,publicBase,
  provisionalMode:'R32_DATED'});
 assert.equal(repeated.candidateSha256,result.candidateSha256);
 const missingPublic=await stageNineR51Current({dataRoot:dir,
  fetchImpl:async()=>({status:503,ok:false})});
 assert.equal(missingPublic.status,'WAIT_PUBLIC_FEED_UNAVAILABLE');
});

test('R51 accepts a later private snapshot when exact provisional-day file is absent',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'theme-nine-r51-later-'));
 t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const input=path.join(dir,'themes','legacy-nine-r48-private-candidate');
 fs.mkdirSync(input,{recursive:true});
 for(const record of [base,later]){
  const bytes=Buffer.from(JSON.stringify(record,null,2)+'\n');
  const digest=createHash('sha256').update(bytes).digest('hex').slice(0,16);
  const name=`THEME_NINE_R48_PRIVATE_CANDIDATE_${record.observationDate}_${digest}.json`;
  fs.writeFileSync(path.join(input,name),bytes,{flag:'wx'});
 }
 const result=await stageNineR51Current({dataRoot:dir,publicBase,
  provisionalMode:'R32_DATED'});
 assert.equal(result.status,'R51_PRIVATE_PROVISIONAL_STAGED_NOT_PUBLISHED');
 assert.equal(result.latestR48SourceDate,'2026-10-27');
 assert.deepEqual(result.provisionalDates,['2026-10-26']);
 const stored=JSON.parse(fs.readFileSync(result.candidatePath,'utf8'));
 assert.equal(stored.provisional.points[0].scores['방산'],65);
});

test('R51 stages the exact published 26/27 subsets from confirmed R32 alone',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'theme-nine-r51-existing-public-'));
 t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const input=path.join(dir,'themes','legacy-nine-r48-private-candidate');
 fs.mkdirSync(input,{recursive:true});
 const d26=Array.from({length:252},(_,i)=>new Date(
  Date.parse('2026-10-26T00:00:00Z')-(251-i)*86400000).toISOString().slice(0,10));
 const verified=candidate('2026-10-26',d26,50);
 const bytes=Buffer.from(JSON.stringify(verified,null,2)+'\n');
 const hash=createHash('sha256').update(bytes).digest('hex').slice(0,16);
 fs.writeFileSync(path.join(input,`THEME_NINE_R48_PRIVATE_CANDIDATE_2026-10-26_${hash}.json`),bytes);
 const selected26={'바이오·신약':24.93452,'우주·위성':47.35703,
  '데이터센터·전력':14.38294};
 const selected27={'로봇·자동화':23.48016,'클라우드·SaaS':64.06944,
  '자율주행':24.27183,'원전·SMR':30.76786,'방산':50.70437,
  '핀테크':59.90079,'사이버보안':66.4504};
 const existing={...publicBase,observationDate:'2026-10-26',
  confirmedObservationDate:'2026-10-26',
  themes:visible.map(t=>({...t,history:verified.themes[0].history})),
  provisional:{asOf:'2026-10-29T00:00:00Z',points:[
   {date:'2026-10-26',scores:selected26},
   {date:'2026-10-27',scores:selected27}]}};
 const before=structuredClone(existing);
 const result=await stageNineR51Current({dataRoot:dir,publicBase:existing});
 assert.equal(result.status,'R51_PRIVATE_PROVISIONAL_STAGED_NOT_PUBLISHED');
 assert.equal(result.provisionalMode,'PUBLIC_LEGACY_AS_IS');
 assert.equal(result.latestR48SourceDate,'2026-10-26');
 assert.equal(result.scoreCount,10);
 assert.equal(result.r32ProvisionalScoreCount,0);
 const stored=JSON.parse(fs.readFileSync(result.candidatePath,'utf8'));
 assert.equal(stored.provisionalLineage.source,R51_PUBLIC_LEGACY_SOURCE);
 assert.equal(stored.provisionalLineage.sameMethodology,false);
 assert.deepEqual(stored.provisional,existing.provisional);
 assert.deepEqual(existing,before);
 const checked=buildNineR51ExistingPublicProvisionalOverlay({confirmed:verified,
  publicBase:existing});
 assert.deepEqual(checked,stored);
 const now=Date.parse('2026-10-29T01:00:00Z');
 const published={...checked,status:'READY',publicationAuthorized:true,
  upstreamCommercialRightsVerified:true,derivedLicenseVerified:true,
  sourcePriceReconciled:true,sourceManifestVerified:true,privateReplayVerified:true,
  sourceStoredAt:'2026-10-29T00:55:00Z',publishedAt:'2026-10-29T00:56:00Z'};
 assert.equal(eligibleNineR37(published,existing,{now,storedAt:now-1000}),true);
 const db={prepare(){return {bind(){return {async first(){return {
  body:JSON.stringify(published),stored_at:now-1000};}};}};}};
 const displayed=await addVerifiedNineR37(db,existing,{now});
 assert.deepEqual(displayed.provisional,existing.provisional);
 assert.equal(displayed.provisionalMethodologyVersion,existing.methodologyVersion);
 assert.equal(displayed.methodologyVersion,THEME_NINE_R37_METHOD);
 assert.equal(displayed.modelRevision,THEME_NINE_R37_VERSION);
 assert.equal(displayed.themes.find(t=>t.theme==='로봇·자동화').score,50);
 assert.equal(displayed.themes.find(t=>t.theme==='데이터센터·전력').score,47);
 const drifted=structuredClone(existing);
 drifted.provisional.points[1].scores['방산']=51;
 assert.equal(eligibleNineR37(published,drifted,{now,storedAt:now-1000}),false);
 assert.equal((await addVerifiedNineR37(db,drifted,{now})).modelRevision,undefined);
});
