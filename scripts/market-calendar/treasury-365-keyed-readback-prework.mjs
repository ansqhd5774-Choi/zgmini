// W02 ahead-of-owner prework only. Pure helpers, not an authorized PC job.
// The PC-facing receipt keeps private TA_WS rows inside the approved process;
// a separate public readback compares the receipt to caller-supplied D1/API.
// No provider fetch, D1 connection, file access, installation, or publication.
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {parseTreasuryDirectAuctionRows} from '../../lib/treasury-auction-history-taws.mjs';
import {parseTreasuryAuctionHistoryRows} from '../../lib/treasury-auction-history.mjs';

export const W02_TREASURY_365_AUDIT_SCHEMA='W02_TREASURY_365_KEYED_AUDIT_R1';
export const W02_TREASURY_365_PRIVATE_RECEIPT_SCHEMA='W02_TREASURY_365_PRIVATE_RECEIPT_R1';
const DAY_MS=86400000;
const MAX_BYTES=6*1024*1024;
const MAX_PUBLIC_CHARS=2000000;
const MAX_OBSERVATION_SPAN_MS=120000;
const sha256=value=>createHash('sha256').update(value,'utf8').digest('hex');
const sha=/^[a-f0-9]{64}$/;
const day=value=>{
 if(typeof value!=='string'||!/^20\d\d-\d\d-\d\d$/.test(value))return null;
 const ms=Date.parse(value+'T00:00:00.000Z');
 return Number.isFinite(ms)&&new Date(ms).toISOString().slice(0,10)===value?ms:null;
};
const iso=value=>typeof value==='string'&&
 Number.isFinite(Date.parse(value))&&new Date(value).toISOString()===value;
const digest=value=>sha256([...value].sort().join('\n'));
const eventKey=event=>event.id+':'+event.date;
const eventPayload=event=>JSON.stringify([
 event.id,event.date,event.title,event.source,event.sourceUrl
]);
const safeCount=n=>Number.isSafeInteger(n)&&n>=0;
const result=(status,detail={})=>({
 schema:W02_TREASURY_365_AUDIT_SCHEMA,status,
 runtimeVerified:false,sourceLineageVerified:false,
 deploymentIdentityVerified:false,ownerAuthorizationVerified:false,
 ...detail,
});
const safeFail=code=>{throw Error(code);};
const receiptKeys=[
 'schema','fromDate','toDate','privateRawTextSha256','privateRawRowCount',
 'privateAwardedRowCount','expectedEventCount','expectedKeySetSha256',
 'expectedEventPayloadSha256'
];

/**
 * Execute only inside the user's independently approved PC read-only reader,
 * with already-protected input text. Return only a bounded counts/SHA receipt.
 * Do not post raw TA_WS JSON, issuer details or individual CUSIPs to GitHub.
 * This helper is NOT itself a Controller operation or permission to read raw.
 */
export function buildTreasury365PrivateReceipt({
 privateText,fromDate,toDate,...unknown
}={}){
 if(Object.keys(unknown).length||typeof privateText!=='string')
  safeFail('W02_TREASURY_INPUT_CONTRACT_INVALID');
 const from=day(fromDate),to=day(toDate);
 if(from===null||to===null||to-from!==364*DAY_MS)
  safeFail('W02_TREASURY_365_DAY_WINDOW_INVALID');
 const bytes=Buffer.byteLength(privateText,'utf8');
 if(bytes<2||bytes>MAX_BYTES)
  safeFail('W02_TREASURY_PRIVATE_BODY_BOUNDS_INVALID');
 let raw,awarded,events;
 try{
  raw=JSON.parse(privateText);
  if(!Array.isArray(raw))safeFail('W02_TREASURY_RAW_ARRAY_INVALID');
  awarded=parseTreasuryDirectAuctionRows(raw,{fromDate,toDate});
  events=parseTreasuryAuctionHistoryRows(awarded,{fromDate,toDate});
 }catch{safeFail('W02_TREASURY_PRIVATE_VALIDATION_FAILED');}
 const keys=events.map(eventKey);
 if(new Set(keys).size!==keys.length)
  safeFail('W02_TREASURY_PRIVATE_EVENT_DUPLICATE');
 return {
  schema:W02_TREASURY_365_PRIVATE_RECEIPT_SCHEMA,
  fromDate,toDate,
  privateRawTextSha256:sha256(privateText),
  privateRawRowCount:raw.length,
  privateAwardedRowCount:awarded.length,
  expectedEventCount:events.length,
  expectedKeySetSha256:digest(keys),
  expectedEventPayloadSha256:digest(events.map(eventPayload))
 };
}

