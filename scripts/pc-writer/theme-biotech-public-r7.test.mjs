import test from 'node:test';
import assert from 'node:assert/strict';
import {buildBiotechConfirmedContinuationR6} from './theme-biotech-continuation-r6.mjs';
import {buildBiotechPublicR2} from './theme-biotech-public-record-r7.mjs';
import {eligibleBiotechContinuationR2,addVerifiedBiotechContinuationR2} from './theme-biotech-continuation-public-r2.mjs';
import {biotechBoundedCollectionWindow,runBiotechAutoR7} from './theme-biotech-auto-core-r7.mjs';
import {biotechVersionedD1} from './theme-biotech-versioned-d1-r7.mjs';
import {biotechCloudflareTokenR7} from './theme-biotech-auth-r7.mjs';
import {installBiotechPcR7} from './theme-biotech-pc-install-r7.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';

const CLOCK=Date.parse('2026-10-24T06:00:00Z');
function sample(){
 const dates=Array.from({length:254},(_,i)=>new Date(Date.UTC(2026,1,10+i)).toISOString().slice(0,10));
 const history=dates.slice(0,252).map((date,i)=>({date,score:16+i/100}));
 const prior={status:'READY',theme:'바이오테크',etfs:['IBB','XBI'],
  methodologyVersion:'ETF_ONLY_T40_R20_V40_PAIR50',observationDate:dates[251],history,
  sourceVersion:'BIOTECH_R1_SHA256_'+'a'.repeat(64),publicationAuthorized:true,
  licensingRiskAcceptedByPublisher:true,derivedOnlyNoRaw:true,
  upstreamCommercialRightsVerified:false,derivedLicenseVerified:false,
  sourcePriceReconciled:false,fullHistoryIndependentlyReconciled:false,
  anonymousScopeIndependentlyConfirmed:false,
  rightsBasis:'OFFICIAL_TERMS_DERIVED_WORKS_ANONYMOUS_SCOPE_UNCONFIRMED',
  sourceTermsUrl:'https://getmarkethistory.com/docs/terms'};
 const sh=dates.slice(2).map((date,i)=>({date,score:25+i/100}));
 const shadow={themeId:'biotech',status:'PRIVATE_SHADOW_COMPUTED_NOT_PUBLISHED',
  revisionId:'BIOTECH_GMH_SHADOW_R5_test',methodologyVersion:'ETF_ONLY_T40_R20_V40_PAIR50',
  sourceVersion:'GMH_MANIFEST_SHA256_'+'b'.repeat(64),scorerCodeSha256:'c'.repeat(64),
  sourceReceivedThrough:'2026-10-23T11:37:23.618Z',observationDate:dates[253],
  score:sh.at(-1).score,history:sh,publicWrites:0,d1Writes:0,publicationAuthorized:false,provisional:{points:[]},
  priorComparison:{publicObservationDate:dates[251],comparedDates:252,changedDates:67,
   maximumDifference:2.35318,inputPriceRootCause:'ORIGINAL_R3_PRICES_UNAVAILABLE_NOT_INFERRED'}};
 const candidate=buildBiotechConfirmedContinuationR6({prior,shadow});
 const base={status:'READY',observationDate:dates[253],themes:Array.from({length:7},(_,i)=>({theme:'theme-'+i,score:45+i,history:[]}))};
 return {candidate,prior,base,shadow};
}
const publicR2=(fixture=sample())=>buildBiotechPublicR2({candidate:fixture.candidate,previous:fixture.prior,
 candidateFileSha256:'d'.repeat(64),optIn:true,now:CLOCK});

test('new biotech R2 requires explicit publication opt-in and prior publisher authority',()=>{
 const s=sample();
 assert.throws(()=>buildBiotechPublicR2({candidate:s.candidate,previous:s.prior,candidateFileSha256:'d'.repeat(64),now:CLOCK}),
  /BIOTECH_R7_PUBLICATION_NOT_OPTED_IN/);
 s.prior.licensingRiskAcceptedByPublisher=false;
 assert.throws(()=>buildBiotechPublicR2({candidate:s.candidate,previous:s.prior,candidateFileSha256:'d'.repeat(64),optIn:true,now:CLOCK}),
  /BIOTECH_R7_PRIOR_PUBLIC_AUTHORITY_UNVERIFIED/);
});

