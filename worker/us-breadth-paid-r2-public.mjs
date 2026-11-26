/**
 * Read-only public reader for the independent paid full-US breadth R2 key.
 * Never falls back to retired MarketParquet free samples, R1/SP500 or IEX.
 */
import {US_PAID_R2_FEED_KEY,validPaidUsR2Record,
  paidUsR2PublicProjection} from './us-breadth-paid-r2-contract.mjs';
import {latestCompletedSession} from '../lib/market-score/breadth-b1-r3-calendar.mjs';

const query="SELECT body,stored_at FROM public_feed_snapshots_v1 WHERE kind='output' AND feed_key=? AND snapshot_key='current'";
const fail=reason=>({ok:false,httpStatus:503,reason});
/**
 * GET response planning only. The caller owns Request/Response and Cloudflare DB.
 * History may show a correctly dated old final; current never claims an old day.
 */
export async function readPaidUsR2Feed(db,{
  mode='current',now=Date.now(),
}={}){
  if(!['current','history'].includes(mode)||!Number.isSafeInteger(now)||now<=0)
    return fail('US_PAID_R2_READ_ARGUMENTS_INVALID');
  if(!db||typeof db.prepare!=='function')
    return fail('US_PAID_R2_CORE_DB_UNAVAILABLE');
  let row;
  try{
    row=await db.prepare(query).bind(US_PAID_R2_FEED_KEY).first();
  }catch{
    return fail('US_PAID_R2_D1_UNAVAILABLE');
  }
  if(!row)return fail('US_PAID_R2_NOT_PUBLISHED');
  let record;
  try{record=JSON.parse(row.body);}
  catch{return fail('US_PAID_R2_INVALID_JSON');}
  if(!validPaidUsR2Record(record))
    return fail('US_PAID_R2_INVALID_PAID_PUBLIC_RECORD');
  const storedAt=Number(row.stored_at);
  const finalizedAt=Date.parse(record.finalizedAt);
  if(!Number.isSafeInteger(storedAt)||storedAt<=0||storedAt>now+60_000
      ||!Number.isFinite(finalizedAt)||finalizedAt>now+60_000
      ||finalizedAt>storedAt+60_000)
    return fail('US_PAID_R2_INVALID_PUBLICATION_TIME');
  const latest=latestCompletedSession(new Date(now));
  if(record.observationDate>latest)
    return fail('US_PAID_R2_FUTURE_OBSERVATION');
  if(mode==='current'&&record.observationDate!==latest)
    return fail('US_PAID_R2_STALE_OBSERVATION');
  const body=paidUsR2PublicProjection(record,{history:mode==='history'});
  if(!body)return fail('US_PAID_R2_PROJECTION_INVALID');
  return {ok:true,httpStatus:200,body,headers:{
    'Cache-Control':'no-store',
    'x-data-snapshot-at':new Date(storedAt).toISOString(),
    'x-zgmini-breadth-source':'MARKETPARQUET_PAID_STOCK_DAILY_R2',
  }};
}
