import test from 'node:test';
import assert from 'node:assert/strict';
import {buildNineR54PublicRecord} from '../scripts/pc-writer/theme-nine-r54-public-record.mjs';
import {verifyNineR54Production} from '../scripts/pc-writer/theme-nine-r54-deployment-gate.mjs';
import {eligibleNineR37,THEME_NINE_R37_ROSTER,THEME_NINE_R37_VERSION,
 THEME_NINE_R37_METHOD,THEME_NINE_R37_ROSTER_SHA}
 from '../worker/theme-nine-r37-public.mjs';

const now=Date.parse('2026-10-28T05:00:00Z');
const days=Array.from({length:252},(_,i)=>new Date(
 Date.parse('2026-10-26T00:00:00Z')-(251-i)*86400000).toISOString().slice(0,10));
const themes=THEME_NINE_R37_ROSTER.map(t=>({theme:t.theme,etfs:[...t.etfs],
 score:53,history:days.map(date=>({date,score:53}))}));
const sha='a'.repeat(64);
const base={status:'READY',phase:'PROVISIONAL',observationDate:'2026-10-26',
 confirmedObservationDate:'2026-10-26',themes,
 provisional:{asOf:'2026-10-27',points:[{date:'2026-10-27',
  scores:Object.fromEntries(themes.map(t=>[t.theme,60]))}]}};
const candidate={contract:'THEME_NINE_R48_R47_PRIVATE_R37_CANDIDATE_V1',
 status:'PRIVATE_CANDIDATE_NOT_PUBLISHED',phase:'PROVISIONAL',
 sourceContract:'THEME_NINE_R47_PRIVATE_RECURRING_NINE_THEME_SHADOW_V1',
 version:THEME_NINE_R37_VERSION,methodologyVersion:THEME_NINE_R37_METHOD,
 rosterSha256:THEME_NINE_R37_ROSTER_SHA,
 sourcePriceMode:'RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE',
 historicalAumMode:'FIXED_OFFICIAL_ISSUER_AUM_SNAPSHOT_WITH_ORIGINAL_DATES',
 benchmark:'SPY',individualStocksUsed:0,ETFPositions:64,uniqueETFs:63,
 rawManifestSha256:sha,r25InputSha256:sha,shadowSha256:sha,
 officialAumEvidenceSha256:sha,baselineManifestSha256:sha,
 deltaManifestSha256:sha,
 officialAumAsOf:Object.fromEntries([...new Set(THEME_NINE_R37_ROSTER.flatMap(t=>t.etfs))]
  .map(s=>[s,'2026-10-26'])),
 observationDate:'2026-10-26',themes,publicationAuthorized:false,
 sourceManifestVerified:false,privateReplayVerified:false,
 upstreamCommercialRightsVerified:false,derivedLicenseVerified:false,
 sourcePriceReconciled:false,derivedOnlyNoRaw:true,
 d1Writes:0,schedulerWrites:0,providerCalls:0,
 provisional:{asOf:'2026-10-27',points:[{date:'2026-10-27',
  scores:Object.fromEntries(themes.map(t=>[t.theme,62]))}]}};
const args={candidate,candidateSha256:sha,publicBase:base,
 sourceStoredAt:'2026-10-28T04:55:00Z',sourceManifestVerified:true,
 privateReplayVerified:true,publisherConsent:true,now};

test('R54 matches tenth-theme anonymous-risk disclosure and R37 reader',()=>{
 const record=buildNineR54PublicRecord(args);
 assert.equal(record.sourcePriceReconciled,false);
 assert.equal(record.upstreamCommercialRightsVerified,false);
 assert.equal(record.derivedLicenseVerified,false);
 assert.equal(record.accountGoodStandingVerified,false);
 assert.equal(record.anonymousScopeIndependentlyConfirmed,false);
 assert.equal(record.licensingRiskAcceptedByPublisher,true);
 assert.equal(record.publicationAuthorized,true);
 assert.equal(record.sourceManifestVerified,true);
 assert.equal(record.privateReplayVerified,true);
 assert.equal(record.provisional.points[0].scores['로봇·자동화'],62);
 assert.equal(eligibleNineR37(record,base,{now,storedAt:now}),true);
});

test('R54 blocks missing consent, false verification and date misalignment',()=>{
 for(const changes of [
  {publisherConsent:false},
  {sourceManifestVerified:false},
  {privateReplayVerified:false},
  {candidateSha256:'INVALID'},
  {candidate:{...candidate,publicationAuthorized:true}},
  {candidate:{...candidate,sourcePriceMode:'OFFICIAL_CLOSE'}},
  {publicBase:{...base,observationDate:'2026-10-27',confirmedObservationDate:'2026-10-27'}},
 ])assert.throws(()=>buildNineR54PublicRecord({...args,...changes}),
  /THEME_NINE_R54_/);
});

test('Cloudflare gate matches the exact deployed main source and worker check',async()=>{
 const bytes=Buffer.from('x'.repeat(120));
 const main='a'.repeat(40);
 const good={check_runs:[{name:'Workers Builds: zgmini-migration-candidate-r5',
  app:{slug:'cloudflare-workers-and-pages'},status:'completed',
  conclusion:'success',details_url:'https://dash.cloudflare.com/workers/services/view/zgmini-migration-candidate-r5/production/builds/abc'}]};
 const fetchImpl=async url=>({ok:true,async json(){return url.includes('/check-runs')?good:{sha:main};},
  async arrayBuffer(){return bytes;}});
 const passed=await verifyNineR54Production({readerBytes:bytes,fetchImpl});
 assert.equal(passed.status,'MAIN_CLOUDFLARE_PRODUCTION_VERIFIED');
 await assert.rejects(verifyNineR54Production({readerBytes:bytes,
  fetchImpl:async url=>({ok:true,async json(){return url.includes('/check-runs')?{check_runs:[]}:{sha:main};},
   async arrayBuffer(){return bytes;}})}),/PRODUCTION_BUILD_NOT_VERIFIED/);
 await assert.rejects(verifyNineR54Production({readerBytes:bytes,
  fetchImpl:async url=>({ok:true,async json(){return url.includes('/check-runs')?good:{sha:main};},
   async arrayBuffer(){return Buffer.from('wrong code');}})}),/READER_NOT_MATCHED/);
});