test('bounded biotech collection window has a six-day maximum advance',()=>{
 const manifest={version:1,themeId:'biotech',files:['IBB','XBI','SPY'].map(s=>({path:'raw/'+s+'_hash.jsonl',observationThrough:'2026-10-01'}))};
 const w=biotechBoundedCollectionWindow({manifest,now:CLOCK});
 assert.deepEqual(w,{start:'2026-09-25',end:'2026-10-07'});
});

test('R7 private cycle never writes D1 and only saves biotech immutable outputs',async()=>{
 const s=sample(),root=fs.mkdtempSync(path.join(os.tmpdir(),'biotech-auto-private-'));
 fs.mkdirSync(path.join(root,'themes','biotech'),{recursive:true});
 fs.writeFileSync(path.join(root,'themes','biotech','raw-manifest.json'),JSON.stringify({version:1,themeId:'biotech',files:['IBB','XBI','SPY'].map(symbol=>({path:'raw/'+symbol+'_a.jsonl',observationThrough:s.shadow.observationDate}))}));
 try{
  const db={read:async key=>key==='theme-biotech-optional-r1'?{body:s.prior,storedAt:123}:null,
   writeVersioned:async()=>{throw Error('FORBIDDEN_PUBLIC_WRITE')}};
  const r=await runBiotechAutoR7({dataRoot:root,db,calculateShadow:()=>s.shadow,
   saveShadow:()=>({status:'IMMUTABLE_SAVED'}),saveContinuation:()=>({status:'IMMUTABLE_SAVED',sha256:'d'.repeat(64)}),
   now:()=>CLOCK});
  assert.equal(r.status,'PRIVATE_CANDIDATE_SAVED_NOT_PUBLISHED');assert.equal(r.d1Writes,0);
  assert.equal(r.providerCalls,0);assert.equal(r.newConfirmedDates,2);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('R7 versioned publish touches only new biotech key and never old seven or R1',async()=>{
 const s=sample(),root=fs.mkdtempSync(path.join(os.tmpdir(),'biotech-auto-publish-'));
 fs.mkdirSync(path.join(root,'themes','biotech'),{recursive:true});
 fs.writeFileSync(path.join(root,'themes','biotech','raw-manifest.json'),JSON.stringify({version:1,themeId:'biotech',files:['IBB','XBI','SPY'].map(symbol=>({path:'raw/'+symbol+'_a.jsonl',observationThrough:s.shadow.observationDate}))}));
 try{
  let writes=0;const db={read:async key=>key==='theme-biotech-optional-r1'?{body:s.prior,storedAt:123}:null,
   writeVersioned:async(key,record,expect)=>{writes++;
    assert.equal(key,'theme-biotech-optional-r2');assert.equal(expect,null);
    assert.equal(record.observationDate,s.shadow.observationDate);return {status:'WRITTEN',changes:1};}};
  const r=await runBiotechAutoR7({dataRoot:root,db,calculateShadow:()=>s.shadow,
   saveShadow:()=>({status:'IMMUTABLE_SAVED'}),saveContinuation:()=>({status:'IMMUTABLE_SAVED',sha256:'d'.repeat(64)}),
   readBase:async()=>s.base,allowPublish:true,now:()=>CLOCK});
  assert.equal(writes,1);assert.equal(r.d1Writes,1);
  assert.equal(r.status,'D1_READBACK_VERIFIED_PUBLIC_READER_PENDING');
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('R7 accepts 250 unchanged prior scores and 2 new GMH scores for R2 reader',()=>{
 const s=sample(),record=publicR2(s);
 assert.equal(record.sourcePriceReconciled,false);
 assert.equal(record.reconciliation.existingOverlappingDatesPreserved,250);
 assert.equal(record.reconciliation.newConfirmedDates,2);
 assert.deepEqual(record.history.slice(0,250),s.prior.history.slice(2));
 assert.equal(eligibleBiotechContinuationR2(record,s.base,{now:CLOCK,storedAt:CLOCK}),true);
});

test('new biotech reader can add only biotech after 7 themes, without requiring AI',async()=>{
 const s=sample(),record=publicR2(s);
 const db={prepare:()=>({bind:()=>({first:async()=>({body:JSON.stringify(record),stored_at:CLOCK})})})};
 const existing=JSON.stringify(s.base);
 const augmented=await addVerifiedBiotechContinuationR2(db,s.base,{now:CLOCK});
 assert.equal(augmented.themes.length,8);
 assert.equal(augmented.themes[7].theme,'바이오·신약');
 assert.deepEqual(augmented.themes.slice(0,7),s.base.themes);
 assert.equal(JSON.stringify(s.base),existing);
});

test('R2 replaces only older biotech and rejects tampered candidate/record',async()=>{
 const s=sample(),r=publicR2(s),old={theme:'바이오·신약',score:16,observationDate:s.prior.observationDate,history:s.prior.history};
 s.base.themes.push(old);
 const db={prepare:()=>({bind:()=>({first:async()=>({body:JSON.stringify(r),stored_at:CLOCK})})})};
 const result=await addVerifiedBiotechContinuationR2(db,s.base,{now:CLOCK});
 assert.equal(result.themes.length,8);assert.equal(result.themes[7].score,r.score);
 const invalid=structuredClone(r);invalid.history[0].score=-1;
 assert.equal(eligibleBiotechContinuationR2(invalid,s.base,{now:CLOCK,storedAt:CLOCK}),false);
 const future=structuredClone(r);future.sourceStoredAt='2026-10-26T00:00:00Z';
 assert.equal(eligibleBiotechContinuationR2(future,s.base,{now:CLOCK,storedAt:CLOCK}),false);
});

test('versioned D1 writer creates only biotech R2, proves readback, and does not repost unchanged scores',async()=>{
 const s=sample(),root=fs.mkdtempSync(path.join(os.tmpdir(),'biotech-d1-r7-'));
 fs.mkdirSync(path.join(root,'pc-writer'));fs.writeFileSync(path.join(root,'pc-writer','config.json'),
  JSON.stringify({account:'a'.repeat(32),core:'11111111-1111-1111-1111-111111111111'}));
 try{
  const records=new Map([['theme-biotech-optional-r1',{body:JSON.stringify(s.prior),stored_at:123}]]);
  let writes=0;
  const fetchImpl=async(_url,req)=>{
   const {sql,params}=JSON.parse(req.body).batch[0];let changes=0,rows=[];
   if(sql.startsWith('SELECT')){
    if(records.has(params[0]))rows=[records.get(params[0])];
   }else if(sql.startsWith('INSERT')){
    assert.equal(params[1],'theme-biotech-optional-r2');writes++;
    if(!records.has(params[1])){records.set(params[1],{body:params[3],stored_at:params[4]});changes=1;}
   }else if(sql.startsWith('UPDATE')){
    assert.equal(params[2],'theme-biotech-optional-r2');writes++;
    if(records.get(params[2])?.stored_at===params[3]){records.set(params[2],{body:params[0],stored_at:params[1]});changes=1;}
   }else throw Error('UNEXPECTED_SQL');
   return {ok:true,json:async()=>({success:true,result:[{success:true,results:rows,meta:{changes}}]})};
  };
  const db=biotechVersionedD1({dataRoot:root,fetchImpl,tokenFn:()=> 'test-token',clock:()=>CLOCK});
  const pub=publicR2(s),a=await db.writeVersioned('theme-biotech-optional-r2',pub,null);
  assert.equal(a.status,'WRITTEN');assert.equal(writes,1);
  assert.deepEqual((await db.read('theme-biotech-optional-r1')).body,s.prior);
  const b=await db.writeVersioned('theme-biotech-optional-r2',pub,a.storedAt);
  assert.equal(b.status,'UNCHANGED');assert.equal(writes,1);
  await assert.rejects(()=>db.writeVersioned('theme-biotech-optional-r1',pub,123),/BIOTECH_R7_WRITE_KEY_DENIED/);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('biotech PC Cloudflare connector retains existing token and Wrangler OAuth order',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'biotech-auth-r7-'));
 const credentials=path.join(root,'oauth.toml');
 try{
  fs.writeFileSync(credentials,'oauth_token = "existing-only"\nexpiration_time = "2027-01-01T00:00:00Z"\n');
  let refresh=0;
  const token=biotechCloudflareTokenR7({dataRoot:root,env:{},oauthFile:credentials,
   now:CLOCK,execute:()=>{refresh++;}});
  assert.equal(token,'existing-only');assert.equal(refresh,0);
  assert.equal(biotechCloudflareTokenR7({dataRoot:root,env:{CLOUDFLARE_API_TOKEN:'configured'},
   oauthFile:path.join(root,'missing')}),'configured');
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('biotech-only installer refuses source drift and does not modify previous theme data',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'biotech-install-r7-'));
 const dataRoot=path.join(root,'data'),bundle=path.join(root,'bundle');
 fs.mkdirSync(path.join(dataRoot,'themes','biotech'),{recursive:true});
 fs.mkdirSync(bundle);
 const legacy=path.join(dataRoot,'themes','robotics');fs.mkdirSync(legacy);
 fs.writeFileSync(path.join(legacy,'no-change.txt'),'seven-original');
 fs.writeFileSync(path.join(dataRoot,'themes','biotech','raw-manifest.json'),'{}');
 try{
  const files={};
  for(const relative of [
   'BIOTECH_R7_SCHEDULED.cmd',
   'scripts/pc-writer/theme-biotech-auth-r7.mjs',
   'scripts/pc-writer/theme-biotech-auto-r7.mjs',
   'scripts/pc-writer/theme-biotech-auto-core-r7.mjs',
   'scripts/pc-writer/theme-biotech-continuation-r6.mjs',
   'scripts/pc-writer/theme-biotech-public-record-r7.mjs',
   'scripts/pc-writer/theme-biotech-shadow-core-r5.mjs',
   'scripts/pc-writer/theme-biotech-versioned-d1-r7.mjs',
   'scripts/pc-writer/theme-data-inventory.mjs',
   'scripts/pc-writer/theme-optional-collect.mjs',
   'scripts/pc-writer/theme-optional-score-r188.mjs',
   'worker/theme-biotech-continuation-public-r2.mjs',
   'worker/public-display-freshness.mjs']){
   const dest=path.join(bundle,relative);fs.mkdirSync(path.dirname(dest),{recursive:true});
   fs.writeFileSync(dest,relative);files[relative]=createHash('sha256').update(relative).digest('hex');
  }
  fs.writeFileSync(path.join(bundle,'BIOTECH_R7_FILES.json'),JSON.stringify({version:1,files}));
  const dry=installBiotechPcR7({bundleRoot:bundle,dataRoot});assert.equal(dry.status,'READY_TO_INSTALL');
  assert.equal(installBiotechPcR7({bundleRoot:bundle,dataRoot,install:true}).status,'INSTALLED_VERIFIED');
  assert.equal(fs.readFileSync(path.join(legacy,'no-change.txt'),'utf8'),'seven-original');
  const toDrift=path.join(dataRoot,'themes','biotech','source-r7','BIOTECH_R7_SCHEDULED.cmd');
  fs.writeFileSync(toDrift,'external-change');
  assert.throws(()=>installBiotechPcR7({bundleRoot:bundle,dataRoot,install:true}),/BIOTECH_R7_INSTALL_SOURCE_DRIFT/);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
