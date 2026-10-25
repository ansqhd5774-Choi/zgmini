import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {collectMissingOnly,deriveMissingOnlyPlan} from
  '../scripts/pc-writer/theme-space-satellite-r14-missing-only.mjs';

const sha=b=>createHash('sha256').update(b).digest('hex');
const scope='SPACE_SATELLITE_R14_MISSING_ONLY_20261025';
const expected=['WARP','ORBX','MARS','ARKX','DIPR','WSPC'];
const evidence=()=>({report:'SPACE_SATELLITE_R13_EXISTING_PC_UNIVERSE_RAW_AUDIT',
 sourceManifestSha256:'b4f628d734e61f239c83ebd77c32c3c73e7eaaaf7c09bf260351e730cb861b38',
 sharedSpyManifestSha256:'76dfaca72fd0ded5e648ee15cceca5628288c11463214bd14ede01c2b5c4746e',
 sharedSpyNy15Dates:706,records:[
 {ticker:'UFO',rawShaAudited:true,spyCommonNy15Dates:656,lastEtfNy15Date:'2026-10-23',latestDatesAgree:true},
 {ticker:'NASA',rawShaAudited:true,spyCommonNy15Dates:144,lastEtfNy15Date:'2026-10-23',latestDatesAgree:true},
 {ticker:'WARP',stage:'NO_LOCAL_RAW',rawFiles:0,rawShaAudited:false},
 {ticker:'ORBX',stage:'NO_LOCAL_RAW',rawFiles:0,rawShaAudited:false},
 {ticker:'MARS',stage:'NO_LOCAL_RAW',rawFiles:0,rawShaAudited:false},
 {ticker:'ARKX',rawFiles:1,rawShaAudited:true,spyCommonNy15Dates:494,
  lastEtfNy15Date:'2025-12-18',latestDatesAgree:false},
 {ticker:'ROKT',rawShaAudited:true,spyCommonNy15Dates:446,
  lastEtfNy15Date:'2026-10-23',latestDatesAgree:true},
 {ticker:'DIPR',stage:'NO_LOCAL_RAW',rawFiles:0,rawShaAudited:false},
 {ticker:'WSPC',stage:'NO_LOCAL_RAW',rawFiles:0,rawShaAudited:false}
 ]});

function fixture(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-r14-fixture-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const home=path.join(root,'themes','space-satellite');
 fs.mkdirSync(path.join(home,'raw'),{recursive:true});
 fs.mkdirSync(path.join(home,'state'),{recursive:true});
 const files=[];
 for(const symbol of ['UFO','NASA','ROKT','ARKX']){
  const bytes=Buffer.from(JSON.stringify({symbol,timestamp:'2025-12-18T20:00:00Z',
    close:10,is_gap:false})+'\n');
  const digest=sha(bytes),relative=`raw/${symbol}_${digest}.jsonl`;
  fs.writeFileSync(path.join(home,relative),bytes);
  files.push({path:relative,sha256:digest,source:'https://getmarkethistory.com',
    priceMode:'RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE'});
 }
 const manifestPath=path.join(home,'raw-manifest.json');
 fs.writeFileSync(manifestPath,JSON.stringify({version:1,themeId:'space-satellite',files}));
 const baseline=fs.readFileSync(manifestPath);
 const snapshot={...deriveMissingOnlyPlan(evidence()),scope,
  baseManifestSha256:sha(baseline),sharedSpyManifestSha256:'FIXTURE_SPY'};
 const seen=[];
 const fetchImpl=async url=>{
  const u=new URL(String(url));seen.push(u);
  const ticker=u.pathname.split('/').at(-2),timestamp='2026-10-23T19:00:00Z';
  const price=JSON.stringify({symbol:ticker,timestamp,close:31,is_gap:false})+'\n';
  return new Response(price,{headers:{'x-data-through':'2026-10-23T20:00:00Z'}});
 };
 return {root,home,manifestPath,files,baseline,snapshot,seen,fetchImpl};
}

test('R14 derives six intervals only; all existing current raw stays untouched',()=>{
 const plan=deriveMissingOnlyPlan(evidence());
 assert.deepEqual(plan.plan.map(x=>x.ticker),expected);
 assert.deepEqual(plan.excludedPreserved,['UFO','NASA','ROKT']);
 assert.equal(plan.plan.find(x=>x.ticker==='ARKX').start,'2025-12-19');
 assert.equal(plan.plan.find(x=>x.ticker==='ARKX').end,'2026-10-23');
 assert.equal(plan.finalBasketSelected,false);
 const changed=evidence();changed.records.find(x=>x.ticker==='ARKX').lastEtfNy15Date='2026-10-23';
 assert.throws(()=>deriveMissingOnlyPlan(changed),/R14_ARKX_DELTA_IDENTITY/);
});

