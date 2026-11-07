import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {runNineR54PublicConnect}
 from '../scripts/pc-writer/theme-nine-r54-public-connect.mjs';
import {THEME_NINE_R37_KEY,THEME_NINE_R37_ROSTER,
 THEME_NINE_R37_ROSTER_SHA,THEME_NINE_R37_VERSION,THEME_NINE_R37_METHOD}
 from '../worker/theme-nine-r37-public.mjs';

const now=Date.parse('2026-10-28T05:00:00Z');
const day='2026-10-27';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const dates=Array.from({length:252},(_,i)=>new Date(
 Date.parse(day+'T00:00:00Z')-(251-i)*86400000).toISOString().slice(0,10));
const candidate={contract:'THEME_NINE_R48_R47_PRIVATE_R37_CANDIDATE_V1',
 status:'PRIVATE_CANDIDATE_NOT_PUBLISHED',phase:'CONFIRMED',
 version:THEME_NINE_R37_VERSION,methodologyVersion:THEME_NINE_R37_METHOD,
 sourceContract:'THEME_NINE_R47_PRIVATE_RECURRING_NINE_THEME_SHADOW_V1',
 sourcePriceMode:'RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE',
 historicalAumMode:'FIXED_OFFICIAL_ISSUER_AUM_SNAPSHOT_WITH_ORIGINAL_DATES',
 rosterSha256:THEME_NINE_R37_ROSTER_SHA,
 benchmark:'SPY',individualStocksUsed:0,ETFPositions:64,uniqueETFs:63,
 observationDate:day,rawManifestSha256:'a'.repeat(64),
 baselineManifestSha256:'b'.repeat(64),deltaManifestSha256:'c'.repeat(64),
 r25InputSha256:'d'.repeat(64),shadowSha256:'e'.repeat(64),
 officialAumEvidenceSha256:'f'.repeat(64),
 officialAumAsOf:Object.fromEntries([...new Set(THEME_NINE_R37_ROSTER
  .flatMap(t=>t.etfs))].map(s=>[s,'2026-10-23'])),
 themes:THEME_NINE_R37_ROSTER.map(t=>({theme:t.theme,etfs:[...t.etfs],
  score:52,history:dates.map(date=>({date,score:52}))})),
 publicationAuthorized:false,derivedOnlyNoRaw:true,
 providerCalls:0,d1Writes:0,schedulerWrites:0};

function fixture(t,{changedCandidate=null,publicReason='STORED_DATA_STALE'}={}){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-r54-confirmed-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const privatePath=path.join(root,'themes','legacy-nine-r48-private-candidate');
 const rawPath=path.join(root,'themes','legacy-nine-r47-private');
 fs.mkdirSync(privatePath,{recursive:true});fs.mkdirSync(rawPath,{recursive:true});
 const sourceFile=path.join(rawPath,'proof.json');
 fs.writeFileSync(sourceFile,'{}');
 fs.utimesSync(sourceFile,new Date(now-1000),new Date(now-1000));
 const data=changedCandidate??candidate,body=JSON.stringify(data,null,2)+'\n';
 const digest=sha(body),file=`THEME_NINE_R48_PRIVATE_CANDIDATE_${day}_${digest.slice(0,16)}.json`;
 const candidatePath=path.join(privatePath,file);
 fs.writeFileSync(candidatePath,body);
 let row=null,writeCount=0,stageR51Calls=0,pairChecks=0,manifestChecks=0;
 const query=async(sql,params,{write}={})=>{
  assert.equal(params.includes(THEME_NINE_R37_KEY),true);
  if(!write)return {results:row?[row]:[]};
  writeCount++;
  if(sql.startsWith('INSERT')){
   assert.equal(row,null);row={body:params[1],stored_at:params[2]};
  }else{
   assert.equal(params[3],row.stored_at);
   assert.equal(params[4],row.body);
   row={body:params[0],stored_at:params[1]};
  }
  return {meta:{changes:1}};
 };
 const fetchImpl=async()=>({status:503,ok:false,
  async json(){return {status:'UNAVAILABLE',reason:publicReason};}});
 const args={dataRoot:root,configDirectory:root,now,publisherConsent:true,
  fetchImpl,stageR48:()=>({status:'R48_PRIVATE_CANDIDATE_STAGED_NOT_PUBLISHED',
   candidatePath,candidateSha256:digest,sourceDate:day}),
  stageR51:()=>{stageR51Calls++;throw Error('R51_MUST_NOT_RUN');},
  verifyPair:({candidate:input})=>{pairChecks++;
   assert.deepEqual(input,data);
   return {source:{latestSpySessionDate:day},sourceFile};},
  verifyManifest:()=>{manifestChecks++;return {
   sourceManifestVerified:true,rawFilesShaVerified:64};},
  gate:async()=>({mainSha:'1'.repeat(40)}),
  tokenFn:async()=> 'approved-test-token',
  queryFactory:()=>query};
 return {args,writeCount:()=>writeCount,stageR51Calls:()=>stageR51Calls,
  pairChecks:()=>pairChecks,manifestChecks:()=>manifestChecks,
  row:()=>row};
}

