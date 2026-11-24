// Pure, offline evidence comparator: no network, D1 credentials, SQL, filesystem or writes.
// The approved D1 reader and the HTTP reader must independently supply their own evidence.
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {PAID_THEME_KEY,PAID_THEME_VERSION,PAID_HOURLY_MODE,validPaidThemeRecord} from '../../worker/theme-paid-contract.mjs';
import {PUBLIC_DISPLAY_MAX_AGE_MS} from '../../worker/public-display-freshness.mjs';
import {validEmploymentR6PublicDisplay} from '../../worker/employment-r6-public-display.mjs';
import {validateInflationCausalPublic} from '../../worker/inflation-causal-public-r1.mjs';
import {validateInflationCandidates7Public} from '../../worker/inflation-causal-candidates-public-7-r1.mjs';

export const PUBLIC_READBACK_SLOTS=Object.freeze({
 inflation19:Object.freeze({table:'market_public_snapshots_v1',snapshot_key:'detail:inflation-causal-public-19:r1',mode:'ENVELOPE'}),
 inflation7:Object.freeze({table:'market_public_snapshots_v1',snapshot_key:'detail:inflation-causal-candidates-7:r1',mode:'ENVELOPE'}),
 calendar:Object.freeze({table:'public_feed_snapshots_v1',kind:'output',feed_key:'release-calendar',snapshot_key:'current',mode:'DIRECT'}),
 theme:Object.freeze({table:'public_feed_snapshots_v1',kind:'output',feed_key:PAID_THEME_KEY,snapshot_key:'current',mode:'PAID_PROJECTION'}),
 employment:Object.freeze({table:'market_public_snapshots_v1',snapshot_key:'detail:employment-r6:one-year:v1',mode:'DIRECT'}),
});
const isObject=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const populated=x=>typeof x==='string'&&x.trim().length>0;
const exactStrings=(a,b)=>Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&
 a.every((item,i)=>typeof item==='string'&&item===b[i]);
const safeMs=x=>Number.isSafeInteger(x)&&x>0;
// An exact-key comparison cannot imply a same-window observation across
// arbitrarily separated reads; both timestamps must postdate the row write.
export const MAX_PUBLIC_READBACK_SPAN_MS=120_000;
const validIso=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))&&new Date(x).toISOString()===x;
const sha256=s=>createHash('sha256').update(s,'utf8').digest('hex');
const result=(slot,status,extra={})=>({slot,status,...extra});

/**
 * Compare two independently captured artifacts, without fetching either one.
 * d1 = {table,snapshot_key,kind?,feed_key?,readAt,exists,stored_at,body:rawJsonString}
 * api = {observedAt,statusCode,body:parsedHttpJson,headers?:{ 'x-zgmini-theme-source':string }}
 * A fixture result never proves that current production D1 was read.
 */
