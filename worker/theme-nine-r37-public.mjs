// R37: an opt-in, versioned 9-theme score reader. Reads D1 only.
// Existing rolling/optional keys and their fallback behavior stay untouched.
import {PUBLIC_DISPLAY_MAX_AGE_MS} from './public-display-freshness.mjs';

export const THEME_NINE_R37_KEY='theme-legacy-nine-r37';
export const THEME_NINE_R37_VERSION='THEME_LEGACY_NINE_R37_PUBLIC_V1';
export const THEME_NINE_R37_METHOD='ETF_ONLY_T40_R20_V40_ADAPTIVE_R2_DATED_ISSUER_AUM_R32';
export const THEME_NINE_R37_ROSTER_SHA='e2ea97ce0ed0bf15cb083237d63d3cf520e090d8bd229a837bad393c3f8b0c6c';
export const THEME_NINE_R37_ROSTER=Object.freeze([
 {theme:'로봇·자동화',etfs:['BOTZ','ROBO','ROBT','ARKQ','HUMN','RBTX','CBOT']},
 {theme:'클라우드·SaaS',etfs:['SKYY','CLOU','WCLD','FCLD','CLOD']},
 {theme:'자율주행',etfs:['DRIV','BOTZ','IDRV','HAIL','CABZ','KARS']},
 {theme:'원전·SMR',etfs:['NLR','URA','URNM','NUKZ','URNJ','URAN']},
 {theme:'방산',etfs:['ITA','SHLD','XAR','PPA','NATO','WR']},
 {theme:'핀테크',etfs:['FINX','ARKF','IPAY','BPAY','KYC','LATR']},
 {theme:'사이버보안',etfs:['CIBR','BUG','HACK','IHAK','WCBR','SPAM','PSWD','XA']},
 {theme:'AI·반도체',etfs:['SMH','SOXX','SOXQ','XSD','ARTY','AIQ','CHAT','PSI','EUV','DRAM','LLMA']},
 {theme:'바이오·신약',etfs:['IBB','XBI','BBH','PBE','GNOM','ARKG','SBIO','FBT','GNMX']},
]);
const validDate=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&
 Number.isFinite(Date.parse(v+'T00:00:00Z'))&&
 new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
const score=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=100;
const sha=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const stamp=v=>typeof v==='string'&&Number.isFinite(Date.parse(v));
const same=(a,b)=>Array.isArray(a)&&a.length===b.length&&a.every((v,i)=>v===b[i]);
const PUBLIC_DATE_MODE='FIXED_OFFICIAL_ISSUER_AUM_SNAPSHOT_WITH_ORIGINAL_DATES';
const expectedSymbols=[...new Set(THEME_NINE_R37_ROSTER.flatMap(t=>t.etfs))];
const R54_ANONYMOUS_RISK_BASIS='OFFICIAL_TERMS_DERIVED_WORKS_ANONYMOUS_SCOPE_UNCONFIRMED';
const R54_SOURCE_TERMS='https://getmarkethistory.com/docs/terms';
const R51_PUBLIC_LEGACY_SOURCE='EXISTING_PUBLIC_PROVISIONAL_AS_PUBLISHED';

function publicationRightsNineR37(record){
 if(record?.publicationAuthorized!==true||record.derivedOnlyNoRaw!==true||
   record.sourceManifestVerified!==true||record.privateReplayVerified!==true)
  return false;
 const confirmed=record.upstreamCommercialRightsVerified===true&&
  record.derivedLicenseVerified===true&&record.sourcePriceReconciled===true;
 // The publisher expressly accepted the same anonymous-API licensing risk
 // already disclosed by the tenth-theme reader. Never turn unknown rights or
 // unreconciled 1h prices into false certifications. Raw-bar and score-replay
 // validation are STILL mandatory for this alternative.
 const disclosed=record.licensingRiskAcceptedByPublisher===true&&
  record.rightsBasis===R54_ANONYMOUS_RISK_BASIS&&
  record.sourceTermsUrl===R54_SOURCE_TERMS&&
  record.upstreamCommercialRightsVerified===false&&
  record.derivedLicenseVerified===false&&record.sourcePriceReconciled===false&&
  record.accountGoodStandingVerified===false&&
  record.anonymousScopeIndependentlyConfirmed===false;
 return confirmed||disclosed;
}

