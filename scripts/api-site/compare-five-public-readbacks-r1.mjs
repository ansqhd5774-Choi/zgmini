// Pure, offline evidence comparator: no network, D1 credentials, SQL, filesystem or writes.
// The approved D1 reader and the HTTP reader must independently supply their own evidence.
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {validEmploymentR6PublicDisplay} from '../../worker/employment-r6-public-display.mjs';
import {validateInflationCausalPublic} from '../../worker/inflation-causal-public-r1.mjs';
import {validateInflationCandidates7Public} from '../../worker/inflation-causal-candidates-public-7-r1.mjs';

export const PUBLIC_READBACK_SLOTS=Object.freeze({
 inflation19:Object.freeze({table:'market_public_snapshots_v1',snapshot_key:'detail:inflation-causal-public-19:r1',mode:'ENVELOPE'}),
 inflation7:Object.freeze({table:'market_public_snapshots_v1',snapshot_key:'detail:inflation-causal-candidates-7:r1',mode:'ENVELOPE'}),
 calendar:Object.freeze({table:'public_feed_snapshots_v1',kind:'output',feed_key:'release-calendar',snapshot_key:'current',mode:'DIRECT'}),
 theme:Object.freeze({table:'market_public_snapshots_v1',snapshot_key:'public:theme-etf-only:r1',mode:'COMPOSED'}),
 employment:Object.freeze({table:'market_public_snapshots_v1',snapshot_key:'detail:employment-r6:one-year:v1',mode:'DIRECT'}),
});
const isObject=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const populated=x=>typeof x==='string'&&x.trim().length>0;
const exactStrings=(a,b)=>Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&
 a.every((item,i)=>typeof item==='string'&&item===b[i]);
