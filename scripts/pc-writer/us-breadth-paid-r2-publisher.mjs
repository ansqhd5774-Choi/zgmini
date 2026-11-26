/**
 * R2-only paid breadth publisher primitives.
 * Not attached to Core/Task. The existing approved PC Writer must check its
 * live checkout source pin, paid account, and private raw SHA readbacks before
 * calling these methods; callers cannot claim those checks by setting a flag.
 * Never writes old free R1/R2 or S&P500 B1-R5 keys.
 */
import {createHash} from 'node:crypto';
import {validPrivatePaidUsBreadthR2} from './us-breadth-paid-r2-private-save.mjs';
import {US_PAID_R2_FEED_KEY,US_PAID_R2_VERSION,
  US_PAID_R2_SOURCE,US_PAID_R2_UNIVERSE,US_PAID_R2_PRICE_MODE,
  US_PAID_R2_METHOD,validPaidUsR2Record}
  from '../../worker/us-breadth-paid-r2-contract.mjs';

const sha=b=>createHash('sha256').update(b).digest('hex');
const need=(x,code)=>{if(!x)throw Object.assign(Error(code),{code});};
const digest=s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
const query="SELECT body,stored_at FROM public_feed_snapshots_v1 WHERE kind='output' AND feed_key=? AND snapshot_key='current'";

/**
 * Must receive the result of source-verified private readback, not arbitrary
 * external JSON. `fileSha256` is independently SHA'd by the approved Writer.
 */
export function buildPaidUsR2Final({calculated,fileSha256,now=Date.now()}={}){
  need(validPrivatePaidUsBreadthR2(calculated),
    'US_PAID_R2_PRIVATE_SOURCE_INVALID');
  need(digest(fileSha256),'US_PAID_R2_PRIVATE_SHA_REQUIRED');
  need(Number.isSafeInteger(now)&&now>0,'US_PAID_R2_FINAL_TIME_INVALID');
  const finalizedAt=new Date(now).toISOString();
  const record={
    version:US_PAID_R2_VERSION,status:'READY',market:'usa',
    phase:'CONFIRMED',publicationStage:'PUBLIC_FINAL',plan:'full',
    source:US_PAID_R2_SOURCE,universe:US_PAID_R2_UNIVERSE,
    priceMode:US_PAID_R2_PRICE_MODE,methodologyVersion:US_PAID_R2_METHOD,
    finalizedAt,sourceFileSha256:fileSha256,
    firstDate:calculated.firstDate,lastDate:calculated.lastDate,
    observationDate:calculated.lastDate,
    historyComplete:calculated.fullYearHistory,
    points:calculated.publicHistoryPreview.map(p=>({
      date:p.date,risingPct:p.risingPct,
      unchangedPct:p.unchangedPct,fallingPct:p.fallingPct,
    })),
  };
  need(validPaidUsR2Record(record),'US_PAID_R2_PUBLIC_RECORD_INVALID');
  return record;
}
const semantic=x=>JSON.stringify({...x,finalizedAt:null,sourceFileSha256:null});

/** CAS/write/readback with no hidden retries, if the authorized Writer invokes it. */
export async function publishPaidUsR2Final({
  remote,dbId,record,preimage,now=Date.now(),
}={}){
  need(remote&&typeof remote.request==='function'
    &&typeof remote.query==='function'&&typeof dbId==='string'
    &&dbId.length>0,'US_PAID_R2_REMOTE_INVALID');
  need(validPaidUsR2Record(record),'US_PAID_R2_PUBLISH_RECORD_INVALID');
  need(Number.isSafeInteger(now)&&now>=Date.parse(record.finalizedAt)
    &&now>Number(preimage?.stored_at??0),
    'US_PAID_R2_CAS_TIME_INVALID');
  if(preimage){
    let old;
    try{old=JSON.parse(preimage.body);}
    catch{throw Object.assign(Error('US_PAID_R2_UNKNOWN_PREIMAGE'),{code:'US_PAID_R2_UNKNOWN_PREIMAGE'});}
    need(validPaidUsR2Record(old)&&old.observationDate<=record.observationDate,
      'US_PAID_R2_INVALID_OR_NEWER_D1_PRESERVED');
    const oldPoints=new Map(old.points.map(p=>[p.date,p]));
    for(const p of record.points){
      const existing=oldPoints.get(p.date);
      need(!existing||existing.risingPct===p.risingPct
          &&existing.unchangedPct===p.unchangedPct
          &&existing.fallingPct===p.fallingPct,
        'US_PAID_R2_HISTORY_DRIFT_PRESERVED');
    }
    if(old.observationDate===record.observationDate){
      need(semantic(old)===semantic(record),
        'US_PAID_R2_SAME_DATE_CONFLICT_PRESERVED');
      return {status:'US_PAID_R2_UNCHANGED_VERIFIED',d1Writes:0,
        bodySha256:sha(preimage.body),storedAt:preimage.stored_at};
    }
  }
  const body=JSON.stringify(record);
  const sql=preimage
    ?"UPDATE public_feed_snapshots_v1 SET body=?,stored_at=? WHERE kind='output' AND feed_key=? AND snapshot_key='current' AND body=? AND stored_at=?"
    :"INSERT INTO public_feed_snapshots_v1(kind,feed_key,snapshot_key,body,stored_at) VALUES('output',?,'current',?,?) ON CONFLICT(kind,feed_key,snapshot_key) DO NOTHING";
  const params=preimage
    ?[body,now,US_PAID_R2_FEED_KEY,preimage.body,preimage.stored_at]
    :[US_PAID_R2_FEED_KEY,body,now];
  let applied;
  try{applied=await remote.request(dbId,[{sql,params}]);}
  catch{throw Object.assign(Error('US_PAID_R2_D1_OUTCOME_UNKNOWN_NO_RETRY'),
    {code:'US_PAID_R2_D1_OUTCOME_UNKNOWN_NO_RETRY'});}
  let after;
  try{after=(await remote.query(dbId,query,[US_PAID_R2_FEED_KEY])).results?.[0];}
  catch{throw Object.assign(Error('US_PAID_R2_D1_READBACK_UNVERIFIED_NO_RETRY'),
    {code:'US_PAID_R2_D1_READBACK_UNVERIFIED_NO_RETRY'});}
  need(after?.body===body&&Number(after.stored_at)===now
    &&applied?.[0]?.meta?.changes===1,'US_PAID_R2_CAS_READBACK_MISMATCH');
  return {status:'US_PAID_R2_D1_CAS_READBACK_VERIFIED',d1Writes:1,
    bodySha256:sha(body),storedAt:now};
}
