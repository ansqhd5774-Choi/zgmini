// Pure, offline evidence comparator: no network, D1 credentials, SQL, filesystem or writes.
// The approved D1 reader and the HTTP reader must independently supply their own evidence.
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';

export const PUBLIC_READBACK_SLOTS=Object.freeze({
 inflation19:Object.freeze({table:'market_public_snapshots_v1',snapshot_key:'detail:inflation-causal-public-19:r1',mode:'ENVELOPE'}),
 inflation7:Object.freeze({table:'market_public_snapshots_v1',snapshot_key:'detail:inflation-causal-candidates-7:r1',mode:'ENVELOPE'}),
 calendar:Object.freeze({table:'public_feed_snapshots_v1',kind:'output',feed_key:'release-calendar',snapshot_key:'current',mode:'DIRECT'}),
 theme:Object.freeze({table:'market_public_snapshots_v1',snapshot_key:'public:theme-etf-only:r1',mode:'COMPOSED'}),
 employment:Object.freeze({table:'market_public_snapshots_v1',snapshot_key:'detail:employment-r6:one-year:v1',mode:'DIRECT'}),
});
const isObject=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const safeMs=x=>Number.isSafeInteger(x)&&x>0;
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
 if(api.statusCode!==200||!isObject(api.body))
  return result(slot,'API_NOT_READY', {...evidence,httpStatus:Number.isInteger(api.statusCode)?api.statusCode:null});
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
  if(!isDeepStrictEqual(api.body,p))return result(slot,'PUBLIC_PAYLOAD_MISMATCH',evidence);
  return result(slot,'STRUCTURAL_MATCH_NOT_RUNTIME_PROOF',{...evidence,sourceVersion:p.sourceVersion,sourceStoredAt:p.sourceStoredAt});
 }
 if(expected.mode==='COMPOSED'){
  // An exact seed key proves nothing about the independently stored rolling/sidecar overlays.
  if(typeof saved.sourceVersion!=='string'||!validIso(saved.sourceStoredAt)||
     !validIso(saved.publishedAt)||typeof saved.observationDate!=='string')
   return result(slot,'INVALID_THEME_SEED_METADATA',evidence);
  return result(slot,'SEED_READBACK_ONLY_COMPOSED_UNVERIFIED',{...evidence,seedSourceVersion:saved.sourceVersion,
   rollingAndSidecarsVerified:false});
 }
 if(slot==='employment'){
  if(typeof saved.formulaHash!=='string'||typeof saved.methodologyVersion!=='string'||
     !safeMs(saved.sourceStoredAt)||saved.sourceStoredAt>d1.stored_at||
     !Array.isArray(saved.indicators)||saved.indicators.length!==29||
     typeof saved.asOfDate!=='string')
   return result(slot,'INVALID_EMPLOYMENT_METADATA',evidence);
 }
 // The calendar and employment Readers return the stored JSON body itself.
 if(!isDeepStrictEqual(api.body,saved))return result(slot,'PUBLIC_BODY_MISMATCH',evidence);
 return result(slot,'STRUCTURAL_MATCH_NOT_RUNTIME_PROOF',{...evidence,
  ...(slot==='employment'?{formulaHash:saved.formulaHash,methodologyVersion:saved.methodologyVersion,sourceStoredAt:saved.sourceStoredAt}:
   {sourceVersion:typeof saved.sourceVersion==='string'?saved.sourceVersion:null})});
}
