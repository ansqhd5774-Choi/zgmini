/**
 * Whole-US paid breadth R2 from existing PRIVATE stock_daily storage.
 * No provider GET, no D1, no scheduler, and no file writes.
 * On current main it reuses marketparquet-paid-store.mjs exactly; the optional
 * store injection only supplies the same methods for isolated fixture tests.
 */
import {preparePaidFullMarketR2,US_PAID_R2_SOURCE,US_PAID_R2_PRICE_MODE}
  from '../../lib/market-breadth/us-marketparquet-paid-r2-adapter.mjs';
import {previousMarketSession} from '../../lib/market-score/breadth-b1-r6-marketparquet-provider.mjs';
import {latestCompletedSession} from '../../lib/market-score/breadth-b1-r3-calendar.mjs';

const day=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)
  &&Number.isFinite(Date.parse(s+'T00:00:00Z'))
  &&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
const halt=(code,details={})=>({
  status:code,prepared:false,publicationAllowed:false,providerCalls:0,
  d1Writes:0,operationalWrites:0,...details,
});

/**
 * Read-only R2 Archive target planner. The approved common paid collector owns
 * network and file effects; this does not download or save anything.
 * Actual raw/projection SHA verification remains a separate readback step.
 */
export async function planStoredPaidUsR2Backfill(base,{
  store=null,maxPoints=250,now=Date.now(),
}={}){
  if(typeof base!=='string'||!base||!Number.isSafeInteger(maxPoints)
      ||maxPoints<1||maxPoints>250||!Number.isSafeInteger(now)||now<=0)
    return halt('PAID_R2_BACKFILL_ARGUMENTS_INVALID');
  const lastDate=latestCompletedSession(new Date(now));
  if(!day(lastDate))return halt('PAID_R2_BACKFILL_LATEST_SESSION_UNKNOWN');
  const required=[lastDate];
  for(let i=0;i<maxPoints;i++){
    const prev=previousMarketSession(required[0]);
    if(!day(prev)||prev>=required[0])
      return halt('PAID_R2_BACKFILL_CALENDAR_INVALID');
    required.unshift(prev);
  }
  let reader=store;
  if(!reader){
    try{reader=await import('./marketparquet-paid-store.mjs');}
    catch{return halt('PAID_R2_APPROVED_STORE_UNAVAILABLE');}
  }
  if(typeof reader?.paidDates!=='function')
    return halt('PAID_R2_STORE_CONTRACT_UNAVAILABLE');
  let listed;
  try{listed=reader.paidDates(base,'stock_daily');}
  catch{return halt('PAID_R2_STORED_INDEX_UNAVAILABLE');}
  if(!Array.isArray(listed)||listed.some(d=>!day(d))
      ||new Set(listed).size!==listed.length
      ||listed.some((d,i)=>i>0&&d<=listed[i-1]))
    return halt('PAID_R2_STORED_DATES_INVALID');
  const present=new Set(listed);
  const missingDates=required.filter(d=>!present.has(d));
  return {
    status:missingDates.length?'PAID_R2_BACKFILL_REQUIRED':
      'PAID_R2_TARGET_DATES_PRESENT_UNVERIFIED',
    prepared:true,publicationAllowed:false,
    firstDate:required[0],lastDate,
    requiredSessions:required.length,
    storedTargetDates:required.length-missingDates.length,
    missingCount:missingDates.length,
    missingDates,fullYearTarget:maxPoints===250,
    rawShaVerified:false,projectionShaVerified:false,
    providerCalls:0,d1Writes:0,operationalWrites:0,
  };
}

/**
 * The user-approved 250-comparison one-year display requires at most 251
 * independently verified adjacent trading dates. A missing whole daily file
 * is not an unchanged ticker; reject the entire requested consecutive window.
 */
