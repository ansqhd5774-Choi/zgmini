/**
 * R32: percent-only US full-stock R2 HISTORY publication candidate.
 *
 * Reads only an already provider-verified R25 in-memory preview. A separately
 * approved SHA-256 digest is required to enable the isolated D1 write. This
 * module never fetches MarketParquet, changes Core tasks, or reads/writes the
 * legacy confirmed R1 and Alpaca IEX provisional keys.
 *
 * A digest equality check does not itself constitute human approval. The
 * caller must obtain approval independently, outside this module.
 */
import {createHash} from 'node:crypto';
import {latestCompletedSession} from '../../lib/market-score/breadth-b1-r3-calendar.mjs';
import {previousMarketSession} from '../../lib/market-score/breadth-b1-r6-marketparquet-provider.mjs';
import {US_FULL_MARKET_METHOD,US_FULL_MARKET_SOURCE,US_FULL_MARKET_PRICE_MODE,
 US_FULL_MARKET_UNIVERSE} from '../../lib/market-breadth/us-marketparquet-confirmed-public-r2.mjs';
import {US_FULL_MARKET_HISTORY_PERCENT_KEY,validFullMarketPercentHistoryRecord}
 from '../../lib/market-breadth/us-marketparquet-confirmed-history-percent-r32.mjs';

const GET_SQL='SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?';
const UPSERT_SQL='INSERT INTO market_public_snapshots_v1(snapshot_key,body,stored_at) VALUES(?,?,?) '
 +'ON CONFLICT(snapshot_key) DO UPDATE SET body=excluded.body,stored_at=excluded.stored_at '
 +'WHERE market_public_snapshots_v1.stored_at=? AND market_public_snapshots_v1.body=?';
const sha=value=>typeof value==='string'&&/^[0-9a-f]{64}$/.test(value);
const hash=value=>createHash('sha256').update(value,'utf8').digest('hex');
const day=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)
 &&Number.isFinite(Date.parse(value+'T00:00:00Z'))
 &&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
const count=value=>Number.isSafeInteger(value)&&value>=0;
const pct=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=100;
const roundPct=value=>Number(value.toFixed(8));
const fail=status=>({status,publicationAllowed:false,remoteWrites:0,schedulerChanges:0,d1Writes:0});

/**
 * Bound to R25's *raw verified calculation*, not to a caller-created
 * percent-only chart. Keep count evidence private and off public D1 output.
 */
export function prepareVerifiedPercentHistoryR32(verifiedPreview,{now=Date.now()}={}){
 const invalid=()=>({ok:false,status:'VERIFIED_R25_PREVIEW_REQUIRED'});
 if(!Number.isSafeInteger(now)||now<=0
   ||verifiedPreview?.status!=='YEAR_PREVIEW_READY_UNPUBLISHED'
   ||verifiedPreview?.prepared!==true
   ||verifiedPreview?.providerAuthenticityVerified!==true
   ||verifiedPreview?.publicationAllowed!==false
   ||verifiedPreview?.publicationStage!=='PREVIEW_ONLY'
   ||verifiedPreview?.manualReviewRequired!==true)
  return invalid();
 const chart=verifiedPreview.chart;
 if(!chart||chart.status!=='YEAR_PREVIEW_READY_UNPUBLISHED'
   ||chart.prepared!==true||chart.publicationStage!=='PREVIEW_ONLY'
   ||chart.phase!=='CONFIRMED'||chart.source!==US_FULL_MARKET_SOURCE
   ||chart.universe!==US_FULL_MARKET_UNIVERSE
   ||chart.methodologyVersion!==US_FULL_MARKET_METHOD
   ||![249,250].includes(chart.sessionCount)
   ||!Array.isArray(chart.points)||chart.points.length!==chart.sessionCount
   ||!day(chart.firstDate)||!day(chart.lastDate)
   ||chart.points[0]?.date!==chart.firstDate
   ||chart.points.at(-1)?.date!==chart.lastDate)
  return invalid();

 const points=[];
 for(let i=0;i<chart.points.length;i++){
  const p=chart.points[i];
  if(!p||!day(p.date)||!count(p.expectedCount)||p.expectedCount===0
    ||!count(p.rising)||!count(p.falling)||!count(p.unchanged)
    ||p.rising+p.falling+p.unchanged!==p.expectedCount
    ||!count(p.imputedUnchangedCount)||!count(p.observedComparableCount)
    ||p.observedComparableCount+p.imputedUnchangedCount!==p.expectedCount
    ||p.imputedUnchangedCount>p.unchanged
    ||!pct(p.risingPct)||!pct(p.fallingPct)||!pct(p.unchangedPct)
    ||Math.abs(p.risingPct-100*p.rising/p.expectedCount)>1e-7
    ||Math.abs(p.fallingPct-100*p.falling/p.expectedCount)>1e-7
    ||Math.abs(p.unchangedPct-100*p.unchanged/p.expectedCount)>1e-7
    ||(i>0&&previousMarketSession(p.date)!==chart.points[i-1].date))
   return invalid();
  points.push({date:p.date,risingPct:roundPct(p.risingPct),
   fallingPct:roundPct(p.fallingPct),unchangedPct:roundPct(p.unchangedPct)});
 }
 const finalizedAt=new Date(now).toISOString();
 const body={version:2,market:'usa',phase:'CONFIRMED',status:'READY',
  publicationStage:'PUBLIC_FINAL',source:US_FULL_MARKET_SOURCE,
  universe:US_FULL_MARKET_UNIVERSE,methodologyVersion:US_FULL_MARKET_METHOD,
  priceMode:US_FULL_MARKET_PRICE_MODE,finalizedAt,
  firstDate:chart.firstDate,lastDate:chart.lastDate,points};
 if(!validFullMarketPercentHistoryRecord(body))return invalid();
 if(body.lastDate>latestCompletedSession(new Date(now)))return invalid();
 // Approval is for the unrounded R25 calculation evidence (including count
 // inputs), so a materially altered chart cannot reuse a former approval.
 const evidenceSha256=hash(JSON.stringify({
  revision:'US_BREADTH_R32_VERIFIED_R25_PREVIEW',status:verifiedPreview.status,
  providerAuthenticityVerified:verifiedPreview.providerAuthenticityVerified,
  chart,
 }));
 return {ok:true,status:'PERCENT_HISTORY_READY_UNPUBLISHED',body,evidenceSha256,
  publicationAllowed:false};
}

