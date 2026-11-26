/**
 * Paid MarketParquet -> existing whole-US issue-direction R2 calculator.
 * PRIVATE candidate only: no provider request, local/D1 write or public rights
 * promotion. A caller must load and SHA-readback both stock_daily Parquet files
 * through the approved marketparquet-paid-store before supplying rows/receipts.
 */
import {calculateFullMarketConfirmedCandidate}
  from './us-marketparquet-confirmed-r2.mjs';
import {FULL_MARKET_MISSING_AS_UNCHANGED}
  from './us-marketparquet-confirmed-r2.mjs';

export const US_PAID_R2_SOURCE='MARKETPARQUET_PAID_SPLIT_ADJUSTED_DAILY';
export const US_PAID_R2_PRICE_MODE='SPLIT_ADJUSTED_DAILY_CLOSE';
const digest=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
const date=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)
  &&Number.isFinite(Date.parse(x+'T00:00:00Z'))
  &&new Date(x+'T00:00:00Z').toISOString().slice(0,10)===x;
const count=x=>Number.isSafeInteger(x)&&x>0;
const denied=(reason)=>({status:reason,prepared:false,publicationAllowed:false});

function paidReceipt(r,expectedDate,rows){
  return r?.schema==='ZGMINI_MP_PAID_FILE_V1'
    &&r.plan==='full'&&r.assetType==='stock_daily'
    &&r.priceMode===US_PAID_R2_PRICE_MODE&&r.rawPublished===false
    &&date(r.date)&&r.date===expectedDate
    &&digest(r.sha256)&&digest(r.projectionSha256)
    &&count(r.bytes)&&count(r.rows)&&r.rows===rows?.length;
}

/**
 * The paid receipt is not itself a license certificate. This adapter rejects
 * free/mixed/invalid input and returns an unpublishable calculation candidate.
 * It preserves the previously approved R2 missing-prior-price classification.
 */
export function preparePaidFullMarketR2({
  currentRows,previousRows,currentReceipt,previousReceipt,
}={}){
  if(!Array.isArray(currentRows)||!Array.isArray(previousRows))
    return denied('PAID_R2_SOURCE_ROWS_MISSING');
  const observationDate=currentReceipt?.date,previousDate=previousReceipt?.date;
  if(!date(observationDate)||!date(previousDate)||previousDate>=observationDate)
    return denied('PAID_R2_DATE_INVALID');
  if(!paidReceipt(currentReceipt,observationDate,currentRows)
      ||!paidReceipt(previousReceipt,previousDate,previousRows)
      ||currentReceipt.sha256===previousReceipt.sha256)
    return denied('PAID_R2_SOURCE_RECEIPT_INVALID');

  const candidate=calculateFullMarketConfirmedCandidate({
    observationDate,previousDate,currentRows,previousRows,
    missingPricePolicy:'MISSING_AS_UNCHANGED',
  });
  if(candidate.status!=='CALCULATED_UNPUBLISHED'
      ||candidate.methodologyVersion!==FULL_MARKET_MISSING_AS_UNCHANGED
      ||!candidate.expectedCount||candidate.eligibleCount!==candidate.expectedCount
      ||candidate.counts.rising+candidate.counts.unchanged
        +candidate.counts.falling!==candidate.expectedCount)
    return denied('PAID_R2_CALCULATION_'+String(candidate.status).replace(/[^A-Z0-9_]/g,''));

  const denom=candidate.expectedCount;
  const preview={
    observationDate,previousDate,
    risingPct:candidate.counts.rising/denom*100,
    unchangedPct:candidate.counts.unchanged/denom*100,
    fallingPct:candidate.counts.falling/denom*100,
  };
  return {
    status:'PAID_R2_PRIVATE_CALCULATED',prepared:true,
    publicationAllowed:false,source:US_PAID_R2_SOURCE,
    priceMode:US_PAID_R2_PRICE_MODE,
    methodologyVersion:FULL_MARKET_MISSING_AS_UNCHANGED,
    observationDate,previousDate,
    privateCounts:candidate.counts,
    privateQuality:{
      expectedCount:denom,observedComparableCount:candidate.observedComparableCount,
      imputedUnchangedCount:candidate.imputedUnchangedCount,
      sourcePairCoverage:candidate.sourcePairCoverage,
    },
    privateEvidence:{
      currentSha256:currentReceipt.sha256,
      previousSha256:previousReceipt.sha256,
      currentProjectionSha256:currentReceipt.projectionSha256,
      previousProjectionSha256:previousReceipt.projectionSha256,
    },
    publicPercentPreview:preview,
  };
}
