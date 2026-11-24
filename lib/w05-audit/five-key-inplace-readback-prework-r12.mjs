// W05 protected-environment PREWORK ONLY. This module does not obtain D1
// credentials, call public HTTP, register an operation, or authorize any run.
// An approved owner supplies a read-only D1 binding and a public API reader.
// Raw D1/API bodies live only inside the caller's protected process memory.
import {PUBLIC_READBACK_SLOTS,comparePublicReadback,MAX_PUBLIC_READBACK_SPAN_MS} from './compare-five-public-readbacks-r1.mjs';

export const W05_INPLACE_SCHEMA='ZGMINI_W05_FIVE_KEY_INPLACE_PREWORK_R12';
const SLOTS=Object.freeze(['inflation19','inflation7','calendar','theme','employment']);
const MAX_BODY_BYTES=1_800_000;
const iso=ms=>new Date(ms).toISOString();
const safeClock=clock=>{
 const ms=clock();
 if(!Number.isSafeInteger(ms)||ms<=0||!Number.isFinite(new Date(ms).getTime()))
  throw Error('INVALID_CLOCK');
 return ms;
};
const noBody=(slot,status)=>({slot,status});

// Exact hardcoded SELECTs. No caller-supplied SQL, names or additional keys.
// SELECT-only; no initialize/create/update/delete/transaction methods exist.
export const W05_FIXED_READS=Object.freeze({
 inflation19:Object.freeze({sql:'SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?',bind:Object.freeze(['detail:inflation-causal-public-19:r1'])}),
 inflation7:Object.freeze({sql:'SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?',bind:Object.freeze(['detail:inflation-causal-candidates-7:r1'])}),
 calendar:Object.freeze({sql:'SELECT body,stored_at FROM public_feed_snapshots_v1 WHERE kind=? AND feed_key=? AND snapshot_key=?',bind:Object.freeze(['output','release-calendar','current'])}),
 theme:Object.freeze({sql:'SELECT body,stored_at FROM public_feed_snapshots_v1 WHERE kind=? AND feed_key=? AND snapshot_key=?',bind:Object.freeze(['output','theme-fear-greed-paid-hourly-v1','current'])}),
 employment:Object.freeze({sql:'SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?',bind:Object.freeze(['detail:employment-r6:one-year:v1'])}),
});

// Adapt an EXISTING approved Writer D1 client's fixed read method to the
// prepared read-only interface used by this comparator. The owner supplies
// queryFixed(sql, literalParams), e.g. through the pinned, integrity-checked
// Writer client. This does not obtain credentials, authorize a PC job or
// execute anything until the owner actually invokes the protected collector.
export function createW05ReadonlyD1Adapter(queryFixed){
 if(typeof queryFixed!=='function')throw Error('W05_APPROVED_D1_READER_REQUIRED');
 return Object.freeze({prepare(sql){
  const compatible=Object.values(W05_FIXED_READS).filter(spec=>spec.sql===sql);
  if(!compatible.length)throw Error('W05_D1_SQL_NOT_ALLOWLISTED');
  return Object.freeze({bind(...params){
   const exact=compatible.filter(spec=>spec.bind.length===params.length&&
    spec.bind.every((value,i)=>value===params[i]));
   if(exact.length!==1)throw Error('W05_D1_KEY_NOT_ALLOWLISTED');
   const spec=exact[0];
   return Object.freeze({async first(){
    // Only pinned SELECT and frozen exact keys are forwarded to the existing
    // approved client. No caller SQL/keys, writes or stored body disclosure.
    const row=await queryFixed(spec.sql,[...spec.bind]);
    if(row===null||row===undefined)return null;
    if(!row||typeof row!=='object'||Array.isArray(row))
     throw Error('W05_D1_ROW_SHAPE_INVALID');
    return {body:row.body,stored_at:row.stored_at};
   }});
  }});
 }});
}

async function readFixed(db,slot){
 const spec=W05_FIXED_READS[slot];
 const row=await db.prepare(spec.sql).bind(...spec.bind).first();
 if(row===null||row===undefined)return null;
 if(typeof row.body!=='string'||!row.body.length||Buffer.byteLength(row.body,'utf8')>MAX_BODY_BYTES||
    !Number.isSafeInteger(Number(row.stored_at))||Number(row.stored_at)<=0)
  throw Error('MALFORMED_STORED_ROW');
 return {body:row.body,stored_at:Number(row.stored_at)};
}