export function eligibleNineR37(record,base,{now=Date.now(),storedAt=now}={}){
 if(!base||base.status!=='READY'||!Array.isArray(base.themes)||
  base.themes.length<7||!validDate(base.observationDate)||
  !['CONFIRMED','PROVISIONAL'].includes(base.phase))return false;
 const baseConfirmed=base.confirmedObservationDate??base.observationDate;
 if(!validDate(baseConfirmed)||!record||record.status!=='READY'||
  record.version!==THEME_NINE_R37_VERSION||
  record.methodologyVersion!==THEME_NINE_R37_METHOD||
  !['THEME_NINE_R32_PRIVATE_STAGE5_SHADOW_V1',
    'THEME_NINE_R47_PRIVATE_RECURRING_NINE_THEME_SHADOW_V1']
    .includes(record.sourceContract)||
  record.sourcePriceMode!=='RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE'||
  record.historicalAumMode!==PUBLIC_DATE_MODE||
  record.rosterSha256!==THEME_NINE_R37_ROSTER_SHA||
  record.benchmark!=='SPY'||record.individualStocksUsed!==0||
  record.ETFPositions!==64||record.uniqueETFs!==63||
  !publicationRightsNineR37(record))return false;
 if(!sha(record.rawManifestSha256)||!sha(record.r25InputSha256)||
  !sha(record.shadowSha256)||!sha(record.officialAumEvidenceSha256)||
  !validDate(record.observationDate)||record.observationDate!==baseConfirmed||
  record.phase!==base.phase||!stamp(record.sourceStoredAt)||
  !stamp(record.publishedAt)||!Number.isSafeInteger(Number(storedAt)))return false;
 if(record.sourceContract==='THEME_NINE_R47_PRIVATE_RECURRING_NINE_THEME_SHADOW_V1'&&
   (!sha(record.baselineManifestSha256)||
    (record.deltaManifestSha256!==null&&!sha(record.deltaManifestSha256))))return false;
 const clocks=[Date.parse(record.sourceStoredAt),Date.parse(record.publishedAt),Number(storedAt)];
 if(clocks.some(t=>t>now||now-t>=PUBLIC_DISPLAY_MAX_AGE_MS))return false;
 if(now-Date.parse(record.observationDate+'T23:59:59Z')>=PUBLIC_DISPLAY_MAX_AGE_MS)return false;
 if(!record.officialAumAsOf||typeof record.officialAumAsOf!=='object'||
  Array.isArray(record.officialAumAsOf)||
  !same(Object.keys(record.officialAumAsOf).sort(),[...expectedSymbols].sort())||
  !expectedSymbols.every(k=>validDate(record.officialAumAsOf[k])&&
   record.officialAumAsOf[k]<=record.observationDate))return false;
 if(!Array.isArray(record.themes)||record.themes.length!==9)return false;
 const baseDates=base.themes.find(t=>THEME_NINE_R37_ROSTER.some(x=>x.theme===t.theme))?.history?.map(p=>p.date);
 if(!Array.isArray(baseDates)||baseDates.length!==252||
  baseDates.at(-1)!==baseConfirmed)return false;
 for(let i=0;i<THEME_NINE_R37_ROSTER.length;i++){
  const required=THEME_NINE_R37_ROSTER[i],item=record.themes[i];
  if(item?.theme!==required.theme||!same(item.etfs,required.etfs)||
   !score(item.score)||!Array.isArray(item.history)||item.history.length!==252||
   !same(item.history.map(p=>p?.date),baseDates)||
   item.history.some((p,j)=>!validDate(p?.date)||!score(p?.score)||
    (j>0&&p.date<=item.history[j-1].date))||
   Math.abs(item.history.at(-1).score-item.score)>0.000001)return false;
 }
 if(base.phase==='PROVISIONAL'){
  const fromBase=base.provisional?.points,fromNew=record.provisional?.points;
  if(!Array.isArray(fromBase)||!Array.isArray(fromNew)||
   fromBase.length!==fromNew.length||fromNew.length<1||fromNew.length>2)return false;
  if(record.provisionalLineage?.source===R51_PUBLIC_LEGACY_SOURCE){
   // For the current public contract, 26 Oct has three optional scores and
   // 27 Oct has seven core scores. This mode NEVER recalculates or replaces
   // any legacy provisional score, nor invents an unpublished AI score.
   if(record.provisionalLegacyMethodologyVersion!==base.methodologyVersion||
    record.provisionalLegacySourceVersion!==(base.sourceVersion??null)||
    record.provisionalLineage?.publicVersion!==base.version||
    record.provisionalLineage?.confirmedObservationDate!==baseConfirmed||
    record.provisionalLineage?.latestCandidateSha256!==null||
    record.provisionalLineage?.sameMethodology!==false||
    !sha(record.provisionalLineage?.publicProvisionalPointsSha256)||
    record.provisional?.asOf!==(base.provisional?.asOf??null)||
    JSON.stringify(fromNew)!==JSON.stringify(fromBase))return false;
   const visible=new Set(base.themes.map(t=>t.theme));
   let prev=baseConfirmed;
   for(let i=0;i<fromNew.length;i++){
    const point=fromNew[i];
    if(!validDate(point?.date)||point.date<prev||
     (i>0&&point.date<=prev)||
     !point.scores||typeof point.scores!=='object'||
     Array.isArray(point.scores)||!Object.keys(point.scores).length||
     Object.entries(point.scores).some(([name,value])=>
       !visible.has(name)||!score(value)))return false;
    prev=point.date;
   }
   return true;
  }
  let prev=baseConfirmed;
  for(let i=0;i<fromNew.length;i++){
   const point=fromNew[i];
   // Match the existing R2 public contract: its first provisional day may
   // equal the confirmed anchor. Only subsequent days must increase strictly.
   if(!validDate(point?.date)||point.date!==fromBase[i]?.date||point.date<prev||
    (i>0&&point.date<=prev)||
    !point.scores||typeof point.scores!=='object'||Array.isArray(point.scores)||
    !same(Object.keys(point.scores).sort(),THEME_NINE_R37_ROSTER.map(t=>t.theme).sort())||
    !Object.values(point.scores).every(score))return false;
   prev=point.date;
  }
 }else if(record.provisional?.points?.length)return false;
 return true;
}

