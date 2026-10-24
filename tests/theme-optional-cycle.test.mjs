import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {buildAiCandidate,collectWindow,runOptionalTheme,cloudflareD1,cloudflareToken,aiReaderRejectionReason,aiCandidateReference,diagnoseAiReader,diagnoseBiotechParity,verifySevenProvisionalAuthority,diagnoseSevenProvisionalLane} from '../scripts/pc-writer/theme-optional-cycle.mjs';
import {auditThroughDate} from '../scripts/pc-writer/theme-optional-audit.mjs';
import {regularHour15Rows} from '../scripts/pc-writer/theme-optional-score-r188.mjs';
import {THEME_ETF_ONLY_PAIRS,THEME_ETF_ONLY_PUBLIC_VERSION} from '../worker/theme-etf-only-public.mjs';

const NOW=Date.parse('2026-10-23T05:00:00Z');
const latest='2026-10-21';
const dates=Array.from({length:252},(_,i)=>new Date(Date.parse(latest+'T00:00:00Z')-(251-i)*86400000).toISOString().slice(0,10));
const history=dates.map((date,i)=>({date,score:Number((40+i*.02).toFixed(5))}));
const common={status:'READY',methodologyVersion:'ETF_ONLY_T40_R20_V40_PAIR50',observationDate:latest,phase:'CONFIRMED'};
const base=()=>({...common,themes:Array.from({length:7},(_,i)=>({theme:'base'+i,history,score:history.at(-1).score}))});
const earlierHistory=[{date:new Date(Date.parse(dates[0]+'T00:00:00Z')-86400000).toISOString().slice(0,10),score:39},...history.slice(0,-1)];
const approvedCoreSeed=()=>({status:'READY',version:THEME_ETF_ONLY_PUBLIC_VERSION,
 methodologyVersion:'ETF_ONLY_T40_R20_V40_PAIR50',publicationAuthorized:true,
 upstreamCommercialRightsVerified:true,derivedLicenseVerified:true,
 scoreMethod:'ETF_ONLY_PROXY',individualStocksUsed:0,
 sourcePriceMode:'UNADJUSTED_HOURLY_CLOSE_PROXY_DISCLOSED',
 sourceStoredAt:'2026-10-22T00:00:00Z',publishedAt:'2026-10-22T00:00:00Z',
 sourceVersion:'core-seed-test',observationDate:earlierHistory.at(-1).date,
 weights:{trend:0.4,relativeStrength:0.2,volatility:0.4},pairWeight:0.5,
 themes:THEME_ETF_ONLY_PAIRS.map(t=>({...t,latestScore:earlierHistory.at(-1).score,history:earlierHistory}))});