function sanitized(slot,comparison){
 // No saved JSON, public JSON, API headers, credentials, or exception messages.
 // Do not include arbitrary extra fields returned by a future comparator.
 const status=typeof comparison?.status==='string'&&/^[A-Z][A-Z0-9_]{2,90}$/.test(comparison.status)
  ?comparison.status:'COMPARISON_UNCLASSIFIED';
 const receipt={slot,status};
 if(typeof comparison?.d1BodySha256==='string'&&/^[0-9a-f]{64}$/.test(comparison.d1BodySha256))
  receipt.d1BodySha256=comparison.d1BodySha256;
 for(const timeField of ['d1ReadAt','apiObservedAt']){
  const stamp=comparison?.[timeField];
  if(typeof stamp==='string'&&Number.isFinite(Date.parse(stamp))&&new Date(stamp).toISOString()===stamp)
   receipt[timeField]=stamp;
 }
 if(Number.isSafeInteger(comparison?.d1StoredAt))receipt.d1StoredAt=comparison.d1StoredAt;
 if(Number.isInteger(comparison?.httpStatus)&&comparison.httpStatus>=100&&comparison.httpStatus<=599)
  receipt.httpStatus=comparison.httpStatus;
 // Provenance of theme rolling/sidecars is NOT established by this five-key read.
 if(slot==='theme')receipt.rollingAndSidecarsVerified=false;
 return receipt;
}

export async function collectFiveKeyInPlace({db,readApi,clock=Date.now,...unknown}={}){
 // Production prework must ALWAYS use the pinned imported W05 comparator.
 // Reject test doubles or arbitrary caller-supplied analysis code.
 if(Object.keys(unknown).length)throw Error('W05_UNSUPPORTED_OPTION');
 if(!db||typeof db.prepare!=='function'||typeof readApi!=='function'||typeof clock!=='function')
  throw Error('W05_OWNER_SUPPLIED_READERS_REQUIRED');
 const results=[];
 for(const slot of SLOTS){
  const spec=PUBLIC_READBACK_SLOTS[slot];
  let before,after,response,readAt,observedAt;
  try{
   before=await readFixed(db,slot);readAt=iso(safeClock(clock));
  }catch{results.push(noBody(slot,'D1_READ_UNVERIFIED'));continue;}
  try{
   response=await readApi(slot);
   observedAt=iso(safeClock(clock));
  }catch{results.push(noBody(slot,'PUBLIC_API_READ_UNVERIFIED'));continue;}
  let afterAt;
  try{after=await readFixed(db,slot);afterAt=iso(safeClock(clock));}
  catch{results.push(noBody(slot,'D1_RECHECK_UNVERIFIED'));continue;}
  // A clock rollback invalidates the chronology even if the two row bytes agree.
  if(Date.parse(readAt)>Date.parse(observedAt)||Date.parse(observedAt)>Date.parse(afterAt)){
   results.push(noBody(slot,'OBSERVATION_ORDER_UNVERIFIED'));continue;
  }
  // Time spent on the second D1 read counts toward the same-window proof.
  if(Date.parse(afterAt)-Date.parse(readAt)>MAX_PUBLIC_READBACK_SPAN_MS){
   results.push(noBody(slot,'OBSERVATION_WINDOW_UNVERIFIED'));continue;
  }
  // Both existence and exact serialized bytes must remain unchanged over API read.
  if((before===null)!==(after===null)||
     (before!==null&&(before.stored_at!==after.stored_at||before.body!==after.body))){
   results.push(noBody(slot,'SOURCE_DRIFT_UNVERIFIED'));continue;
  }
  try{
   const d1={...spec,readAt,exists:before!==null,
     ...(before?{stored_at:before.stored_at,body:before.body}:{})};
   // The paid/legacy branch selection header must originate from the HTTP
   // response itself, never be inferred from a matching body or injected D1 row.
   const themeSourceHeader=slot==='theme'?
    (typeof response?.headers?.get==='function'?
      response.headers.get('x-zgmini-theme-source'):
      response?.headers?.['x-zgmini-theme-source']??response?.themeSourceHeader):null;
   const api={observedAt,statusCode:response?.statusCode,body:response?.body,
    ...(typeof themeSourceHeader==='string'?{themeSourceHeader}:{})};
   results.push(sanitized(slot,comparePublicReadback(slot,{d1,api,now:safeClock(clock)})));
  }catch{results.push(noBody(slot,'COMPARISON_UNVERIFIED'));}
 }
 return {
  schema:W05_INPLACE_SCHEMA,
  status:results.every(r=>r.status==='STRUCTURAL_MATCH_NOT_RUNTIME_PROOF')
    ?'LOCAL_STRUCTURAL_MATCH_OWNER_ATTESTATION_PENDING':'PARTIAL_OR_UNVERIFIED',
  ownerAuthorizationVerified:false,deploymentIdentityVerified:false,
  runtimeVerified:false,keysChecked:results.length,results,
 };
}
