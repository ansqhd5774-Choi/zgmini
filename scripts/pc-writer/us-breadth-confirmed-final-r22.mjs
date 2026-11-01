/**
 * Explicit, independently approved full-market R2 STAGING -> PUBLIC_FINAL gate.
 * No legacy R1, IEX provisional, provider calls, or raw prices are accessed.
 * D1 writes are OFF unless explicitly enabled with an independent SHA approval.
 */
import {createHash} from 'node:crypto';
import {latestCompletedSession} from '../../lib/market-score/breadth-b1-r3-calendar.mjs';
import {US_FULL_MARKET_STAGING_KEY,validFullMarketStagingRecord}
 from '../../lib/market-breadth/us-marketparquet-confirmed-public-r2.mjs';
import {US_FULL_MARKET_PUBLIC_KEY,US_FULL_MARKET_PUBLIC_DAILY_PREFIX,
  validFullMarketPublicRecord} from '../../lib/market-breadth/us-marketparquet-confirmed-reader-r2.mjs';

const hash=text=>createHash('sha256').update(text,'utf8').digest('hex');
const sha=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);

const GET_SQL='SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?';
const UPSERT_SQL='INSERT INTO market_public_snapshots_v1(snapshot_key,body,stored_at) VALUES(?,?,?) '
 +'ON CONFLICT(snapshot_key) DO UPDATE SET body=excluded.body,stored_at=excluded.stored_at '
 +'WHERE market_public_snapshots_v1.stored_at=? AND market_public_snapshots_v1.body=?';

export async function promoteVerifiedFullMarketStaging(remote,database,{
  now=Date.now(),finalWriteEnabled=false,approvedStagingBodySha256=null,
  approvedProviderSourceSha256=null,
}={}){
  if(!finalWriteEnabled)return {status:'FULL_MARKET_FINAL_WRITE_DISABLED'};
  if(!Number.isSafeInteger(now)||now<=0||!sha(approvedStagingBodySha256)
    ||!approvedProviderSourceSha256||!sha(approvedProviderSourceSha256.current)
    ||!sha(approvedProviderSourceSha256.previous))
    return {status:'INDEPENDENT_APPROVAL_REQUIRED'};
  const read=async key=>(await remote.query(database,GET_SQL,[key])).results?.[0]??null;
  // Never accept a caller-supplied candidate body. It MUST already have
  // survived D1 STAGING read-back and separately approved provider SHA checks.
  const stageRow=await read(US_FULL_MARKET_STAGING_KEY);
  if(typeof stageRow?.body!=='string')return {status:'STAGING_NOT_FOUND'};
  let staging;
  try{staging=JSON.parse(stageRow.body);}catch{return {status:'STAGING_INVALID_PRESERVED'};}
  if(!validFullMarketStagingRecord(staging))return {status:'STAGING_INVALID_PRESERVED'};
  const digest=hash(stageRow.body);
  if(digest!==approvedStagingBodySha256
    ||staging.sourceEvidence.current.sha256!==approvedProviderSourceSha256.current
    ||staging.sourceEvidence.previous.sha256!==approvedProviderSourceSha256.previous)
    return {status:'STAGING_APPROVAL_SHA_MISMATCH'};
  if(!Number.isSafeInteger(Number(stageRow.stored_at))||stageRow.stored_at<=0||stageRow.stored_at>now
    ||Date.parse(staging.calculatedAt)>now)
    return {status:'STAGING_TIME_INVALID'};
  if(staging.observationDate!==latestCompletedSession(new Date(now)))
    return {status:'STAGING_NOT_LATEST_COMPLETED_SESSION'};

  const finalizedAt=new Date(now).toISOString();
  const body={...staging,status:'READY',publicationStage:'PUBLIC_FINAL',finalizedAt,
    promotionProof:{stagingKey:US_FULL_MARKET_STAGING_KEY,stagingBodySha256:digest,
      verifiedAt:finalizedAt}};
  if(!validFullMarketPublicRecord(body))return {status:'FINAL_CONTRACT_INVALID'};
  const dayKey=US_FULL_MARKET_PUBLIC_DAILY_PREFIX+body.observationDate;
  const oldCurrent=await read(US_FULL_MARKET_PUBLIC_KEY),oldDaily=await read(dayKey);
  const parsed=row=>{try{return row?.body?JSON.parse(row.body):null;}catch{return null;}};
  const current=parsed(oldCurrent),daily=parsed(oldDaily);
  if((oldCurrent&&!validFullMarketPublicRecord(current))
    ||(oldDaily&&!validFullMarketPublicRecord(daily)))
    return {status:'UNKNOWN_FINAL_RECORD_PRESERVED'};
  if(current?.observationDate>body.observationDate)
    return {status:'NEWER_FINAL_PRESERVED'};
  if(current?.observationDate===body.observationDate||oldDaily){
    const same=validFullMarketPublicRecord(current)&&validFullMarketPublicRecord(daily)
      &&current.observationDate===body.observationDate&&daily.observationDate===body.observationDate
      &&current.promotionProof.stagingBodySha256===digest
      &&daily.promotionProof.stagingBodySha256===digest;
    return {status:same?'FINAL_ALREADY_PUBLISHED':'EXISTING_FINAL_PRESERVED'};
  }
  if(oldCurrent&&Number(oldCurrent.stored_at)>now)return {status:'NEWER_PUBLICATION_PRESERVED'};
  const encoded=JSON.stringify(body),entries=[
    {key:US_FULL_MARKET_PUBLIC_KEY,row:oldCurrent},
    {key:dayKey,row:oldDaily},
  ];
  const statements=entries.map(({key,row})=>({sql:UPSERT_SQL,
    params:[key,encoded,now,row?.stored_at??-1,row?.body??'']}));
  let writeFailed=false;
  try{await remote.request(database,statements);}catch{writeFailed=true;}
  const [afterCurrent,afterDaily]=await Promise.all(entries.map(x=>read(x.key)));
  if(afterCurrent?.body!==encoded||afterDaily?.body!==encoded)
    throw Error(writeFailed?'FULL_MARKET_FINAL_PUBLICATION_UNKNOWN':'FULL_MARKET_FINAL_READBACK_MISMATCH');
  return {status:'VERIFIED_FULL_MARKET_FINAL',observationDate:body.observationDate,
    expectedCount:body.expectedCount,imputedUnchangedCount:body.imputedUnchangedCount,
    keys:entries.map(x=>x.key)};
}
