// W03: bridge an already saved GMH-only 7x252 private result to the legacy
// seven-theme schema for parity REVIEW ONLY. Does not write D1 or grant rights.
// Historical legacy snapshots are comparison inputs, never licensed raw sources.
import {
 THEME_ETF_ONLY_PAIRS,THEME_ETF_ONLY_PUBLIC_VERSION,THEME_ETF_ONLY_METHOD,
 validateThemeEtfOnlyPublic
} from '../../worker/theme-etf-only-public.mjs';

const DAY=/^\d{4}-\d{2}-\d{2}$/;
const SHA64=/^[a-f0-9]{64}$/;
const fail=reason=>{throw Object.assign(Error('W03_SEVEN_SEED_'+reason),{
 code:'W03_SEVEN_SEED_'+reason});};
const need=(v,reason)=>{if(!v)fail(reason);};
const day=x=>typeof x==='string'&&DAY.test(x)&&
 Number.isFinite(Date.parse(x+'T00:00:00Z'))&&
 new Date(x+'T00:00:00Z').toISOString().slice(0,10)===x;
const score=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=100;
const eq=(a,b)=>Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&
 a.every((v,i)=>v===b[i]);
const datesOf=items=>items.map(p=>p.date);
const historyOf=(row,expectedLast)=>{
 need(Array.isArray(row?.history)&&row.history.length===252,'HISTORY_252_REQUIRED');
 const history=row.history.map(p=>{
  need(day(p?.date)&&score(p?.score),'HISTORY_POINT_INVALID');
  return {date:p.date,score:p.score};
 });
 need(history.every((p,i)=>!i||p.date>history[i-1].date)&&
  history.at(-1).date===expectedLast,'HISTORY_CALENDAR_DRIFT');
 return history;
};