/**
 * Compare only protected receipt metadata with the already-read D1 body and
 * the directly read public API. No private raw bytes ever cross this boundary.
 *
 * The receipt still requires an authorized, independently authenticated source
 * and Writer→D1 lineage to upgrade to a LIVE_VERIFIED production conclusion.
 * This helper always returns all four authorization/runtime claims as false.
 */
export function compareTreasury365ReceiptToPublic({
 privateReceipt,d1BodyText,d1StoredAt,d1ReadAt,apiBody,apiObservedAt,
 now=Date.now(),...unknown
}={}){
 if(Object.keys(unknown).length||!privateReceipt||
  typeof privateReceipt!=='object'||Array.isArray(privateReceipt)||
  Object.keys(privateReceipt).length!==receiptKeys.length||
  !receiptKeys.every(key=>Object.hasOwn(privateReceipt,key))||
  privateReceipt.schema!==W02_TREASURY_365_PRIVATE_RECEIPT_SCHEMA||
  !sha.test(privateReceipt.privateRawTextSha256??'')||
  !sha.test(privateReceipt.expectedKeySetSha256??'')||
  !sha.test(privateReceipt.expectedEventPayloadSha256??'')||
  !safeCount(privateReceipt.privateRawRowCount)||
  !safeCount(privateReceipt.privateAwardedRowCount)||
  !safeCount(privateReceipt.expectedEventCount)||
  privateReceipt.privateAwardedRowCount>privateReceipt.privateRawRowCount||
  !privateReceipt.privateAwardedRowCount||
  privateReceipt.expectedEventCount>2*privateReceipt.privateAwardedRowCount||
  typeof d1BodyText!=='string'||
  !Number.isSafeInteger(now)||now<1)
  return result('UNVERIFIED_INPUT_CONTRACT');
 const {fromDate,toDate}=privateReceipt;
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
 if(d1BodyText.length>MAX_PUBLIC_CHARS)
  return result('UNVERIFIED_BODY_BOUNDS');
 let stored;
 try{stored=JSON.parse(d1BodyText);}
 catch{return result('INVALID_PUBLIC_SNAPSHOT');}
 const evidence={
  privateRawTextSha256:privateReceipt.privateRawTextSha256,
  privateRawRowCount:privateReceipt.privateRawRowCount,
  privateAwardedRowCount:privateReceipt.privateAwardedRowCount,
  expectedEventCount:privateReceipt.expectedEventCount,
  d1BodySha256:sha256(d1BodyText),d1StoredAt,
 };
 if(!stored||typeof stored!=='object'||Array.isArray(stored)||
  !Array.isArray(stored.events)||!iso(stored.updatedAt)||
  Date.parse(stored.updatedAt)!==d1StoredAt||
  !apiBody||typeof apiBody!=='object'||Array.isArray(apiBody))
  return result('INVALID_PUBLIC_SNAPSHOT',evidence);
 if(!isDeepStrictEqual(apiBody,stored))
  return result('D1_API_BODY_MISMATCH',evidence);
 if(stored.sources?.treasury?.status!=='READY')
  return result('TREASURY_SOURCE_NOT_READY',evidence);
 const observedKeys=new Set(),observedPayloads=[];
 let observedCount=0;
 for(const event of stored.events){
  if(event?.source!=='treasury')continue;
  const eventDate=day(event.date);
  if(eventDate===null)return result('PUBLIC_TREASURY_EVENT_INVALID',evidence);
  // Only audit the exact approved 365-day window. Valid outside-window
  // weekly events are outside this receipt's scope and must not cause a
  // false historical mismatch or require this helper to read their metadata.
  if(eventDate<from||eventDate>to)continue;
  if(typeof event.id!=='string'||
   !/^treasury-(?:announcement|auction)-[a-z0-9]{9}$/.test(event.id)||
   typeof event.title!=='string'||!event.title.trim()||
   typeof event.sourceUrl!=='string'||!event.sourceUrl.startsWith('https://'))
   return result('PUBLIC_TREASURY_EVENT_INVALID',evidence);
  const key=eventKey(event);
  if(observedKeys.has(key))
   return result('PUBLIC_TREASURY_DUPLICATE',evidence);
  observedKeys.add(key);
  observedPayloads.push(eventPayload(event));
  observedCount++;
 }
 const counts={...evidence,publicEventCount:observedCount,
  publicKeySetSha256:digest(observedKeys),
  publicEventPayloadSha256:digest(observedPayloads),
 };
 if(observedCount!==privateReceipt.expectedEventCount||
  counts.publicKeySetSha256!==privateReceipt.expectedKeySetSha256)
  return result('TREASURY_PUBLIC_KEY_MISMATCH',counts);
 if(counts.publicEventPayloadSha256!==privateReceipt.expectedEventPayloadSha256)
  return result('TREASURY_PUBLIC_EVENT_METADATA_MISMATCH',counts);
 return result('KEYED_CONTENT_MATCH_LINEAGE_NOT_VERIFIED',counts);
}