/**
 * D1 writes default OFF. A valid R25 provenance and separately authorized SHA
 * are prerequisites. Existing unknown/newer/same-day conflicting records are
 * preserved and every attempted write is checked by exact D1 readback.
 */
export async function publishVerifiedPercentHistoryR32(remote,database,verifiedPreview,{
 now=Date.now(),finalWriteEnabled=false,approvedPreviewSha256=null,
}={}){
 if(!finalWriteEnabled)return fail('HISTORY_PERCENT_FINAL_WRITE_DISABLED');
 if(!sha(approvedPreviewSha256))return fail('INDEPENDENT_PREVIEW_SHA_APPROVAL_REQUIRED');
 const prepared=prepareVerifiedPercentHistoryR32(verifiedPreview,{now});
 if(!prepared.ok)return fail(prepared.status);
 if(prepared.evidenceSha256!==approvedPreviewSha256)
  return fail('INDEPENDENT_PREVIEW_SHA_APPROVAL_MISMATCH');
 if(!remote||typeof remote.query!=='function'||typeof remote.request!=='function'
   ||typeof database!=='string'||!database.trim())return fail('D1_REMOTE_NOT_CONFIGURED');

 const body=prepared.body;
 const read=async()=>{
  const result=await remote.query(database,GET_SQL,[US_FULL_MARKET_HISTORY_PERCENT_KEY]);
  return result?.results?.[0]??null;
 };
 let before;
 try{before=await read();}
 catch{return fail('D1_HISTORY_READ_UNAVAILABLE');}
 let previous=null;
 if(before){
  try{previous=JSON.parse(before.body);}catch{return fail('UNKNOWN_HISTORY_RECORD_PRESERVED');}
  if(!validFullMarketPercentHistoryRecord(previous))
   return fail('UNKNOWN_HISTORY_RECORD_PRESERVED');
  if(!Number.isSafeInteger(Number(before.stored_at))||Number(before.stored_at)>now)
   return fail('UNKNOWN_HISTORY_RECORD_PRESERVED');
  if(previous.lastDate>body.lastDate)return fail('NEWER_HISTORY_PRESERVED');
  if(previous.lastDate===body.lastDate){
   // Repeat publication does not change the verified historic percentages.
   const same=previous.firstDate===body.firstDate
    &&JSON.stringify(previous.points)===JSON.stringify(body.points);
   return fail(same?'HISTORY_PERCENT_ALREADY_PUBLISHED':'SAME_DAY_HISTORY_CONFLICT_PRESERVED');
  }
 }

 const encoded=JSON.stringify(body);
 const params=[US_FULL_MARKET_HISTORY_PERCENT_KEY,encoded,now,
  before?.stored_at??-1,before?.body??''];
 let writeFailed=false;
 try{await remote.request(database,[{sql:UPSERT_SQL,params}]);}
 catch{writeFailed=true;}
 let after;
 try{after=await read();}
 catch{throw Error(writeFailed?'HISTORY_PERCENT_D1_OUTCOME_UNKNOWN':'HISTORY_PERCENT_D1_READBACK_UNAVAILABLE');}
 if(after?.body!==encoded||Number(after?.stored_at)!==now)
  throw Error(writeFailed?'HISTORY_PERCENT_D1_OUTCOME_UNKNOWN':'HISTORY_PERCENT_D1_READBACK_MISMATCH');
 return {status:'VERIFIED_PERCENT_HISTORY_FINAL',publicationAllowed:true,
  key:US_FULL_MARKET_HISTORY_PERCENT_KEY,
  firstDate:body.firstDate,lastDate:body.lastDate,
  remoteWrites:1,d1Writes:1,schedulerChanges:0};
}