// The local result has a manifest fingerprint, but this pure function has no
// raw-file access. A SHA string alone MUST NOT be reported as a raw rehash.
export function prepareGmhSevenPrivateSeed(privateResult,{legacySeed,sourceStoredAt,
 now=Date.now()}={}){
 need(privateResult?.schema==='ZGMINI_W03_GMH_SEVEN_PRIVATE_252_V1'&&
  privateResult.status==='PRIVATE_GMH_ONLY_7X252_NOT_PUBLISHED'&&
  privateResult.inputProvider==='GETMARKETHISTORY_FREE_HOURLY_ONLY'&&
  privateResult.methodologyVersion===THEME_ETF_ONLY_METHOD&&
  privateResult.scoreMethod==='ETF_ONLY_PROXY'&&
  privateResult.priceMode===
   'UNADJUSTED_15_NY_HOURLY_PROXY_WITH_OFFICIAL_EARLY_CLOSE_12'&&
  privateResult.publicationAuthorized===false&&
  privateResult.upstreamCommercialRightsVerified===false&&
  privateResult.derivedLicenseVerified===false&&
  privateResult.providerCalls===0&&privateResult.d1Writes===0&&
  privateResult.publicWrites===0,'PRIVATE_GMH_CONTRACT');
 need(SHA64.test(privateResult.rawManifestSha256??'')&&
  SHA64.test(privateResult.scorerSha256??'')&&
  day(privateResult.observationDate)&&
  day(privateResult.firstHistoryDate)&&
  day(privateResult.sourceWindow?.from)&&
  day(privateResult.sourceWindow?.through)&&
  privateResult.sourceWindow.from<=privateResult.firstHistoryDate&&
  privateResult.sourceWindow.through>=privateResult.observationDate&&
  Number.isSafeInteger(privateResult.commonSessionCount)&&
  privateResult.commonSessionCount>=628&&
  Number.isSafeInteger(now)&&
  typeof sourceStoredAt==='string'&&
  Number.isFinite(Date.parse(sourceStoredAt))&&
  Date.parse(sourceStoredAt)<=now,
  'SOURCE_PROVENANCE_UNVERIFIED');
 need(Array.isArray(privateResult.themes)&&
  privateResult.themes.length===THEME_ETF_ONLY_PAIRS.length,
  'PRIVATE_THEME_COUNT');
 need(legacySeed?.status==='READY'&&
  legacySeed.version===THEME_ETF_ONLY_PUBLIC_VERSION&&
  legacySeed.methodologyVersion===THEME_ETF_ONLY_METHOD&&
  day(legacySeed.observationDate)&&
  Array.isArray(legacySeed.themes)&&
  legacySeed.themes.length===THEME_ETF_ONLY_PAIRS.length,
  'LEGACY_SEED_CONTRACT');
 const outputThemes=[];
 let referenceCalendar=null,newCalendar=null,overlapDates=null;
 let checkedPoints=0;
 for(let i=0;i<THEME_ETF_ONLY_PAIRS.length;i++){
  const pair=THEME_ETF_ONLY_PAIRS[i];
  const candidate=privateResult.themes[i],old=legacySeed.themes[i];
  need(candidate?.theme===pair.theme&&eq(candidate.etfs,pair.etfs)&&
   old?.theme===pair.theme&&eq(old.etfs,pair.etfs),
   'THEME_IDENTITY_DRIFT');
  const newer=historyOf(candidate,privateResult.observationDate);
  need(newer[0].date===privateResult.firstHistoryDate,
   'PRIVATE_FIRST_DAY_DRIFT');
  const previous=historyOf(old,legacySeed.observationDate);
  need(score(old.latestScore)&&
   Math.abs(old.latestScore-previous.at(-1).score)<=0.000001,
   'LEGACY_SCORE_DRIFT');
  const newDates=datesOf(newer),oldDates=datesOf(previous);
  need(!newCalendar||eq(newDates,newCalendar),'PRIVATE_CALENDAR_DRIFT');
  need(!referenceCalendar||eq(oldDates,referenceCalendar),
   'LEGACY_CALENDAR_DRIFT');
  newCalendar??=newDates;referenceCalendar??=oldDates;
  const oldScores=new Map(previous.map(p=>[p.date,p.score]));
  const shared=newDates.filter(d=>oldScores.has(d));
  need(!overlapDates||eq(shared,overlapDates),'OVERLAP_CALENDAR_DRIFT');
  overlapDates??=shared;
  for(const p of newer)if(oldScores.has(p.date)){
   need(Math.abs(p.score-oldScores.get(p.date))<=0.00001,
    'HISTORICAL_SCORE_RECONCILIATION_FAILED');
   checkedPoints++;
  }
  outputThemes.push({theme:pair.theme,etfs:[...pair.etfs],
   latestScore:newer.at(-1).score,history:newer});
 }
 need(overlapDates.length>0&&checkedPoints===overlapDates.length*7,
  'NO_COMMON_VERIFIED_HISTORY');
 const draft={
  version:THEME_ETF_ONLY_PUBLIC_VERSION,
  status:'CANDIDATE_GMH_ONLY_PRIVATE_NOT_APPROVED',
  methodologyVersion:THEME_ETF_ONLY_METHOD,
  publicationAuthorized:false,upstreamCommercialRightsVerified:false,
  derivedLicenseVerified:false,
  individualStocksUsed:0,scoreMethod:'ETF_ONLY_PROXY',
  sourcePriceMode:'UNADJUSTED_HOURLY_CLOSE_PROXY_DISCLOSED',
  observationDate:privateResult.observationDate,
  sourceStoredAt,sourceVersion:'GMH_MANIFEST_SHA256_'+privateResult.rawManifestSha256,
  publishedAt:null,
  weights:{trend:.4,relativeStrength:.2,volatility:.4},pairWeight:.5,
  themes:outputThemes
 };
 need(validateThemeEtfOnlyPublic(draft)===false,
  'PRIVATE_CANDIDATE_MUST_REMAIN_UNPUBLISHABLE');
 return {status:'PRIVATE_GMH_SEVEN_SEED_RECONCILED_NOT_PUBLISHED',
  draft,
  reconciliation:{legacyObservationDate:legacySeed.observationDate,
   candidateObservationDate:privateResult.observationDate,
   overlapDates:overlapDates.length,matchedScores:checkedPoints,
   mismatchedScores:0,rawFilesRehashedNow:false,
   sourceStoredAtIsCallerSupplied:true,
   upstreamRightsAttested:false,approvedD1Write:false},
  providerCalls:0,sqliteWrites:0,d1Writes:0,publicWrites:0};
}