export async function addVerifiedNineR37(db,base,{now=Date.now(),trace=null}={}){
 // Temporary read-only troubleshooting: expose only a fixed outcome category,
 // never row bytes, ETF scores, SQL error details or private source metadata.
 const mark=category=>{if(trace&&typeof trace==='object')trace.state=category;};
 if(base?.status!=='READY'||!Array.isArray(base.themes)){
  mark('BASE_UNAVAILABLE');return base;
 }
 let row;
 try{row=await db.prepare("SELECT body,stored_at FROM public_feed_snapshots_v1 WHERE kind='output' AND feed_key=? AND snapshot_key='current'")
  .bind(THEME_NINE_R37_KEY).first();}catch{mark('D1_SELECT_ERROR');return base;}
 if(!row){mark('D1_ROW_MISSING');return base;}
 let record;try{record=JSON.parse(row.body);}catch{mark('D1_INVALID_JSON');return base;}
 if(!eligibleNineR37(record,base,{now,storedAt:Number(row.stored_at)})){
  mark('RECORD_INELIGIBLE');return base;
 }
 mark('APPLIED');
 // This is a score migration, not a theme launch. Preserve the exact public
 // roster and ordering: R32 also contains AI, which is not necessarily a
 // public theme in the current ten-theme dashboard.
 const updates=new Map(record.themes.map(t=>[t.theme,t]));
 const visibleNames=new Set(base.themes.map(t=>t.theme));
 const publicLegacy=record.provisionalLineage?.source===R51_PUBLIC_LEGACY_SOURCE;
 const themes=base.themes.map(old=>{
  const t=updates.get(old.theme);
  return t?{theme:t.theme,etfs:[...t.etfs],score:t.score,
   history:t.history.map(p=>({date:p.date,score:p.score}))}:old;
 });
 return {...base,methodologyVersion:record.methodologyVersion,
  sourceVersion:record.sourceVersion??record.version,
  sourceStoredAt:record.sourceStoredAt,
  themes,
  ...(base.phase==='PROVISIONAL'?{
   // Keep separate data-center/space provisional scores and do not expose
   // the unpublished AI research theme through the scores side channel.
   provisional:publicLegacy?base.provisional:{asOf:base.provisional.asOf,
    points:record.provisional.points.map((p,i)=>({date:p.date,
     scores:{...base.provisional.points[i].scores,
      ...Object.fromEntries(Object.entries(p.scores)
       .filter(([name])=>visibleNames.has(name)))}}))},
   ...(publicLegacy?{
    provisionalMethodologyVersion:base.methodologyVersion,
    provisionalSourceVersion:base.sourceVersion??null,
    provisionalSourceStoredAt:base.sourceStoredAt??null}:{}),
  }:{}),modelRevision:record.version};
}
