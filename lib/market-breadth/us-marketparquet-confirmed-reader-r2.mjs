/**
 * Future PUBLIC_FINAL read-only contract for full-market confirmed breadth.
 * Never treats the R20 STAGING_ONLY candidate as a published final record.
 * No database, network, or legacy R1 access occurs inside this module.
 */
import {latestCompletedSession} from '../market-score/breadth-b1-r3-calendar.mjs';
import {previousMarketSession} from '../market-score/breadth-b1-r6-marketparquet-provider.mjs';
import {US_FULL_MARKET_STAGING_KEY,validFullMarketStagingRecord}
  from './us-marketparquet-confirmed-public-r2.mjs';

export const US_FULL_MARKET_PUBLIC_KEY='public:market-breadth-confirmed-r2:usa:current';
export const US_FULL_MARKET_PUBLIC_DAILY_PREFIX='public:market-breadth-confirmed-r2:usa:daily:';

const iso=value=>typeof value==='string'&&Number.isFinite(Date.parse(value));
const sha=value=>typeof value==='string'&&/^[0-9a-f]{64}$/.test(value);

/** Validate a final-publisher output without changing the staging validator. */
export function validFullMarketPublicRecord(record){
  if(!record||record.version!==2||record.status!=='READY'
    ||record.publicationStage!=='PUBLIC_FINAL'||!iso(record.finalizedAt)
    ||!record.promotionProof
    ||record.promotionProof.stagingKey!==US_FULL_MARKET_STAGING_KEY
    ||!iso(record.promotionProof.verifiedAt)
    ||!sha(record.promotionProof.stagingBodySha256)
    ||Date.parse(record.promotionProof.verifiedAt)>Date.parse(record.finalizedAt)
    ||Date.parse(record.finalizedAt)<Date.parse(record.calculatedAt)
    ||previousMarketSession(record.observationDate)!==record.previousDate)return false;
  // A final record must retain every independently verified source/count field
  // from the R20 candidate. Alter only phase-of-publication fields for checking.
  return validFullMarketStagingRecord({...record,status:'CANDIDATE',
    publicationStage:'STAGING_ONLY'});
}

/** No route integration yet. Invoked ONLY after independent final writer Gate. */
export async function readFullMarketPublicCurrent(readSnapshot,{now=Date.now()}={}){
  const fail=reason=>({ok:false,httpStatus:503,reason});
  if(typeof readSnapshot!=='function'||!Number.isFinite(now))return fail('FULL_MARKET_READER_INVALID');
  let row;
  try{row=await readSnapshot(US_FULL_MARKET_PUBLIC_KEY);}
  catch{return fail('FULL_MARKET_STORED_OUTPUT_UNAVAILABLE');}
  if(!row)return fail('FULL_MARKET_NOT_PUBLISHED');
  let record;
  try{record=JSON.parse(row.body);}catch{return fail('FULL_MARKET_INVALID_STORED_OUTPUT');}
  if(!validFullMarketPublicRecord(record))return fail('FULL_MARKET_NOT_VERIFIED_FINAL');
  const stamp=Number(row.stored_at);
  if(!Number.isSafeInteger(stamp)||stamp<=0||stamp>now+60_000)
    return fail('FULL_MARKET_INVALID_PUBLICATION_TIME');
  if(record.observationDate!==latestCompletedSession(new Date(now)))
    return fail('FULL_MARKET_STALE_OBSERVATION');
  // The final writer publishes current and same-day keys together. A partial
  // D1 write must never be presented as an independently verified final.
  let daily;
  try{daily=await readSnapshot(US_FULL_MARKET_PUBLIC_DAILY_PREFIX+record.observationDate);}
  catch{return fail('FULL_MARKET_DAILY_READ_UNAVAILABLE');}
  if(!daily)return fail('FULL_MARKET_DAILY_NOT_PUBLISHED');
  if(daily.body!==row.body||Number(daily.stored_at)!==stamp)
    return fail('FULL_MARKET_DAILY_MISMATCH');
  return {ok:true,httpStatus:200,body:record,
    headers:{'Cache-Control':'no-store','x-data-snapshot-at':new Date(stamp).toISOString()}};
}