export function comparePublicReadback(slot,{d1,api,now=Date.now()}={}){
 const expected=PUBLIC_READBACK_SLOTS[slot];
 if(!expected)throw Error('UNKNOWN_PUBLIC_READBACK_SLOT');
 if(!d1||!api)return result(slot,'UNVERIFIED_EVIDENCE_MISSING');
 for(const field of ['table','snapshot_key',...(expected.kind?['kind','feed_key']:[])])
  if(d1[field]!==expected[field])return result(slot,'WRONG_EXACT_KEY',{field});
 if(!validIso(d1.readAt)||!validIso(api.observedAt)||
    Date.parse(d1.readAt)>now||Date.parse(api.observedAt)>now)
  return result(slot,'UNVERIFIED_OBSERVATION_TIME');
 if(d1.exists===false)return result(slot,'CONFIRMED_D1_ROW_MISSING');
 if(d1.exists!==true||!safeMs(d1.stored_at)||d1.stored_at>now||
    typeof d1.body!=='string'||d1.body.length===0)
  return result(slot,'INVALID_D1_RECEIPT');
 const evidence={d1StoredAt:d1.stored_at,d1BodySha256:sha256(d1.body),d1ReadAt:d1.readAt,apiObservedAt:api.observedAt};
 // Preserve the original, directly observed HTTP error verdict before the
 // cross-source time-window check. A 503 is not evidence of a payload mismatch.
 if(api.statusCode!==200||!isObject(api.body))
  return result(slot,'API_NOT_READY', {...evidence,httpStatus:Number.isInteger(api.statusCode)?api.statusCode:null});
 const d1ReadMs=Date.parse(d1.readAt),apiReadMs=Date.parse(api.observedAt);
 if(d1.stored_at>d1ReadMs||d1.stored_at>apiReadMs||
    Math.abs(d1ReadMs-apiReadMs)>MAX_PUBLIC_READBACK_SPAN_MS)
  return result(slot,'UNVERIFIED_OBSERVATION_WINDOW',{maxSpanMs:MAX_PUBLIC_READBACK_SPAN_MS});
 let saved;
 try{saved=JSON.parse(d1.body)}catch{return result(slot,'INVALID_D1_JSON',evidence)}
 if(!isObject(saved))return result(slot,'INVALID_D1_JSON',evidence);
 if(expected.mode==='ENVELOPE'){
  const p=saved.payload,projection=saved.projection;
  if(!isObject(p)||!isObject(projection)||projection.status!=='READY'||
     !safeMs(projection.builtAt)||projection.builtAt!==d1.stored_at||
     !safeMs(p.sourceStoredAt)||p.sourceStoredAt>projection.builtAt||
     typeof p.sourceVersion!=='string'||p.sourceVersion.length===0||
     projection.sourceVersion!==p.sourceVersion||projection.sourceStoredAt!==p.sourceStoredAt)
    return result(slot,'CHECKPOINT_MISMATCH',evidence);
  // Reuse the exact currently deployed public Reader validators rather than
  // falsely matching two equally malformed, non-publicatable JSON bodies.
  try{
   if(slot==='inflation19')validateInflationCausalPublic(p,{now:apiReadMs});
   else validateInflationCandidates7Public(p,{now:apiReadMs});
  }catch{return result(slot,'INVALID_INFLATION_PUBLIC_METADATA',evidence);}
  if(!isDeepStrictEqual(api.body,p))return result(slot,'PUBLIC_PAYLOAD_MISMATCH',evidence);
  return result(slot,'STRUCTURAL_MATCH_NOT_RUNTIME_PROOF',{...evidence,sourceVersion:p.sourceVersion,sourceStoredAt:p.sourceStoredAt});
 }
 if(expected.mode==='PAID_PROJECTION'){
  // The current /api/theme-fear-greed route selects the paid D1 feed first;
  // it may serve the legacy ETF Reader when that record is absent or ineligible.
  // Never treat an ETF-only seed as the paid feed's authoritative raw body.
  if(api.body.status!=='READY')
   return result(slot,'API_NOT_READY', {...evidence,httpStatus:200});
  if(api.body.version!==PAID_THEME_VERSION||api.body.sourcePriceMode!==PAID_HOURLY_MODE)
   return result(slot,'THEME_LEGACY_FALLBACK_UNVERIFIED',evidence);
  if(!validPaidThemeRecord(saved))
   return result(slot,'INVALID_THEME_PAID_METADATA',evidence);
  const quality=saved.dataQuality;
  const stamps=[d1.stored_at,Date.parse(saved.sourceStoredAt),
   Date.parse(saved.updatedAt),Date.parse(saved.observationDate+'T00:00:00Z')];
  // Match the existing main Reader's eight-day PUBLIC_DISPLAY_MAX_AGE_MS
  // eligibility at API observation time. A stale paid row can trigger fallback.
  const apiMs=Date.parse(api.observedAt),maxAgeMs=PUBLIC_DISPLAY_MAX_AGE_MS;
  if(stamps.some(t=>!Number.isSafeInteger(Number(t))||t>apiMs||apiMs-t>=maxAgeMs))
   return result(slot,'THEME_PAID_ROW_NOT_ELIGIBLE',{...evidence,maxAgeMs});
  const themes=saved.themes.map(t=>({id:t.id,...(t.configured?{configured:true}:{}),
   theme:t.theme,etfs:t.etfs,score:t.score,
   history:t.history.map(p=>({date:p.date,score:p.score})),
   methodologyVersion:t.methodologyVersion,
   confirmedObservationDate:t.confirmedObservationDate,
   provisionalObservationDate:t.provisionalObservationDate,
   sourcePriceMode:t.sourcePriceMode,transitionAfter:t.transitionAfter??null,
   previousPriceMode:t.previousPriceMode??null,missingETFs:t.missingETFs??[]}));
  // Response.json drops undefined properties, unlike direct object comparison.
  const projected=JSON.parse(JSON.stringify({version:saved.version,status:'READY',
   phase:saved.phase,observationDate:saved.observationDate,
   confirmedObservationDate:saved.confirmedObservationDate,
   sourceLatestDate:saved.sourceLatestDate,
   methodologyVersion:saved.methodologyVersion,
   sourcePriceMode:saved.sourcePriceMode,
   historicalSourcePolicy:saved.historicalSourcePolicy,
   sourceStoredAt:saved.sourceStoredAt,sourceVersion:saved.sourceVersion,
   registrySha256:saved.registrySha256,updatedAt:saved.updatedAt,
   phasePolicy:saved.phasePolicy,themes,provisional:saved.provisional,
   dataQuality:{expectedPublicIds:quality.expectedPublicIds,
     readyPublicIds:quality.readyPublicIds,
     pendingPublicIds:quality.pendingPublicIds}}));
  if(!isDeepStrictEqual(api.body,projected))
   return result(slot,'THEME_PAID_PAYLOAD_MISMATCH',evidence);
  // Source header is emitted only by readPaidThemeFeed; without an HTTP
  // receipt it is impossible to certify the route's paid-vs-legacy choice.
  const marker=api.headers?.['x-zgmini-theme-source']??api.themeSourceHeader;
  if(marker!=='MARKETPARQUET_PAID_HOURLY')
   return result(slot,'THEME_READER_BRANCH_UNVERIFIED',evidence);
  return result(slot,'STRUCTURAL_MATCH_NOT_RUNTIME_PROOF',
   {...evidence,readerBranch:'PAID',sourceVersion:saved.sourceVersion});
 }
 if(slot==='employment'){
  // Exactly mirror the published 29-series contract, including the approved
  // formulas, date windows, ID order, summaries, and legacy read policy.
  if(!validEmploymentR6PublicDisplay(saved,{allowLegacy:true})||
     !safeMs(saved.sourceStoredAt)||saved.sourceStoredAt>d1.stored_at)
   return result(slot,'INVALID_EMPLOYMENT_METADATA',evidence);
  if(d1.stored_at>apiReadMs||
     apiReadMs-d1.stored_at>PUBLIC_DISPLAY_MAX_AGE_MS)
   return result(slot,'EMPLOYMENT_ROW_NOT_ELIGIBLE',evidence);
 }
 // The calendar and employment Readers return the stored JSON body itself.
 if(!isDeepStrictEqual(api.body,saved))return result(slot,'PUBLIC_BODY_MISMATCH',evidence);
 return result(slot,'STRUCTURAL_MATCH_NOT_RUNTIME_PROOF',{...evidence,
  ...(slot==='employment'?{formulaHash:saved.formulaHash,methodologyVersion:saved.methodologyVersion,sourceStoredAt:saved.sourceStoredAt}:
   {sourceVersion:typeof saved.sourceVersion==='string'?saved.sourceVersion:null})});
}
