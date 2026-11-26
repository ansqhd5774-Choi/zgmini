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
export function validFullMarketPublicRecord(){return false;}

/** R32 public-display projection: no constituent totals or count metadata. */
export function fullMarketPublicPercentOnly(record){
  if(!validFullMarketPublicRecord(record))return null;
  const total=record.expectedCount;
  return {
    market:'usa',phase:'CONFIRMED',status:'READY',publicationStage:'PUBLIC_FINAL',
    source:record.source,universe:record.universe,
    methodologyVersion:record.methodologyVersion,
    observationDate:record.observationDate,previousDate:record.previousDate,
    risingPct:record.counts.rising/total*100,
    fallingPct:record.counts.falling/total*100,
    unchangedPct:record.counts.unchanged/total*100,
  };
}

/** No route integration yet. Invoked ONLY after independent final writer Gate. */
export async function readFullMarketPublicCurrent(){return {ok:false,httpStatus:503,reason:'PROVIDER_REMOVED_MARKETPARQUET_PUBLICATION_DENIED'};}