test('R14 collects bounded six symbols, SHA appends and never calls UFO/NASA/ROKT',async t=>{
 const f=fixture(t);
 const result=await collectMissingOnly({dataRoot:f.root,fixtureSnapshot:f.snapshot,
  fetchImpl:f.fetchImpl});
 assert.equal(result.status,'PRIVATE_MISSING_ONLY_RAW_COLLECTION_COMPLETE');
 assert.equal(result.providerCalls,6);assert.equal(result.rawFilesStored,6);
 assert.deepEqual(f.seen.map(x=>x.pathname.split('/').at(-2)),expected);
 assert.equal(f.seen.find(x=>x.pathname.includes('/ARKX/')).searchParams.get('start'),'2025-12-19');
 const manifest=JSON.parse(fs.readFileSync(f.manifestPath,'utf8'));
 assert.deepEqual(manifest.files.slice(0,4),f.files);
 assert.equal(manifest.files.length,10);
 for(const entry of manifest.files){
  assert.equal(sha(fs.readFileSync(path.join(f.home,entry.path))),entry.sha256);
 }
 const retry=await collectMissingOnly({dataRoot:f.root,fixtureSnapshot:f.snapshot,
  fetchImpl:async()=>{throw Error('MUST_NOT_RECOLLECT');}});
 assert.equal(retry.providerCalls,0);assert.equal(retry.rawFilesStored,0);
 assert.equal(retry.status,'PRIVATE_MISSING_ONLY_RAW_COLLECTION_COMPLETE');
 assert.equal(result.d1Writes,0);assert.equal(result.schedulerWrites,0);
 assert.equal(result.publicWrites,0);
});

test('R14 source drift stops before checkpoint and makes zero provider requests',async t=>{
 const f=fixture(t);const wrong={...f.snapshot,baseManifestSha256:'0'.repeat(64)};
 await assert.rejects(collectMissingOnly({dataRoot:f.root,fixtureSnapshot:wrong,
  fetchImpl:async()=>{throw Error('MUST_NOT_CALL');}}),/R14_BASELINE_MANIFEST_DRIFT/);
 assert.equal(fs.readFileSync(f.manifestPath).equals(f.baseline),true);
 assert.equal(fs.existsSync(path.join(f.home,'state','collection-space-r14-missing-only.json')),false);
});

test('R14 HTTP error stops without blind retry or old-manifest mutation',async t=>{
 const f=fixture(t);let calls=0;
 const failed=await collectMissingOnly({dataRoot:f.root,fixtureSnapshot:f.snapshot,
  fetchImpl:async()=>{calls++;return new Response('402',{status:402});}});
 assert.equal(failed.status,'STOP_HTTP_402');assert.equal(calls,1);
 assert.equal(fs.readFileSync(f.manifestPath).equals(f.baseline),true);
 const another=await collectMissingOnly({dataRoot:f.root,fixtureSnapshot:f.snapshot,
  fetchImpl:async()=>{calls++;throw Error('NO_RETRY');}});
 assert.equal(another.status,'STOP_PREVIOUS_FAILURE_REVIEW_REQUIRED');
 assert.equal(another.providerCalls,0);assert.equal(calls,1);
});

test('R14 maxRequests bounds a run and next manual execution resumes',async t=>{
 const f=fixture(t);let calls=0;
 const fetchImpl=async u=>{
  calls++;return f.fetchImpl(u);
 };
 const first=await collectMissingOnly({dataRoot:f.root,fixtureSnapshot:f.snapshot,
  fetchImpl,maxRequests:2});
 assert.equal(first.providerCalls,2);
 assert.equal(first.status,'CHECKPOINT_READY_TO_MANUALLY_RESUME');
 const second=await collectMissingOnly({dataRoot:f.root,fixtureSnapshot:f.snapshot,
  fetchImpl,maxRequests:6});
 assert.equal(second.providerCalls,4);
 assert.equal(second.status,'PRIVATE_MISSING_ONLY_RAW_COLLECTION_COMPLETE');
 assert.equal(calls,6);
});

test('R14 stale provider header stops before any raw append',async t=>{
 const f=fixture(t);let calls=0;
 const result=await collectMissingOnly({dataRoot:f.root,fixtureSnapshot:f.snapshot,
  fetchImpl:async()=>{calls++;return new Response('not used',{
    headers:{'x-data-through':'2026-10-22T20:00:00Z'}});}});
 assert.equal(result.status,'STOP_STALE_SOURCE');assert.equal(calls,1);
 assert.equal(fs.readFileSync(f.manifestPath).equals(f.baseline),true);
 assert.equal(fs.readdirSync(path.join(f.home,'raw')).length,4);
});

test('R14 rejects mismatched ticker or invalid bar; no existing raw changes',async t=>{
 const f=fixture(t);
 await assert.rejects(collectMissingOnly({dataRoot:f.root,fixtureSnapshot:f.snapshot,
  fetchImpl:async()=>new Response(JSON.stringify({symbol:'UFO',
   timestamp:'2026-10-23T19:00:00Z',close:22,is_gap:false})+'\n',{
   headers:{'x-data-through':'2026-10-23T20:00:00Z'}})}),/R14_INVALID_PRICE_BAR/);
 assert.equal(fs.readFileSync(f.manifestPath).equals(f.baseline),true);
 assert.equal(fs.readdirSync(path.join(f.home,'raw')).length,4);
});
