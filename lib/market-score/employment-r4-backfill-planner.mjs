import { EMPLOYMENT_R4_FORWARD_FLOORS } from "./employment-r4-forward-contract.mjs";

const int = (v,label) => {
  const n=Number(v);
  if(!Number.isInteger(n)||n<1)throw new TypeError(`${label}_INVALID`);
  return n;
};

export function requiredClaimsRawHistoryWeeks({
  normalizerHistoryObservations=EMPLOYMENT_R4_FORWARD_FLOORS.claims.normalizerHistoryObservations,
  yoyLagWeeks=52,
  rollingWeeks=4,
  excludeCurrentFromNormalizer=true,
}={}) {
  const h=int(normalizerHistoryObservations,"NORMALIZER_HISTORY");
  const lag=int(yoyLagWeeks,"YOY_LAG");
  const roll=int(rollingWeeks,"ROLLING_WEEKS");
  // A 4W YoY feature at week t needs t..t-3 and t-52..t-55.
  // For the first forward score, the normalizer must already have H PRIOR
  // breadth observations. Earliest required raw = t - (H + lag + roll - 1).
  // Inclusive raw count = H + lag + roll when current is excluded.
  return h+lag+roll-(excludeCurrentFromNormalizer?0:1);
}

export function planClaimsHistoryBackfill({
  totalWeeks=requiredClaimsRawHistoryWeeks(),
  batchWeeks=8,
  geographyCount=51,
}={}) {
  const weeks=int(totalWeeks,"TOTAL_WEEKS"), bw=int(batchWeeks,"BATCH_WEEKS"), geos=int(geographyCount,"GEOGRAPHY_COUNT");
  const batches=[];
  let newestOffset=0,index=1;
  while(newestOffset<weeks){
    const count=Math.min(bw,weeks-newestOffset);
    batches.push(Object.freeze({
      batchIndex:index++,
      newestWeekOffset:newestOffset,
      oldestWeekOffset:newestOffset+count-1,
      weekCount:count,
      maxRows:count*geos,
    }));
    newestOffset+=count;
  }
  return Object.freeze({
    family:"STATE_CLAIMS_BREADTH",
    pitClass:"HISTORICAL_CURRENT_OR_REVISED_PROVIDER_HISTORY",
    totalWeeks:weeks,
    geographyCount:geos,
    expectedRawRows:weeks*geos,
    batchWeeks:bw,
    batchCount:batches.length,
    batches:Object.freeze(batches),
  });
}

export function planGeographicHistoryBackfill({
  totalMonths=428,
  batchMonths=24,
  seriesCount=8,
}={}) {
  const months=int(totalMonths,"TOTAL_MONTHS"), bm=int(batchMonths,"BATCH_MONTHS"), series=int(seriesCount,"SERIES_COUNT");
  const batches=[];
  let newestOffset=0,index=1;
  while(newestOffset<months){
    const count=Math.min(bm,months-newestOffset);
    batches.push(Object.freeze({
      batchIndex:index++,
      newestMonthOffset:newestOffset,
      oldestMonthOffset:newestOffset+count-1,
      monthCount:count,
      maxRows:count*series,
    }));
    newestOffset+=count;
  }
  return Object.freeze({
    family:"GEOGRAPHIC_EMPLOYMENT_BREADTH",
    pitClass:"HISTORICAL_CURRENT_VINTAGE",
    totalMonths:months,
    seriesCount:series,
    expectedRawRows:months*series,
    batchMonths:bm,
    batchCount:batches.length,
    batches:Object.freeze(batches),
  });
}

export const EMPLOYMENT_R4_BACKFILL_PLANNER_CONTRACT = Object.freeze({
  scoreComputation:false,
  providerCalls:0,
  writesProduction:false,
  output:"BOUNDED_BATCH_PLAN_ONLY",
  claimsDefaultRawWeeks:requiredClaimsRawHistoryWeeks(),
  claimsDefaultBatchWeeks:8,
  geographicDefaultBatchMonths:24,
});
