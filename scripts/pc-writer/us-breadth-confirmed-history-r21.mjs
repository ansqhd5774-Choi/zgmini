/** New full-market one-year *preview*; never reads or rewrites legacy R1 history. */
import {previousMarketSession} from '../../lib/market-score/breadth-b1-r6-marketparquet-provider.mjs';
import {prepareFullMarketStaging} from './us-breadth-confirmed-staging-r20.mjs';
import {US_FULL_MARKET_SOURCE,US_FULL_MARKET_UNIVERSE,US_FULL_MARKET_METHOD}
 from '../../lib/market-breadth/us-marketparquet-confirmed-public-r2.mjs';

export const US_FULL_MARKET_YEAR_SESSIONS=250;

/**
 * Accepts a chronologically ascending, independently verified source ledger
 * containing 251 complete daily files for 250 new chart points. No backfill,
 * database access, network call, or file write. A missing date fails closed.
 */
export async function prepareFullMarketYearPreview({approvedSourceRoot,manifestEntries,
  now=new Date(),readParquet,sessionCount=US_FULL_MARKET_YEAR_SESSIONS}={}){
  const fail=(status,detail)=>({status,prepared:false,detail});
  if(!Number.isSafeInteger(sessionCount)||sessionCount<1||sessionCount>US_FULL_MARKET_YEAR_SESSIONS)
    return fail('HISTORY_LENGTH_INVALID');
  if(!Array.isArray(manifestEntries)||manifestEntries.length!==sessionCount+1)
    return fail('COMPLETE_HISTORY_MANIFEST_REQUIRED',`${sessionCount+1}_DAILY_FILES_REQUIRED`);
  for(let i=1;i<manifestEntries.length;i++){
    const previous=manifestEntries[i-1]?.date,current=manifestEntries[i]?.date;
    if(previousMarketSession(current)!==previous)
      return fail('NON_ADJACENT_HISTORY_SESSIONS',{previous,current});
  }
  const points=[];
  for(let i=1;i<manifestEntries.length;i++){
    const result=await prepareFullMarketStaging({approvedSourceRoot,
      manifest:{previous:manifestEntries[i-1],current:manifestEntries[i]},now,readParquet});
    if(!result.prepared)return fail('HISTORY_SOURCE_NOT_VERIFIED',{
      date:manifestEntries[i].date,reason:result.reason??result.status});
    const {body:r}=result,denominator=r.expectedCount;
    points.push({date:r.observationDate,expectedCount:denominator,
      rising:r.counts.rising,falling:r.counts.falling,unchanged:r.counts.unchanged,
      imputedUnchangedCount:r.imputedUnchangedCount,observedComparableCount:r.observedComparableCount,
      sourcePairCoverage:r.sourcePairCoverage,
      risingPct:100*r.counts.rising/denominator,fallingPct:100*r.counts.falling/denominator,
      unchangedPct:100*r.counts.unchanged/denominator});
  }
  return {status:'YEAR_PREVIEW_READY_UNPUBLISHED',prepared:true,
    publicationStage:'PREVIEW_ONLY',phase:'CONFIRMED',source:US_FULL_MARKET_SOURCE,
    universe:US_FULL_MARKET_UNIVERSE,methodologyVersion:US_FULL_MARKET_METHOD,
    sessionCount,firstDate:points[0].date,lastDate:points.at(-1).date,points};
}