/**
 * Local-only convenience for isolated fixtures or an already-authorized PC
 * process. Never pass a privateText argument to an external/hosted caller.
 * Production comparison should instead use the safe split receipt interface.
 */
export function compareTreasury365KeyedEvidence({
 privateText,fromDate,toDate,
 pcTextSha256,pcRawRowCount,pcAwardedRowCount,
 d1BodyText,d1StoredAt,d1ReadAt,apiBody,apiObservedAt,
 now=Date.now(),...unknown
}={}){
 if(Object.keys(unknown).length||typeof privateText!=='string'||
  !sha.test(pcTextSha256??'')||
  !safeCount(pcRawRowCount)||!safeCount(pcAwardedRowCount)||
  !Number.isSafeInteger(now)||now<1)
  return result('UNVERIFIED_INPUT_CONTRACT');
 let receipt;
 try{receipt=buildTreasury365PrivateReceipt({privateText,fromDate,toDate});}
 catch(error){
  const message=error?.message;
  if(message==='W02_TREASURY_365_DAY_WINDOW_INVALID')
   return result('UNVERIFIED_365_DAY_WINDOW');
  if(message==='W02_TREASURY_PRIVATE_BODY_BOUNDS_INVALID')
   return result('UNVERIFIED_BODY_BOUNDS');
  return result('PRIVATE_RAW_VALIDATION_FAILED');
 }
 if(receipt.privateRawTextSha256!==pcTextSha256)
  return result('PC_RAW_SHA_MISMATCH');
 if(receipt.privateRawRowCount!==pcRawRowCount)
  return result('PC_RAW_ROW_COUNT_MISMATCH');
 if(receipt.privateAwardedRowCount!==pcAwardedRowCount)
  return result('PC_AWARDED_ROW_COUNT_MISMATCH');
 return compareTreasury365ReceiptToPublic({privateReceipt:receipt,
  d1BodyText,d1StoredAt,d1ReadAt,apiBody,apiObservedAt,now});
}
