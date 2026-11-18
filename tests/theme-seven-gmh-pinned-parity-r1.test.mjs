import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {reconcilePinnedGmhSeven}
 from '../scripts/pc-writer/theme-seven-gmh-pinned-parity-r1.mjs';
import {THEME_ETF_ONLY_PAIRS,THEME_ETF_ONLY_PUBLIC_VERSION,
 THEME_ETF_ONLY_METHOD} from '../worker/theme-etf-only-public.mjs';

const sha=x=>createHash('sha256').update(x).digest('hex');
const now=Date.parse('2026-11-18T07:00:00Z');
const stored='2026-11-14T03:00:00Z';
const manifestSha='a'.repeat(64);
const historyDays=last=>{
 const dates=[];let at=Date.parse(last+'T00:00:00Z');
 while(dates.length<252){
  const d=new Date(at);
  if(d.getUTCDay()!==0&&d.getUTCDay()!==6)dates.push(d.toISOString().slice(0,10));
  at-=86_400_000;
 }
 return dates.reverse();
};
const rows=last=>THEME_ETF_ONLY_PAIRS.map(pair=>({
 theme:pair.theme,etfs:[...pair.etfs],
 history:historyDays(last).map(date=>({date,score:40}))
}));
const privateResult=()=>({
 schema:'ZGMINI_W03_GMH_SEVEN_PRIVATE_252_V1',
 status:'PRIVATE_GMH_ONLY_7X252_NOT_PUBLISHED',
 inputProvider:'GETMARKETHISTORY_FREE_HOURLY_ONLY',
 methodologyVersion:THEME_ETF_ONLY_METHOD,
 scoreMethod:'ETF_ONLY_PROXY',
 priceMode:'UNADJUSTED_15_NY_HOURLY_PROXY_WITH_OFFICIAL_EARLY_CLOSE_12',
 publicationAuthorized:false,upstreamCommercialRightsVerified:false,
 derivedLicenseVerified:false,providerCalls:0,d1Writes:0,publicWrites:0,
 rawManifestSha256:manifestSha,scorerSha256:'b'.repeat(64),
 observationDate:'2026-11-13',
 firstHistoryDate:historyDays('2026-11-13')[0],
 sourceWindow:{from:'2024-03-04',through:'2026-11-13'},
 commonSessionCount:679,themes:rows('2026-11-13')
});
const legacySeed=()=>({
 version:THEME_ETF_ONLY_PUBLIC_VERSION,status:'READY',
 methodologyVersion:THEME_ETF_ONLY_METHOD,
 observationDate:'2026-10-16',themes:rows('2026-10-16')
  .map(t=>({...t,latestScore:40}))
});
function input(p=privateResult(),seed=legacySeed()){
 const privateArtifactBytes=Buffer.from(JSON.stringify(p));
 const legacySeedBodyBytes=Buffer.from(JSON.stringify(seed));
 return {privateArtifactBytes,legacySeedBodyBytes,
  expectedPrivateSha256:sha(privateArtifactBytes),
  expectedLegacySeedBodySha256:sha(legacySeedBodyBytes),
  expectedRawManifestSha256:manifestSha,sourceStoredAt:stored,now};
}

test('pinned real trading-day-shaped inputs reconcile 232x7 but remain private',()=>{
 const result=reconcilePinnedGmhSeven(input());
 assert.equal(result.status,'PRIVATE_PINNED_PARITY_VERIFIED_NOT_PUBLISHED');
 assert.equal(result.overlapDates,232);
 assert.equal(result.matchedScores,1624);
 assert.equal(result.mismatchedScores,0);
 assert.equal(result.privateArtifactBytesRehashed,true);
 assert.equal(result.legacySeedBodyBytesRehashed,true);
 assert.equal(result.rawFilesRehashedNow,false);
 assert.equal(result.pcFilesystemReadAuthenticatedHere,false);
 assert.equal(result.d1ReadAuthenticatedHere,false);
 assert.equal(result.approvedD1Write,false);
 assert.equal(result.upstreamRightsAttested,false);
 assert.equal(result.d1Writes,0);
 assert.doesNotMatch(JSON.stringify(result),/history|rawClose|volume|latestScore/);
});

