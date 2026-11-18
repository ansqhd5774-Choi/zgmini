import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareGmhSevenPrivateSeed} from '../scripts/pc-writer/theme-seven-gmh-private-seed-r1.mjs';
import {THEME_ETF_ONLY_PAIRS,THEME_ETF_ONLY_PUBLIC_VERSION,
 THEME_ETF_ONLY_METHOD,validateThemeEtfOnlyPublic}
 from '../worker/theme-etf-only-public.mjs';

const now=Date.parse('2026-11-18T06:30:00Z');
const stamp='2026-11-14T03:00:00.000Z';
const shaA='a'.repeat(64),shaB='b'.repeat(64);
const datesTo=last=>Array.from({length:252},(_,i)=>new Date(
 Date.parse(last+'T00:00:00Z')-(251-i)*86400000)
 .toISOString().slice(0,10));
const themes=(last,withRaw=false)=>THEME_ETF_ONLY_PAIRS.map(p=>({
 theme:p.theme,etfs:[...p.etfs],
 history:datesTo(last).map(date=>({date,score:40,
  ...(withRaw?{rawClose:12.4,volume:4000}:{} )}))
}));
function privateGmh(){
 const v=themes('2026-11-13',true);
 return {schema:'ZGMINI_W03_GMH_SEVEN_PRIVATE_252_V1',
  status:'PRIVATE_GMH_ONLY_7X252_NOT_PUBLISHED',
  observationDate:'2026-11-13',firstHistoryDate:v[0].history[0].date,
  methodologyVersion:THEME_ETF_ONLY_METHOD,scoreMethod:'ETF_ONLY_PROXY',
  priceMode:'UNADJUSTED_15_NY_HOURLY_PROXY_WITH_OFFICIAL_EARLY_CLOSE_12',
  inputProvider:'GETMARKETHISTORY_FREE_HOURLY_ONLY',
  rawManifestSha256:shaA,scorerSha256:shaB,
  sourceWindow:{from:'2024-03-04',through:'2026-11-13'},
  commonSessionCount:679,themes:v,publicationAuthorized:false,
  upstreamCommercialRightsVerified:false,derivedLicenseVerified:false,
  providerCalls:0,d1Writes:0,publicWrites:0};
}
function seed(){
 const a=themes('2026-10-16');
 return {version:THEME_ETF_ONLY_PUBLIC_VERSION,status:'READY',
  methodologyVersion:THEME_ETF_ONLY_METHOD,observationDate:'2026-10-16',
  publicationAuthorized:true,upstreamCommercialRightsVerified:true,
  derivedLicenseVerified:true,sourceVersion:'OLDER_OTHER_PROVENANCE',
  themes:a.map(t=>({...t,latestScore:40}))};
}
const options=()=>({legacySeed:seed(),sourceStoredAt:stamp,now});
test('GMH private 7x252 matches old seed but never transfers historical rights',()=>{
 const result=prepareGmhSevenPrivateSeed(privateGmh(),options());
 assert.equal(result.status,'PRIVATE_GMH_SEVEN_SEED_RECONCILED_NOT_PUBLISHED');
 assert.equal(result.draft.themes.length,7);
 assert.equal(result.draft.themes.every(t=>t.history.length===252),true);
 assert.equal(result.draft.observationDate,'2026-11-13');
 assert.equal(result.draft.sourceVersion,'GMH_MANIFEST_SHA256_'+shaA);
 assert.equal(result.reconciliation.overlapDates,224);
 assert.equal(result.reconciliation.matchedScores,224*7);
 assert.equal(result.reconciliation.rawFilesRehashedNow,false);
 assert.equal(result.reconciliation.upstreamRightsAttested,false);
 assert.equal(result.reconciliation.approvedD1Write,false);
 assert.equal(result.draft.publicationAuthorized,false);
 assert.equal(result.draft.upstreamCommercialRightsVerified,false);
 assert.equal(result.draft.derivedLicenseVerified,false);
 assert.equal(result.draft.status,'CANDIDATE_GMH_ONLY_PRIVATE_NOT_APPROVED');
 assert.equal(result.draft.publishedAt,null);
 assert.equal(validateThemeEtfOnlyPublic(result.draft),false);
 assert.equal(result.providerCalls,0);
 assert.equal(result.sqliteWrites,0);
 assert.equal(result.d1Writes,0);
 assert.equal(result.publicWrites,0);
 const json=JSON.stringify(result);
 assert.doesNotMatch(json,/rawClose|volume|OLDER_OTHER_PROVENANCE/);
});
test('a single mismatched overlap prevents conversion instead of backfilling scores',()=>{
 const p=privateGmh();
 p.themes[2].history.at(-1).score=41; // Nov 13 is outside old seed through Oct 16
 assert.equal(prepareGmhSevenPrivateSeed(p,options()).reconciliation.mismatchedScores,0);
 const overlap=datesTo('2026-10-16').at(-12);
 p.themes[2].history.find(x=>x.date===overlap).score=41;
 assert.throws(()=>prepareGmhSevenPrivateSeed(p,options()),
  {code:'W03_SEVEN_SEED_HISTORICAL_SCORE_RECONCILIATION_FAILED'});
});
test('rejects contamination, absence of complete data and identity/date drifts',()=>{
 const changes=[
  x=>{x.inputProvider='MARKETPARQUET_FREE_SAMPLE';},
  x=>{x.publicationAuthorized=true;},
  x=>{x.derivedLicenseVerified=true;},
  x=>{x.providerCalls=1;},
  x=>{x.rawManifestSha256='NOT_A_SHA';},
  x=>{x.commonSessionCount=627;},
  x=>{x.priceMode='SPLIT_ADJUSTED';},
  x=>{x.themes[1].etfs=['SPY','CLOU'];},
  x=>{x.themes[1].history.pop();},
  x=>{x.themes[1].history[0].date='2026-02-30';},
  x=>{x.themes[1].history[5].score=null;},
  x=>{x.themes[1].history[1].date=x.themes[1].history[0].date;},
  x=>{x.firstHistoryDate='2025-01-01';}
 ];
 for(const mutate of changes){
  const p=privateGmh();mutate(p);
  assert.throws(()=>prepareGmhSevenPrivateSeed(p,options()),/W03_SEVEN_SEED_/);
 }
 const invalidSeed=seed();invalidSeed.themes[1].etfs=['SPY','CLOU'];
 assert.throws(()=>prepareGmhSevenPrivateSeed(privateGmh(),
  {...options(),legacySeed:invalidSeed}),/THEME_IDENTITY_DRIFT/);
 assert.throws(()=>prepareGmhSevenPrivateSeed(privateGmh(),
  {...options(),sourceStoredAt:'2026-11-19T00:00:00Z'}),/SOURCE_PROVENANCE_UNVERIFIED/);
});
test('rejects an older snapshot whose reference histories are inconsistent',()=>{
 const old=seed();old.themes[3].history.find(p=>p.date==='2026-10-05').score=42;
 assert.throws(()=>prepareGmhSevenPrivateSeed(privateGmh(),
  {...options(),legacySeed:old}),/HISTORICAL_SCORE_RECONCILIATION_FAILED/);
 const oldCalendar=seed();oldCalendar.themes[5].history[50].date='2026-06-01';
 assert.throws(()=>prepareGmhSevenPrivateSeed(privateGmh(),
  {...options(),legacySeed:oldCalendar}),/W03_SEVEN_SEED_/);
});