test('503 STORED_DATA_STALE recovers a verified GMH confirmed-only feed and never invokes R51',async t=>{
 const old=process.env.ZGMINI_R54_TEST_MODE;
 process.env.ZGMINI_R54_TEST_MODE='1';
 t.after(()=>{if(old===undefined)delete process.env.ZGMINI_R54_TEST_MODE;
  else process.env.ZGMINI_R54_TEST_MODE=old;});
 const f=fixture(t),result=await runNineR54PublicConnect(f.args);
 assert.equal(result.status,'D1_VERIFIED_AWAIT_PUBLIC_API_REFRESH');
 assert.equal(result.provisionalMode,'NONE_CONFIRMED_ONLY');
 assert.deepEqual(result.provisionalDates,[]);
 assert.equal(result.themesValidated,9);
 assert.equal(result.providerCalls,0);
 assert.equal(f.writeCount(),1);
 assert.equal(f.stageR51Calls(),0);
 assert.equal(f.pairChecks(),1);
 assert.equal(f.manifestChecks(),1);
 assert.equal(JSON.parse(f.row().body).phase,'CONFIRMED');
 assert.equal(JSON.parse(f.row().body).provisional,undefined);
});

test('R54 never treats unrelated HTTP 503 as a recoverable stale-public contract',async t=>{
 const old=process.env.ZGMINI_R54_TEST_MODE;
 process.env.ZGMINI_R54_TEST_MODE='1';
 t.after(()=>{if(old===undefined)delete process.env.ZGMINI_R54_TEST_MODE;
  else process.env.ZGMINI_R54_TEST_MODE=old;});
 const f=fixture(t,{publicReason:'BACKEND_UNAVAILABLE'});
 await assert.rejects(runNineR54PublicConnect(f.args),/PUBLIC_API_HTTP_503/);
 assert.equal(f.writeCount(),0);
 assert.equal(f.pairChecks(),0);
 assert.equal(f.stageR51Calls(),0);
});

test('confirmed-only replay refuses a changed candidate before D1',async t=>{
 const old=process.env.ZGMINI_R54_TEST_MODE;
 process.env.ZGMINI_R54_TEST_MODE='1';
 t.after(()=>{if(old===undefined)delete process.env.ZGMINI_R54_TEST_MODE;
  else process.env.ZGMINI_R54_TEST_MODE=old;});
 const modified={...candidate,themes:candidate.themes.slice(0,8)};
 const f=fixture(t,{changedCandidate:modified});
 await assert.rejects(runNineR54PublicConnect(f.args),
  /R54_PRIVATE_CANDIDATE_CONTRACT/);
 assert.equal(f.writeCount(),0);
 assert.equal(f.stageR51Calls(),0);
});