const approvedCurrent=()=>({...base(),themes:THEME_ETF_ONLY_PAIRS.map(t=>({...t,score:history.at(-1).score,history}))});
const priorAi=(date='2026-10-20')=>({
 ...common,theme:'AI 반도체',etfs:['SMH','SOXX'],observationDate:date,score:history.at(-1).score,
 history:history.map(p=>({...p,date:new Date(Date.parse(p.date+'T00:00:00Z')+(Date.parse(date+'T00:00:00Z')-Date.parse(latest+'T00:00:00Z'))).toISOString().slice(0,10)})),
 sourceVersion:'R187_SHA256_'+'f'.repeat(64),
 sourcePriceMode:'UNADJUSTED_15_NY_HOURLY_PROXY_WITH_OFFICIAL_EARLY_CLOSE_12',
 publicationAuthorized:true,upstreamCommercialRightsVerified:true,derivedLicenseVerified:true,
 localBarsVerified:true,sourcePriceReconciled:true
});
const candidateResult={
 status:'PRIVATE_CANDIDATE_PARITY_VERIFIED',themeId:'ai-semiconductor',observationDate:latest,
 score:history.at(-1).score,history,provisional:{points:[]},audit:{maxDifference:0}
};
const manifest=themeId=>({
 version:1,themeId,
 files:(themeId==='ai-semiconductor'?['SMH','SOXX','SPY']:['IBB','XBI','SPY']).map(s=>({
  path:'raw/'+s+'_'.padEnd(4,'_')+'a'.repeat(64)+'.jsonl',sha256:'a'.repeat(64),
  source:'https://getmarkethistory.com',collectedAt:'2026-10-23T03:00:00Z',
  observationFrom:'2026-10-20',observationThrough:latest,priceMode:'RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE',
  schemaVersion:'GMH_NDJSON_1H_COLUMNS_V1'
 }))
});
async function fixture(themeId,callback){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'zg-theme-option-cycle-'));
 const home=path.join(root,'themes',themeId,'raw');
 fs.mkdirSync(home,{recursive:true});
 const m=manifest(themeId);
 for(const f of m.files){
  const bytes=JSON.stringify({symbol:f.path.split('_')[0].slice(4),time:latest});
  f.sha256=createHash('sha256').update(bytes).digest('hex');
  f.path='raw/'+f.path.slice(4).split('_')[0]+'_'+f.sha256+'.jsonl';
  fs.writeFileSync(path.join(root,'themes',themeId,f.path),bytes);
 }
 fs.writeFileSync(path.join(root,'themes',themeId,'raw-manifest.json'),JSON.stringify(m));
 try{return await callback({root,manifest:m});}finally{fs.rmSync(root,{recursive:true,force:true})}
}
test('the shared API does not imply the optional tickers are in the seven-theme task',()=>{
 const w=collectWindow(manifest('ai-semiconductor'),base(),'ai-semiconductor',NOW);
 assert.deepEqual(w,{start:'2026-10-15',end:'2026-10-23'});
});
test('AI advances the collection checkpoint by UTC day even when the public reader date is unchanged',()=>{
 const ai=manifest('ai-semiconductor'),reader={...base(),provisional:{points:[{date:'2026-10-23'}]}};
 const friday=collectWindow(ai,reader,'ai-semiconductor',Date.parse('2026-10-23T23:59:00Z'));
 const saturday=collectWindow(ai,reader,'ai-semiconductor',Date.parse('2026-10-24T00:01:00Z'));
 assert.deepEqual(friday,{start:'2026-10-15',end:'2026-10-23'});
 assert.deepEqual(saturday,{start:'2026-10-15',end:'2026-10-24'});
 assert.deepEqual(collectWindow(ai,reader,'ai-semiconductor',Date.parse('2026-10-24T12:00:00Z')),saturday);
 const biotech=manifest('biotech');
 assert.equal(collectWindow(biotech,reader,'biotech',Date.parse('2026-10-24T12:00:00Z')).end,'2026-10-23');
});
test('AI audit uses the last real common bar not a later seven-theme date; biotech audit contract stays unchanged',()=>{
 assert.equal(auditThroughDate('ai-semiconductor',['2026-10-19','2026-10-20','2026-10-21'],'2026-10-22'),'2026-10-21');
 assert.equal(auditThroughDate('ai-semiconductor',['2026-10-19','2026-10-21','2026-10-23'],'2026-10-22'),'2026-10-21');
 assert.equal(auditThroughDate('ai-semiconductor',[],'2026-10-22'),undefined);
 assert.equal(auditThroughDate('biotech',['2026-10-21'],'2026-10-22'),'2026-10-22');
});
test('delayed AI 252-day calendar is reconstructed from an approved core seed without loosening reader gates',()=>{
 const reference=aiCandidateReference(approvedCurrent(),approvedCoreSeed(),earlierHistory.at(-1).date);
 assert.equal(reference.phase,'CONFIRMED');assert.equal(reference.observationDate,'2026-10-20');
 assert.deepEqual(reference.themes[0].history.map(p=>p.date),earlierHistory.map(p=>p.date));
 const delayedAudit={...candidateResult,observationDate:earlierHistory.at(-1).date,
  score:earlierHistory.at(-1).score,history:earlierHistory};
 const record=buildAiCandidate({audit:delayedAudit,prior:priorAi('2026-10-19'),reference,
  manifest:manifest('ai-semiconductor'),manifestBytes:Buffer.from('signed manifest'),now:NOW});
 assert.equal(aiReaderRejectionReason(record,reference,{now:NOW}),'PASS');
 assert.equal(record.phase,'CONFIRMED');assert.equal(record.observationDate,'2026-10-20');
 assert.throws(()=>aiCandidateReference(approvedCurrent(),null,'2026-10-20'),/AI_HISTORICAL_SEED_NOT_VERIFIED/);
 assert.throws(()=>aiCandidateReference(approvedCurrent(),{...approvedCoreSeed(),publicationAuthorized:false},'2026-10-20'),/AI_HISTORICAL_SEED_NOT_VERIFIED/);
});
test('optional PC auth refreshes an expired Wrangler OAuth token without logging or new installation',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'zg-theme-oauth-'));
 const oauthFile=path.join(root,'default.toml');
 const script=path.join(root,'wrangler.js');
 const expired='expiration_time = "2026-10-22T00:00:00Z"\noauth_token = "expired-secret"\n';
 const refreshed='expiration_time = "2026-10-24T00:00:00Z"\noauth_token = "refreshed-secret"\n';
 fs.writeFileSync(oauthFile,expired);fs.writeFileSync(script,'// locally installed test fixture');
 let calls=0;
 const execute=(exe,args)=>{
  calls++;assert.equal(exe,process.execPath);assert.deepEqual(args,[script,'whoami']);
  fs.writeFileSync(oauthFile,refreshed);return {status:0};
 };
 try{
  const options={dataRoot:root,oauthFile,env:{},now:Date.parse('2026-10-23T11:00:00Z'),
   execute,platform:'win32',wranglerCandidates:[script]};
  assert.equal(cloudflareToken(options),'refreshed-secret');assert.equal(calls,1);
  assert.equal(cloudflareToken(options),'refreshed-secret');assert.equal(calls,1);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
test('optional PC auth fails closed when Wrangler cannot refresh',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'zg-theme-oauth-block-'));
 const oauthFile=path.join(root,'default.toml');
 fs.writeFileSync(oauthFile,'expiration_time = "2026-10-22T00:00:00Z"\noauth_token = "expired-secret"\n');
 let calls=0;
 try{
  assert.throws(()=>cloudflareToken({dataRoot:root,oauthFile,env:{},now:Date.parse('2026-10-23T11:00:00Z'),
   platform:'linux',wranglerCandidates:[],execute:()=>{calls++;return {status:0}}}),/PC_WRANGLER_REAUTH_REQUIRED/);
  assert.equal(calls,0);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
test('official 2026 NYSE early close uses 12:xx hourly bar without changing the approved score formula',()=>{
 const rows=Array.from({length:628},(_,i)=>({timestamp:new Date(Date.UTC(2024,0,1+i,20)).toISOString(),close:100+i}));
 rows.push({timestamp:'2026-11-27T17:00:00Z',close:350},{timestamp:'2026-11-27T20:00:00Z',close:390});
 const selected=regularHour15Rows(rows).find(p=>p.date==='2026-11-27');
 assert.equal(selected.close,350);
});
test('AI publication candidate reuses checked rights, verified source and exact 252 history',()=>{
 const r=buildAiCandidate({audit:candidateResult,prior:priorAi(),reference:base(),
  manifest:manifest('ai-semiconductor'),manifestBytes:Buffer.from('immutable manifest'),now:NOW});
 assert.equal(r.status,'READY');assert.equal(r.sourceStoredAtKind,'VERIFIED_LOCAL_MARKET_BARS');
 assert.equal(r.history.length,252);assert.equal(r.publicationAuthorized,true);
 assert.throws(()=>buildAiCandidate({audit:candidateResult,prior:{...priorAi(),derivedLicenseVerified:false},
  reference:base(),manifest:manifest('ai-semiconductor'),manifestBytes:Buffer.from('x'),now:NOW}),/RIGHTS_OR_PRICE_APPROVAL_REQUIRED/);
 assert.throws(()=>buildAiCandidate({audit:{...candidateResult,status:'CONFIRMED_SCORE_REVISION_REVIEW'},
  prior:priorAi(),reference:base(),manifest:manifest('ai-semiconductor'),manifestBytes:Buffer.from('x'),now:NOW}),/SCORE_DRIFT_REVIEW_REQUIRED/);
});
test('private AI reader diagnostics name strict missing-date and provisional gates without relaxing them',()=>{
 const record=buildAiCandidate({audit:candidateResult,prior:priorAi(),reference:base(),
  manifest:manifest('ai-semiconductor'),manifestBytes:Buffer.from('immutable manifest'),now:NOW});
 assert.equal(aiReaderRejectionReason(record,base(),{now:NOW}),'PASS');
 const ahead={...base(),observationDate:'2026-10-22'};
 assert.equal(aiReaderRejectionReason(record,ahead,{now:NOW}),'PUBLIC_READER_OBSERVATION_DATE_MISMATCH');
 const calendar={...base(),themes:base().themes.map(t=>({...t,history:t.history.map((p,i)=>i===0?{...p,date:'2025-01-01'}:p)}))};
 assert.equal(aiReaderRejectionReason(record,calendar,{now:NOW}),'PUBLIC_READER_HISTORY_CALENDAR_MISMATCH');
 const provisional={...base(),phase:'PROVISIONAL',provisional:{points:[{date:'2026-10-22',scores:{}}]}};
 assert.equal(aiReaderRejectionReason(record,provisional,{now:NOW}),'PUBLIC_READER_PROVISIONAL_DATES_MISSING');
});
test('AI may inherit secondary provenance only from the exact seven-theme verified rolling publisher',()=>{
 const reference={...base(),phase:'PROVISIONAL',provisional:{points:[{date:'2026-10-22',scores:{}},{date:'2026-10-23',scores:{}}]}};
 const rolling={status:'READY',version:'THEME_ETF_ROLLING_R178',publicationAuthorized:true,
  upstreamCommercialRightsVerified:true,derivedLicenseVerified:true,sourcePriceReconciled:true,
  observationDate:latest,provisional:{points:[{date:'2026-10-22'},{date:'2026-10-23'}]},
  lineage:{primarySource:'GETMARKETHISTORY_1H_CLOSE',secondarySource:'MARKETPARQUET_ETF_DAILY_SPLIT_ADJUSTED',
   secondaryPendingCount:2,latestCompletedSession:'2026-10-23'}};
 assert.equal(verifySevenProvisionalAuthority(rolling,reference),true);
 for(const invalid of [
  {...rolling,derivedLicenseVerified:false},
  {...rolling,lineage:{...rolling.lineage,secondarySource:'UNKNOWN'}},
  {...rolling,provisional:{points:[{date:'2026-10-23'}]}},
  {...rolling,lineage:{...rolling.lineage,secondaryPendingCount:1}},
 ])assert.throws(()=>verifySevenProvisionalAuthority(invalid,reference),/AI_SEVEN_SECONDARY_RIGHTS_OR_LINEAGE_UNVERIFIED/);
});
test('read-only authority diagnostic detects the actual seed + provisional sidecar route',async()=>{
 const seed={...approvedCoreSeed(),observationDate:latest,
  themes:THEME_ETF_ONLY_PAIRS.map(t=>({...t,latestScore:history.at(-1).score,history}))};
 const scores=Object.fromEntries(THEME_ETF_ONLY_PAIRS.map(t=>[t.theme,54]));
 const sidecar={status:'READY',phase:'PROVISIONAL',methodologyVersion:'ETF_ONLY_T40_R20_V40_PAIR50',
  individualStocksUsed:0,publicationAuthorized:true,upstreamCommercialRightsVerified:true,
  derivedLicenseVerified:true,sourcePriceReconciled:true,sourceName:'MARKETPARQUET_ETF_DAILY_SPLIT_ADJUSTED',
  sourceVersion:'verified-test',asOf:'2026-10-23T01:00:00Z',sourceStoredAt:'2026-10-23T01:00:00Z',
  confirmedObservationDate:latest,observationDate:'2026-10-22',
  coverage:{etfs:13,benchmark:'SPY',complete:true},points:[{date:'2026-10-22',scores}]};
 const publicFeed={...approvedCurrent(),phase:'PROVISIONAL',
  provisional:{points:[{date:'2026-10-22',scores}]}};
 let reads=0,writes=0,seedReads=0;
 const db={read:async key=>{reads++;return {storedAt:NOW-1000,body:key==='theme-etf-only-rolling'
   ?{status:'READY',version:'THEME_ETF_ROLLING_R178',observationDate:'2026-10-20'}:sidecar};},
  readSeed:async()=>{seedReads++;return seed;},replace:async()=>{writes++;}};
 const actual=await diagnoseSevenProvisionalLane({storage:db,readPublic:async()=>publicFeed,now:()=>NOW});
 assert.equal(actual.status,'READONLY_REPORTED');
 assert.equal(actual.activeLane,'SEED_PLUS_PROVISIONAL_SIDECAR');
 assert.equal(actual.rolling.gates.confirmedDate,false);
 assert.equal(actual.fallback.readerValidatorPass,true);
 assert.equal(actual.fallback.exactPublicScoreMatch,true);
 assert.equal(actual.providerCalls,0);assert.equal(actual.d1Writes,0);
 assert.equal(actual.schedulerWrites,0);assert.equal(reads,2);assert.equal(seedReads,1);assert.equal(writes,0);
});
test('AI private cycle attaches only date-exact verified 23rd secondary score and does not write D1',async()=>{
 await fixture('ai-semiconductor',async({root})=>{
  const provisionalDate='2026-10-22';let writes=0,reads=0,scoreCalls=0;
  const publicFeed={...base(),phase:'PROVISIONAL',provisional:{points:[{date:provisionalDate,scores:{}}]}};
  const rolling={status:'READY',version:'THEME_ETF_ROLLING_R178',publicationAuthorized:true,
   upstreamCommercialRightsVerified:true,derivedLicenseVerified:true,sourcePriceReconciled:true,
   observationDate:latest,provisional:{points:[{date:provisionalDate}]},
   lineage:{primarySource:'GETMARKETHISTORY_1H_CLOSE',secondarySource:'MARKETPARQUET_ETF_DAILY_SPLIT_ADJUSTED',
    secondaryPendingCount:1,latestCompletedSession:provisionalDate}};
  const db={read:async key=>{reads++;return {body:key==='theme-etf-only-rolling'?rolling:priorAi(),storedAt:NOW-86400000}},
   replace:async()=>{writes++}};
  const result=await runOptionalTheme({themeId:'ai-semiconductor',dataRoot:root,now:()=>NOW,
   storage:db,readPublic:async()=>publicFeed,collect:async()=>({status:'PRIVATE_RAW_COLLECTION_COMPLETE',providerCalls:0}),
   audit:()=>({...candidateResult,provisional:{points:[]}}),
   secondary:async()=>{scoreCalls++;return {status:'PRIVATE_PROVISIONAL_SCORES_VERIFIED',
    points:[{date:provisionalDate,score:62.13456}],lineage:{source:'MARKETPARQUET_ETF_DAILY_SPLIT_ADJUSTED',
     maxOverlapDifference:0.003}};}});
  assert.equal(result.status,'CANDIDATE_VERIFIED_NOT_PUBLISHED');
  assert.deepEqual(result.provisionalDates,[provisionalDate]);
  assert.deepEqual(result.provisionalScores,[62.13456]);
  assert.equal(result.sourcePriceMaxOverlapDifference,0.003);
  assert.equal(writes,0);assert.equal(reads,2);assert.equal(scoreCalls,1);
 });
});
test('read-only AI diagnostic uses existing local audit and D1 SELECT with zero provider calls and writes',async()=>{
 await fixture('ai-semiconductor',async({root})=>{
  let reads=0,writes=0,audits=0;
  const db={read:async()=>{reads++;return {body:priorAi(),storedAt:NOW-86400000}},
   replace:async()=>{writes++}};
  const publicFeed={...base(),phase:'PROVISIONAL',provisional:{points:[{date:'2026-10-22',scores:{}}]}};
  const result=await diagnoseAiReader({dataRoot:root,now:()=>NOW,storage:db,
   readPublic:async()=>publicFeed,audit:()=>{audits++;return candidateResult}});
  assert.equal(result.status,'BLOCKED');
  assert.equal(result.reason,'PUBLIC_READER_PROVISIONAL_DATES_MISSING');
  assert.deepEqual(result.publicProvisionalDates,['2026-10-22']);
  assert.deepEqual(result.localProvisionalDates,[]);
  assert.equal(result.providerCalls,0);assert.equal(result.d1Writes,0);assert.equal(result.schedulerWrites,0);
  assert.equal(reads,1);assert.equal(writes,0);assert.equal(audits,1);
 });
});
test('read-only biotech diagnostic isolates observed history drift without D1 writes',async()=>{
 await fixture('biotech',async({root})=>{
  let writes=0;
  const old={...priorAi(latest),theme:'바이오테크',etfs:['IBB','XBI']};
  const db={read:async()=>({body:old,storedAt:NOW-5000}),replace:async()=>{writes++}};
  const reference={...base(),themes:[...base().themes,{theme:'AI 반도체',history}]};
  const candidateHistory=history.map((p,i)=>i===251?{...p,score:p.score+2.35318}:p);
  const result=await diagnoseBiotechParity({dataRoot:root,storage:db,readPublic:async()=>reference,
   audit:()=>({...candidateResult,themeId:'biotech',history:candidateHistory,
    status:'CONFIRMED_SCORE_REVISION_REVIEW',audit:{maxDifference:2.35318,commonSessions:630,sourceOverlapBars:10,missingProvisionalDates:[]}})});
  assert.equal(result.status,'BLOCKED');assert.equal(result.reason,'SCORE_DRIFT_REVIEW_REQUIRED');
  assert.equal(result.scoreDifference,2.35318);assert.equal(result.overlappingChangedDates,1);
  assert.equal(result.largestOverlappingDifferences[0].date,latest);
  assert.equal(result.providerCalls,0);assert.equal(result.d1Writes,0);assert.equal(result.schedulerWrites,0);
  assert.equal(writes,0);
 });
});
test('private cycle collects and audits but never posts to D1 without --publish',async()=>{
 await fixture('ai-semiconductor',async({root})=>{
  let writes=0,calls=0;
  const db={read:async()=>({body:priorAi(),storedAt:NOW-86400000}),replace:async()=>{writes++}};
  const result=await runOptionalTheme({themeId:'ai-semiconductor',dataRoot:root,now:()=>NOW,
   storage:db,readPublic:async()=>base(),collect:async()=>{calls++;return {status:'PRIVATE_RAW_COLLECTION_COMPLETE',providerCalls:3}},
   audit:()=>candidateResult});
  assert.equal(result.status,'CANDIDATE_VERIFIED_NOT_PUBLISHED');
  assert.equal(result.providerCalls,3);assert.equal(writes,0);assert.equal(calls,1);
 });
});
test('lagging AI private cycle uses verified D1 seed to audit a real older observation day, without writing',async()=>{
 await fixture('ai-semiconductor',async({root})=>{
  let reads=0,writes=0,seedReads=0;
  const delayedAudit={...candidateResult,observationDate:earlierHistory.at(-1).date,
   score:earlierHistory.at(-1).score,history:earlierHistory};
  const db={read:async()=>{reads++;return {body:priorAi('2026-10-19'),storedAt:NOW-86400000}},
   readSeed:async()=>{seedReads++;return approvedCoreSeed()},replace:async()=>{writes++}};
  const result=await runOptionalTheme({themeId:'ai-semiconductor',dataRoot:root,now:()=>NOW,
   storage:db,readPublic:async()=>approvedCurrent(),
   collect:async()=>({status:'PRIVATE_RAW_COLLECTION_COMPLETE',providerCalls:3}),audit:()=>delayedAudit});
  assert.equal(result.status,'CANDIDATE_VERIFIED_NOT_PUBLISHED');
  assert.equal(result.observationDate,'2026-10-20');
  assert.equal(reads,1);assert.equal(seedReads,1);assert.equal(writes,0);
 });
});
test('unchanged re-collection does not republish or extend source freshness',async()=>{
 await fixture('ai-semiconductor',async({root})=>{
  let writes=0;
  const db={read:async()=>({body:{...priorAi(latest),provisional:{points:[]}},storedAt:NOW-5000}),
   replace:async()=>{writes++}};
  const result=await runOptionalTheme({themeId:'ai-semiconductor',dataRoot:root,now:()=>NOW,
   allowPublish:true,storage:db,readPublic:async()=>base(),
   collect:async()=>({status:'PRIVATE_RAW_COLLECTION_COMPLETE',providerCalls:3}),audit:()=>candidateResult});
  assert.equal(result.status,'UNCHANGED_NO_WRITE');assert.equal(writes,0);
 });
});
test('biotech mismatch is isolated and can never replace the public score',async()=>{
 await fixture('biotech',async({root})=>{
  let writes=0;
  const db={read:async()=>({body:{...priorAi(),theme:'바이오테크',etfs:['IBB','XBI']},storedAt:NOW-86400000}),replace:async()=>{writes++}};
  const reference={...base(),themes:[...base().themes,{theme:'AI 반도체',history}]};
  const result=await runOptionalTheme({themeId:'biotech',dataRoot:root,now:()=>NOW,allowPublish:true,
   storage:db,readPublic:async()=>reference,collect:async()=>({status:'PRIVATE_RAW_COLLECTION_COMPLETE',providerCalls:3}),
   audit:()=>({...candidateResult,themeId:'biotech',status:'CONFIRMED_SCORE_REVISION_REVIEW',audit:{maxDifference:2.35318}})});
  assert.equal(result.status,'BLOCKED');assert.equal(result.reason,'SCORE_DRIFT_REVIEW_REQUIRED');assert.equal(writes,0);
 });
});
test('an AI candidate is published only after D1 CAS and public readback',async()=>{
 await fixture('ai-semiconductor',async({root})=>{
  let written=null,calls=0;
  const db={read:async()=>({body:priorAi(),storedAt:NOW-86400000}),
   replace:async(key,record)=>{written={key,record};return {storedAt:NOW}}};
  const result=await runOptionalTheme({themeId:'ai-semiconductor',dataRoot:root,now:()=>NOW,
   allowPublish:true,storage:db,
   readPublic:async()=>{calls++;return calls===1?base():{...base(),themes:[...base().themes,
    {theme:'AI 반도체',score:history.at(-1).score,history}]};},
   collect:async()=>({status:'PRIVATE_RAW_COLLECTION_COMPLETE',providerCalls:3}),audit:()=>candidateResult});
  assert.equal(result.status,'PUBLIC_VERIFIED');assert.equal(result.d1Writes,1);
  assert.equal(written.key,'theme-ai-semiconductor-r189');assert.equal(result.publicVerified,true);
 });
});
test('D1 writer has a stale-write guard and verifies the exact written row',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'zg-theme-d1-cas-'));
 const cfgDir=path.join(root,'pc-writer');fs.mkdirSync(cfgDir);
 fs.writeFileSync(path.join(cfgDir,'config.json'),JSON.stringify({account:'a'.repeat(32),core:'11111111-1111-1111-1111-111111111111'}));
 const old=process.env.CLOUDFLARE_API_TOKEN;process.env.CLOUDFLARE_API_TOKEN='unit-test-memory-token';
 let current={body:JSON.stringify(priorAi()),stored_at:NOW-10000};let updates=0;
 const fetchImpl=async(_url,opts)=>{
  const {batch}=JSON.parse(opts.body),{sql,params}=batch[0];
  assert.match(opts.headers.Authorization,/Bearer unit-test-memory-token/);
  if(sql.startsWith('UPDATE')){
   assert.match(sql,/AND stored_at=\?/);
   assert.equal(params[3],NOW-10000);current={body:params[0],stored_at:params[1]};updates++;
   return Response.json({success:true,result:[{success:true,meta:{changes:1}}]});
  }
  if(sql.includes('market_public_snapshots_v1')){
   assert.deepEqual(params,['public:theme-etf-only:r1']);
   return Response.json({success:true,result:[{success:true,results:[
    {body:JSON.stringify(approvedCoreSeed()),stored_at:NOW-20000}
   ]}]});
  }
  return Response.json({success:true,result:[{success:true,results:[current]}]});
 };
 try{
  const db=cloudflareD1({dataRoot:root,fetchImpl});
  const seed=await db.readSeed();
  assert.equal(seed.observationDate,'2026-10-20');
  const previous=await db.read('theme-ai-semiconductor-r189');
  const next={...previous.body,observationDate:latest};
  const write=await db.replace('theme-ai-semiconductor-r189',next,previous.storedAt);
  assert.ok(write.storedAt>previous.storedAt);assert.equal(updates,1);
 }finally{
  if(old===undefined)delete process.env.CLOUDFLARE_API_TOKEN;
  else process.env.CLOUDFLARE_API_TOKEN=old;
  fs.rmSync(root,{recursive:true,force:true});
 }
});
