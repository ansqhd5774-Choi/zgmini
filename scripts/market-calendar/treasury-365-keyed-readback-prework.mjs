// W02 ahead-of-owner prework only: private TA_WS -> public calendar *keyed*
// comparison. The approved owner supplies already-stored evidence in memory.
// No provider fetch, D1 connection, file access, installation, or publication.
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {parseTreasuryDirectAuctionRows} from '../../lib/treasury-auction-history-taws.mjs';
import {parseTreasuryAuctionHistoryRows} from '../../lib/treasury-auction-history.mjs';

export const W02_TREASURY_365_AUDIT_SCHEMA='W02_TREASURY_365_KEYED_AUDIT_R1';
const DAY_MS=86400000;
const MAX_BYTES=6*1024*1024;
const MAX_OBSERVATION_SPAN_MS=120000;
const sha256=value=>createHash('sha256').update(value,'utf8').digest('hex');
const day=value=>{
 if(typeof value!=='string'||!/^20\d\d-\d\d-\d\d$/.test(value))return null;
 const ms=Date.parse(value+'T00:00:00.000Z');
 return Number.isFinite(ms)&&new Date(ms).toISOString().slice(0,10)===value?ms:null;
};
const iso=value=>typeof value==='string'&&
 Number.isFinite(Date.parse(value))&&new Date(value).toISOString()===value;
const digest=value=>sha256([...value].sort().join('\n'));
const safeCount=n=>Number.isSafeInteger(n)&&n>=0;
const result=(status,detail={})=>({
 schema:W02_TREASURY_365_AUDIT_SCHEMA,status,
 runtimeVerified:false,sourceLineageVerified:false,
 deploymentIdentityVerified:false,ownerAuthorizationVerified:false,
 ...detail,
});

/**
 * Compare one already-protected PC TA_WS JSON row, its independent PC A
 * SHA/count receipt, the exact public D1 output body, and a public API body.
 *
 * Both public/event bodies and private source rows are caller-supplied.
 * Equality of event identities alone is not evidence that the specific PC
 * raw batch produced the specific D1 deployment: that attribution requires
 * an independently authenticated Writer checkpoint/publication ledger.
 * Return only fixed statuses, counts and hashes; never return CUSIP or raw JSON.
 */
export function compareTreasury365KeyedEvidence({
 privateText,fromDate,toDate,
 pcTextSha256,pcRawRowCount,pcAwardedRowCount,
 d1BodyText,d1StoredAt,d1ReadAt,apiBody,apiObservedAt,
 now=Date.now(),...unknown
}={}){
 if(Object.keys(unknown).length||
  typeof privateText!=='string'||typeof d1BodyText!=='string'||
  !/^[a-f0-9]{64}$/.test(pcTextSha256??'')||
  !safeCount(pcRawRowCount)||!safeCount(pcAwardedRowCount)||
  !Number.isSafeInteger(now)||now<1)
  return result('UNVERIFIED_INPUT_CONTRACT');
 const from=day(fromDate),to=day(toDate);
 if(from===null||to===null||to-from!==364*DAY_MS)
  return result('UNVERIFIED_365_DAY_WINDOW');
 if(!iso(d1ReadAt)||!iso(apiObservedAt)||
   !Number.isSafeInteger(d1StoredAt)||d1StoredAt<=0||
   d1StoredAt>now||Date.parse(d1ReadAt)>now||
   Date.parse(apiObservedAt)>now||Date.parse(d1ReadAt)<d1StoredAt||
   Date.parse(apiObservedAt)<d1StoredAt||
   Date.parse(apiObservedAt)<Date.parse(d1ReadAt)||
   Date.parse(apiObservedAt)-Date.parse(d1ReadAt)>MAX_OBSERVATION_SPAN_MS)
  return result('UNVERIFIED_CAPTURE_WINDOW');
 const rawBytes=Buffer.byteLength(privateText,'utf8');
 if(rawBytes<2||rawBytes>MAX_BYTES||d1BodyText.length>2000000)
  return result('UNVERIFIED_BODY_BOUNDS');
 const rawDigest=sha256(privateText);
 if(rawDigest!==pcTextSha256)
  return result('PC_RAW_SHA_MISMATCH');
 let raw,stored,expected;
 try{
  raw=JSON.parse(privateText);
  stored=JSON.parse(d1BodyText);
  if(!Array.isArray(raw)||raw.length!==pcRawRowCount)
   return result('PC_RAW_ROW_COUNT_MISMATCH');
  const awarded=parseTreasuryDirectAuctionRows(raw,{fromDate,toDate});
  if(awarded.length!==pcAwardedRowCount)
   return result('PC_AWARDED_ROW_COUNT_MISMATCH');
  expected=parseTreasuryAuctionHistoryRows(awarded,{fromDate,toDate});
 }catch{return result('PRIVATE_RAW_VALIDATION_FAILED')}
 const evidence={
  privateRawTextSha256:rawDigest,
  privateRawRowCount:raw.length,
  privateAwardedRowCount:pcAwardedRowCount,
  expectedEventCount:expected.length,
  d1BodySha256:sha256(d1BodyText),
  d1StoredAt,
 };
 if(!stored||typeof stored!=='object'||Array.isArray(stored)||
  !Array.isArray(stored.events)||!iso(stored.updatedAt)||
  Date.parse(stored.updatedAt)!==d1StoredAt||
  !apiBody||typeof apiBody!=='object'||Array.isArray(apiBody))
  return result('INVALID_PUBLIC_SNAPSHOT',evidence);
 if(!isDeepStrictEqual(apiBody,stored))
  return result('D1_API_BODY_MISMATCH',evidence);
 // Other official sources can be PARTIAL. Treasury itself must be READY.
 if(stored.sources?.treasury?.status!=='READY')
  return result('TREASURY_SOURCE_NOT_READY',evidence);
 const expectedKeys=new Set(expected.map(event=>event.id+':'+event.date));
 if(expectedKeys.size!==expected.length)
  return result('PRIVATE_KEY_DUPLICATE',evidence);
 const observedKeys=new Set();
 let observedCount=0;
 for(const event of stored.events){
  if(event?.source!=='treasury')continue;
  const eventDate=day(event.date);
  if(eventDate===null||typeof event.id!=='string'||
   !/^treasury-(?:announcement|auction)-[a-z0-9]{9}$/.test(event.id))
   return result('PUBLIC_TREASURY_EVENT_INVALID',evidence);
  if(eventDate<from||eventDate>to)continue;
  const key=event.id+':'+event.date;
  if(observedKeys.has(key))
   return result('PUBLIC_TREASURY_DUPLICATE',evidence);
  observedKeys.add(key);observedCount++;
 }
 const missing=[...expectedKeys].filter(key=>!observedKeys.has(key)).length;
 const extra=[...observedKeys].filter(key=>!expectedKeys.has(key)).length;
 const counts={...evidence,publicEventCount:observedCount,
  missingEventCount:missing,extraEventCount:extra,
  expectedKeySetSha256:digest(expectedKeys),
  publicKeySetSha256:digest(observedKeys)};
 if(missing||extra)
  return result('TREASURY_PUBLIC_KEY_MISMATCH',counts);
 return result('KEYED_CONTENT_MATCH_LINEAGE_NOT_VERIFIED',counts);
}