export async function calculateStoredPaidUsBreadthR2(base,{
  store=null,maxPoints=250,throughDate=null,
}={}){
  if(typeof base!=='string'||!base||!Number.isSafeInteger(maxPoints)
      ||maxPoints<1||maxPoints>250||throughDate!==null&&!day(throughDate))
    return halt('PAID_R2_STORED_ARGUMENTS_INVALID');

  let reader=store;
  if(!reader){
    try{reader=await import('./marketparquet-paid-store.mjs');}
    catch{return halt('PAID_R2_APPROVED_STORE_UNAVAILABLE');}
  }
  if(typeof reader?.paidDates!=='function'
      ||typeof reader?.readPaidDaily!=='function'
      ||typeof reader?.readPaidProjection!=='function')
    return halt('PAID_R2_STORE_CONTRACT_UNAVAILABLE');

  let all;
  try{all=reader.paidDates(base,'stock_daily');}
  catch{return halt('PAID_R2_STORED_INDEX_UNAVAILABLE');}
  if(!Array.isArray(all)||all.length<2||all.some(d=>!day(d))
      ||new Set(all).size!==all.length
      ||all.some((d,i)=>i>0&&d<=all[i-1]))
    return halt('PAID_R2_STORED_DATES_INVALID');
  const lastIndex=throughDate===null?all.length-1:all.indexOf(throughDate);
  if(lastIndex<0)return halt('PAID_R2_TARGET_DATE_NOT_STORED');
  if(lastIndex<1)return halt('PAID_R2_PREVIOUS_DATE_NOT_STORED');
  const selected=all.slice(Math.max(0,lastIndex-maxPoints),lastIndex+1);
  for(let i=1;i<selected.length;i++){
    if(previousMarketSession(selected[i])!==selected[i-1])
      return halt('PAID_R2_STORED_SESSION_GAP',{
        priorStoredDate:selected[i-1],nextStoredDate:selected[i],
      });
  }

  // Exactly one decoded private projection per day. The approved store
  // re-checks immutable source bytes and projection SHA on every read.
  let prior=null;
  const points=[],privateSources=[];
  for(const date of selected){
    let item;
    try{
      const saved=reader.readPaidDaily(base,'stock_daily',date);
      const rows=reader.readPaidProjection(base,'stock_daily',date);
      if(saved?.receipt?.date!==date||!Array.isArray(rows))
        return halt('PAID_R2_STORED_READBACK_CONTRACT');
      item={date,receipt:saved.receipt,rows};
    }catch{
      return halt('PAID_R2_STORED_READBACK_FAILED',{failedDate:date});
    }
    privateSources.push({date,sha256:item.receipt.sha256,
      projectionSha256:item.receipt.projectionSha256});
    if(prior){
      const candidate=preparePaidFullMarketR2({
        currentRows:item.rows,previousRows:prior.rows,
        currentReceipt:item.receipt,previousReceipt:prior.receipt,
      });
      if(candidate.prepared!==true)return halt('PAID_R2_STORED_CALCULATION_REJECTED',{
        failedDate:date,reason:candidate.status,
      });
      points.push({date,
        risingPct:candidate.publicPercentPreview.risingPct,
        unchangedPct:candidate.publicPercentPreview.unchangedPct,
        fallingPct:candidate.publicPercentPreview.fallingPct,
      });
    }
    prior=item;
  }
  return {
    status:'PAID_R2_STORED_PRIVATE_CALCULATED',prepared:true,
    source:US_PAID_R2_SOURCE,priceMode:US_PAID_R2_PRICE_MODE,
    publicationAllowed:false,providerCalls:0,d1Writes:0,operationalWrites:0,
    firstDate:points[0].date,lastDate:points.at(-1).date,
    comparedSessions:points.length,fullYearHistory:points.length===250,
    latestStoredDate:all.at(-1),sourceLatestProviderDateVerified:false,
    publicPercentPreview:points.at(-1),
    publicHistoryPreview:points,
    privateSourceReceipts:privateSources,
  };
}