test('both input buffers must match separately attested SHA values',()=>{
 const data=input();
 assert.throws(()=>reconcilePinnedGmhSeven({
  ...data,expectedPrivateSha256:'f'.repeat(64)
 }),{code:'W03_PINNED_PARITY_PRIVATE_SHA_MISMATCH'});
 assert.throws(()=>reconcilePinnedGmhSeven({
  ...data,expectedLegacySeedBodySha256:'f'.repeat(64)
 }),{code:'W03_PINNED_PARITY_LEGACY_SHA_MISMATCH'});
 assert.throws(()=>reconcilePinnedGmhSeven({
  ...data,expectedRawManifestSha256:'f'.repeat(64)
 }),{code:'W03_PINNED_PARITY_RAW_MANIFEST_REFERENCE_MISMATCH'});
 assert.throws(()=>reconcilePinnedGmhSeven({
  ...data,privateArtifactBytes:Buffer.from('{}')
 }),{code:'W03_PINNED_PARITY_PRIVATE_SHA_MISMATCH'});
});

test('the verified bytes are rejected when an overlapping score changes',()=>{
 const p=privateResult();const overlap='2026-10-05';
 p.themes[1].history.find(x=>x.date===overlap).score=41;
 assert.throws(()=>reconcilePinnedGmhSeven(input(p)),
  {code:'W03_SEVEN_SEED_HISTORICAL_SCORE_RECONCILIATION_FAILED'});
});

test('unattested or inconsistent timestamps and public-rights flags never pass',()=>{
 const data=input();
 for(const sourceStoredAt of ['2026-11-12T23:59:59Z','2026-11-19T00:00:00Z','invalid']){
  assert.throws(()=>reconcilePinnedGmhSeven({...data,sourceStoredAt}),
   {code:'W03_PINNED_PARITY_SOURCE_STORED_AT_INVALID'});
 }
 const p=privateResult();p.publicationAuthorized=true;
 assert.throws(()=>reconcilePinnedGmhSeven(input(p)),
  {code:'W03_SEVEN_SEED_PRIVATE_GMH_CONTRACT'});
 const scheduled=privateResult();scheduled.schedulerWrites=1;
 assert.throws(()=>reconcilePinnedGmhSeven(input(scheduled)),
  {code:'W03_PINNED_PARITY_PRIVATE_SCHEDULER_WRITE_CONTRACT'});
 const neverScheduled=privateResult();neverScheduled.schedulerWrites=0;
 assert.equal(reconcilePinnedGmhSeven(input(neverScheduled)).status,
  'PRIVATE_PINNED_PARITY_VERIFIED_NOT_PUBLISHED');
});

test('private GMH histories must contain derived date/score fields only',()=>{
 const withClose=privateResult();
 withClose.themes[0].history[0].close=123.45;
 assert.throws(()=>reconcilePinnedGmhSeven(input(withClose)),
  {code:'W03_PINNED_PARITY_PRIVATE_HISTORY_FIELD_SCOPE'});
 const withVolume=privateResult();
 withVolume.themes[1].history[17].volume=100000;
 assert.throws(()=>reconcilePinnedGmhSeven(input(withVolume)),
  {code:'W03_PINNED_PARITY_PRIVATE_HISTORY_FIELD_SCOPE'});
 const withRawSeries=privateResult();
 withRawSeries.themes[2].rawBars=[{close:1}];
 assert.throws(()=>reconcilePinnedGmhSeven(input(withRawSeries)),
  {code:'W03_PINNED_PARITY_PRIVATE_THEME_FIELD_SCOPE'});
 const withRawTop=privateResult();
 withRawTop.rawCloses=[123.45];
 assert.throws(()=>reconcilePinnedGmhSeven(input(withRawTop)),
  {code:'W03_PINNED_PARITY_PRIVATE_TOP_LEVEL_FIELD_SCOPE'});
 const withRawWindow=privateResult();
 withRawWindow.sourceWindow.rawSeries=[1,2,3];
 assert.throws(()=>reconcilePinnedGmhSeven(input(withRawWindow)),
  {code:'W03_PINNED_PARITY_PRIVATE_TOP_LEVEL_FIELD_SCOPE'});
});