// Mirror only the immutable public seed policy gates used by the actual
// stored Theme Reader. These are necessary, not sufficient, for publication
// validity: rolling/sidecars, full 252-point history and D1 source rights
// must still be verified by the approved Owner in the runtime.
const THEME_SEED_VERSION='THEME_ETF_ONLY_R144_252_PUBLIC_V1';
const THEME_SEED_METHOD='ETF_ONLY_T40_R20_V40_PAIR50';
const THEME_SEED_PAIRS=Object.freeze([
 Object.freeze({theme:'로봇·자동화',etfs:Object.freeze(['BOTZ','ROBO'])}),
 Object.freeze({theme:'클라우드·SaaS',etfs:Object.freeze(['SKYY','CLOU'])}),
 Object.freeze({theme:'자율주행',etfs:Object.freeze(['DRIV','BOTZ'])}),
 Object.freeze({theme:'원전·SMR',etfs:Object.freeze(['NLR','URA'])}),
 Object.freeze({theme:'방산',etfs:Object.freeze(['ITA','SHLD'])}),
 Object.freeze({theme:'핀테크',etfs:Object.freeze(['FINX','ARKF'])}),
 Object.freeze({theme:'사이버보안',etfs:Object.freeze(['CIBR','BUG'])}),
]);
const hasThemeSeedPolicy=x=>x.status==='READY'&&
 x.version===THEME_SEED_VERSION&&x.methodologyVersion===THEME_SEED_METHOD&&
 x.publicationAuthorized===true&&x.upstreamCommercialRightsVerified===true&&
 x.derivedLicenseVerified===true&&x.individualStocksUsed===0&&
 x.scoreMethod==='ETF_ONLY_PROXY'&&
 x.sourcePriceMode==='UNADJUSTED_HOURLY_CLOSE_PROXY_DISCLOSED'&&
 x.weights?.trend===0.4&&x.weights?.relativeStrength===0.2&&
 x.weights?.volatility===0.4&&x.pairWeight===0.5&&
 Array.isArray(x.themes)&&x.themes.length===THEME_SEED_PAIRS.length&&
 x.themes.every((item,i)=>isObject(item)&&
  item.theme===THEME_SEED_PAIRS[i].theme&&
  exactStrings(item.etfs,THEME_SEED_PAIRS[i].etfs));
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
 * api = {observedAt,statusCode,body:parsedHttpJson}
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
  // The public Workers validate each of the 19 and 7 series, including ID
  // order, provenance, missing/STALE rows and the actual READY/PARTIAL rule.
  // Identical D1/API bytes from an invalid saved row are not a valid readback.
  // Reuse those exact validators instead of trusting envelope parity alone.
  try{
   if(d1.body.length>45000)throw Error('READER_BODY_TOO_LARGE');
   if(slot==='inflation19')validateInflationCausalPublic(p,{now});
   else if(slot==='inflation7')validateInflationCandidates7Public(p,{now});
  }catch{return result(slot,'INVALID_INFLATION_PUBLIC_METADATA',evidence)}
  if(!isDeepStrictEqual(api.body,p))return result(slot,'PUBLIC_PAYLOAD_MISMATCH',evidence);
  return result(slot,'STRUCTURAL_MATCH_NOT_RUNTIME_PROOF',{...evidence,sourceVersion:p.sourceVersion,sourceStoredAt:p.sourceStoredAt});
 }
 if(expected.mode==='COMPOSED'){
  // A 200 HTTP with an explicit non-READY JSON status is not evidence of
  // a live composed public theme, even if some seed labels still match.
  if(api.body.status!=='READY')
   return result(slot,'API_NOT_READY',{...evidence,httpStatus:api.statusCode});
  // The Worker preserves the seven immutable seed ETF identities and its
  // version/methodology while rolling scores and optional sidecars may change.
  // Check only these invariant base identities; never equate the rolling
  // sourceVersion with the seed sourceVersion or certify optional overlays.
  if(!populated(saved.version)||!populated(saved.methodologyVersion)||
     !populated(saved.sourceVersion)||!validIso(saved.sourceStoredAt)||
     !validIso(saved.publishedAt)||typeof saved.observationDate!=='string'||
     !Array.isArray(saved.themes)||saved.themes.length!==7||
     saved.themes.some(item=>!isObject(item)||!populated(item.theme)||
       !Array.isArray(item.etfs)||item.etfs.length!==2||
       item.etfs.some(etf=>!populated(etf))))
   return result(slot,'INVALID_THEME_SEED_METADATA',evidence);
  // Metadata parity alone is insufficient when the stored base violates the
  // immutable approval/rights/price-mode/ETF-roster contract. Never return
  // even the limited seed-aligned classification for an unauthorized seed.
  if(!hasThemeSeedPolicy(saved))
   return result(slot,'THEME_SEED_POLICY_UNVERIFIED',evidence);
  for(const field of ['version','methodologyVersion']){
   if(api.body[field]!==saved[field])
    return result(slot,'THEME_SEED_LINEAGE_MISMATCH',{...evidence,field});
  }
  if(!populated(api.body.sourceVersion))
   return result(slot,'THEME_SEED_LINEAGE_MISMATCH',{...evidence,field:'sourceVersion'});
  if(!Array.isArray(api.body.themes)||api.body.themes.length<saved.themes.length||
     saved.themes.some((item,i)=>api.body.themes[i]?.theme!==item.theme||
       !exactStrings(api.body.themes[i]?.etfs,item.etfs)))
   return result(slot,'THEME_SEED_LINEAGE_MISMATCH',{...evidence,field:'baseThemes'});
  return result(slot,'SEED_READBACK_ONLY_COMPOSED_UNVERIFIED',{...evidence,
   seedSourceVersion:saved.sourceVersion,seedIdentityShapeAligned:true,
   rollingAndSidecarsVerified:false});
 }
 if(slot==='employment'){
  // Do not certify two matching 29-element arrays if the public Worker would
  // reject that row (wrong ID order, formula, window, provenance or summary).
  // Reuse the *real* read-only Reader contract, including approved R1 legacy
  // snapshots; never build a second weaker W05-only 29-feature validator.
  if(!validEmploymentR6PublicDisplay(saved,{allowLegacy:true})||
     saved.sourceStoredAt>d1.stored_at)
   return result(slot,'INVALID_EMPLOYMENT_METADATA',evidence);
 }
 // The calendar and employment Readers return the stored JSON body itself.
 if(!isDeepStrictEqual(api.body,saved))return result(slot,'PUBLIC_BODY_MISMATCH',evidence);
 return result(slot,'STRUCTURAL_MATCH_NOT_RUNTIME_PROOF',{...evidence,
  ...(slot==='employment'?{formulaHash:saved.formulaHash,methodologyVersion:saved.methodologyVersion,sourceStoredAt:saved.sourceStoredAt}:
   {sourceVersion:typeof saved.sourceVersion==='string'?saved.sourceVersion:null})});
}
