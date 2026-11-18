import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {publishApprovedGmhSevenR178,R32_KEY}
 from '../scripts/pc-writer/theme-seven-gmh-r178-authorized-cas.mjs';
import {THEME_ETF_ONLY_PAIRS,THEME_ETF_ONLY_PUBLIC_KEY,
 THEME_ETF_ONLY_PUBLIC_VERSION,THEME_ETF_ONLY_METHOD}
 from '../worker/theme-etf-only-public.mjs';
import {THEME_ETF_ROLLING_KEY,THEME_ETF_ROLLING_VERSION,immutableBaseHash}
 from '../worker/theme-etf-rolling-public.mjs';

const NOW=Date.parse('2026-11-18T10:00:00Z');
const stamp='2026-11-16T11:47:59.532Z';
const datesTo=day=>Array.from({length:252},(_,i)=>new Date(
 Date.parse(day+'T00:00:00Z')-(251-i)*86400000).toISOString().slice(0,10));
const themes=day=>THEME_ETF_ONLY_PAIRS.map(pair=>({
 theme:pair.theme,etfs:[...pair.etfs],
 history:datesTo(day).map(date=>({date,score:40}))
}));
function seed(){
 return {status:'READY',version:THEME_ETF_ONLY_PUBLIC_VERSION,
  methodologyVersion:THEME_ETF_ONLY_METHOD,
  observationDate:'2026-10-16',publicationAuthorized:true,
  upstreamCommercialRightsVerified:true,derivedLicenseVerified:true,
  individualStocksUsed:0,scoreMethod:'ETF_ONLY_PROXY',
  sourcePriceMode:'UNADJUSTED_HOURLY_CLOSE_PROXY_DISCLOSED',
  sourceStoredAt:'2026-10-17T01:00:00Z',
  publishedAt:'2026-10-17T01:00:00Z',
  sourceVersion:'immutable-test-seed',
  weights:{trend:.4,relativeStrength:.2,volatility:.4},
  pairWeight:.5,themes:themes('2026-10-16').map(t=>({...t,latestScore:40}))};
}
async function fixtures(){
 const base=seed();
 const draft={
  status:'CANDIDATE_GMH_ONLY_PRIVATE_NOT_APPROVED',
  version:THEME_ETF_ROLLING_VERSION,
  phase:'CONFIRMED',methodologyVersion:THEME_ETF_ONLY_METHOD,
  publicationAuthorized:false,upstreamCommercialRightsVerified:false,
  derivedLicenseVerified:false,sourcePriceReconciled:false,
  individualStocksUsed:0,baseObservationDate:base.observationDate,
  baseHash:await immutableBaseHash(base),
  coverage:{etfs:13,benchmark:'SPY',complete:true},
  observationDate:'2026-11-13',confirmedObservationDate:'2026-11-13',
  sourceVersion:'GMH_MANIFEST_SHA256_'+'a'.repeat(64),
  sourceStoredAt:stamp,asOf:stamp,
  themes:themes('2026-11-13').map(t=>({...t,score:40})),
  provisional:{points:[]},
  lineage:{confirmedPrimaryCount:252,secondaryPendingCount:0,
   latestCompletedSession:'2026-11-13',
   primarySource:'GETMARKETHISTORY_1H_CLOSE',secondarySource:null}
 };
 const prepared={status:'R178_GMH_ONLY_PRIVATE_DRAFT_NOT_PUBLISHED',
  rolling:draft,provenance:{
   inputManifestSha256:'a'.repeat(64),checkpointSha256:'c'.repeat(64),
   privateArtifactSha256:'b'.repeat(64),providerOnlyGmh:true,
   sourceStoredAtAttestedByManifest:true,rawFilesRehashedNow:true,
   rightsVerified:false,publicationAuthorized:false,
   d1CasVerified:false,r32NonRegressionVerified:false
  }};
 const record=JSON.parse(JSON.stringify(draft));
 record.status='READY';
 record.publicationAuthorized=true;
 record.upstreamCommercialRightsVerified=true;
 record.derivedLicenseVerified=true;
 record.sourcePriceReconciled=true;
 record.asOf='2026-11-18T09:00:00Z';
 record.publishedAt=record.asOf;
 const r32={status:'READY',version:'THEME_LEGACY_NINE_R37_PUBLIC_V1',
  methodologyVersion:'ETF_ONLY_T40_R20_V40_ADAPTIVE_R2_DATED_ISSUER_AUM_R32',
  observationDate:'2026-10-30',themes:Array.from({length:9},(_,i)=>({
   theme:'R32 independent '+i,
   history:datesTo('2026-10-30').map(date=>({date,score:45}))
  }))};
 return {base,prepared,record,r32};
}
function storage(f,{changeR32After=false,changeRollingBefore=false}={}){
 const old={body:{status:'READY',version:THEME_ETF_ROLLING_VERSION,
  observationDate:'2026-10-28',
  lineage:{secondarySource:'MARKETPARQUET_ETF_DAILY_SPLIT_ADJUSTED'}},
  storedAt:1793337682201};
 const current=JSON.parse(JSON.stringify(old));
 const r32={body:f.r32,storedAt:1793793697333};
 let writes=0,r32Reads=0;
 return {
  stats:()=>({writes,r32Reads,storedAt:current.storedAt}),
  async readSeed(){return f.base},
  async read(key){
   if(key===R32_KEY){
    r32Reads++;
    if(changeR32After&&r32Reads>1)return {...r32,storedAt:r32.storedAt+1};
    return JSON.parse(JSON.stringify(r32));
   }
   assert.equal(key,THEME_ETF_ROLLING_KEY);
   if(changeRollingBefore&&writes===0)return {...current,storedAt:current.storedAt+1};
   return JSON.parse(JSON.stringify(current));
  },
  async replace(key,record,prior){
   assert.equal(key,THEME_ETF_ROLLING_KEY);
   assert.equal(prior,old.storedAt);
   writes++;
   current.body=JSON.parse(JSON.stringify(record));
   current.storedAt=NOW-1000;
   return {storedAt:current.storedAt};
  }
 };
}
const approved=async evidence=>{
 assert.equal(evidence.operation,'R178_GMH_ONLY_SINGLE_D1_OUTPUT');
 assert.equal(evidence.feedKey,THEME_ETF_ROLLING_KEY);
 assert.equal(evidence.sourceStoredAt,stamp);
 assert.match(evidence.projectionSha256,/^[a-f0-9]{64}$/);
 assert.equal(evidence.manifestSha256,'a'.repeat(64));
 return true; // fixture simulates separately authenticated approved Writer
};
test('GMH-only exact R178 uses existing single-key CAS, re-reads R32 and returns no price',async()=>{
 const f=await fixtures(),db=storage(f);
 let callback=0;
 const result=await publishApprovedGmhSevenR178({
  prepared:f.prepared,record:f.record,storage:db,
  verifyApprovedEffect:async ev=>{callback++;return approved(ev);},now:NOW
 });
 assert.equal(result.status,'R178_GMH_ONLY_D1_CAS_AND_R32_READBACK_VERIFIED');
 assert.equal(result.outputKey,THEME_ETF_ROLLING_KEY);
 assert.equal(result.observationDate,'2026-11-13');
 assert.equal(result.sourceStoredAt,stamp);
 assert.equal(result.d1Writes,1);
 assert.equal(result.r32Writes,0);
 assert.equal(result.seedWrites,0);
 assert.equal(result.providerCalls,0);
 assert.equal(result.publicApiVerified,false);
 assert.deepEqual(db.stats(),{writes:1,r32Reads:2,storedAt:NOW-1000});
 assert.equal(callback,1);
 assert.doesNotMatch(JSON.stringify(result),
  /rawClose|open|high|low|volume|rawPrice|MARKETPARQUET/);
});
test('without actual external publisher/rights/price-policy authority writes stay zero',async()=>{
 const f=await fixtures(),db=storage(f);
 for(const change of [
  x=>{x.prepared.provenance.sourceStoredAtAttestedByManifest=false;},
  x=>{x.prepared.provenance.rawFilesRehashedNow=false;},
  x=>{x.prepared.rolling.lineage.secondarySource='MARKETPARQUET';},
  x=>{x.record.sourcePriceReconciled=false;},
  x=>{x.record.upstreamCommercialRightsVerified=false;},
  x=>{x.record.themes[0].score=99;},
  x=>{x.record.rawClose=[100,101];},
  x=>{x.record.sourceStoredAt='2026-11-18T09:00:00Z';}
 ]){
  const v=await fixtures();change(v);
  await assert.rejects(
   publishApprovedGmhSevenR178({...v,storage:db,
    verifyApprovedEffect:approved,now:NOW}),
   /W03_R178_PUBLISH_/);
  assert.equal(db.stats().writes,0);
 }
 await assert.rejects(publishApprovedGmhSevenR178({
  ...f,storage:db,now:NOW
 }),{code:'W03_R178_PUBLISH_APPROVED_WRITER_REQUIRED'});
 assert.equal(db.stats().writes,0);
 await assert.rejects(publishApprovedGmhSevenR178({
  ...f,storage:db,verifyApprovedEffect:async()=>false,now:NOW
 }),{code:'W03_R178_PUBLISH_OPERATOR_LICENSE_AND_PRICE_POLICY_NOT_APPROVED'});
 assert.equal(db.stats().writes,0);
});
test('existing R32 drift aborts after single CAS without auto retry or rollback',async()=>{
 const f=await fixtures(),db=storage(f,{changeR32After:true});
 await assert.rejects(publishApprovedGmhSevenR178({
  ...f,storage:db,verifyApprovedEffect:approved,now:NOW
 }),{code:'W03_R178_PUBLISH_R32_CHANGED_AFTER_PUBLICATION_NO_RETRY'});
 assert.equal(db.stats().writes,1);
 assert.equal(db.stats().r32Reads,2);
});
test('expired GMH observation cannot be rescued with fresh D1 publish timestamp',async()=>{
 const f=await fixtures(),db=storage(f);
 f.record.asOf='2026-11-24T08:00:00Z';
 f.record.publishedAt=f.record.asOf;
 const future=Date.parse('2026-11-24T08:30:00Z');
 await assert.rejects(publishApprovedGmhSevenR178({
  ...f,storage:db,verifyApprovedEffect:approved,now:future
 }),{code:'W03_R178_PUBLISH_READER_OR_IMMUTABLE_SEED_REJECTED'});
 assert.equal(db.stats().writes,0);
});
test('compare-and-swap failures are preserved and never treated as successful publication',async()=>{
 const f=await fixtures(),db=storage(f);
 db.replace=async()=>{throw Object.assign(new Error('D1_COMPARE_AND_SWAP_FAILED'),
  {code:'D1_COMPARE_AND_SWAP_FAILED'});};
 await assert.rejects(publishApprovedGmhSevenR178({
  ...f,storage:db,verifyApprovedEffect:approved,now:NOW
 }),{code:'D1_COMPARE_AND_SWAP_FAILED'});
 assert.equal(db.stats().writes,0);
});
