/**
 * Deterministic, synthetic FULL-YEAR fixtures for offline public contract tests.
 * Test-only rows/hashes: never provider observations, production prices or D1.
 */
import {previousMarketSession}
  from '../../lib/market-score/breadth-b1-r6-marketparquet-provider.mjs';
import {US_PAID_R2_VERSION,US_PAID_R2_SOURCE,US_PAID_R2_UNIVERSE,
  US_PAID_R2_PRICE_MODE,US_PAID_R2_METHOD}
  from '../../worker/us-breadth-paid-r2-contract.mjs';

export function fullPaidUsR2Sessions(lastDate='2026-11-20'){
  const dates=[lastDate];
  while(dates.length<251){
    const previous=previousMarketSession(dates[0]);
    if(!previous)throw Error('R2_TEST_SESSION_CALENDAR_UNAVAILABLE');
    dates.unshift(previous);
  }
  return dates;
}

export function fullPaidUsR2Calculated({lastDate='2026-11-20'}={}){
  const dates=fullPaidUsR2Sessions(lastDate);
  const points=dates.slice(1).map((date,i)=>({
    date,risingPct:i===249?50:25,
    unchangedPct:i===249?25:50,fallingPct:25,
  }));
  const privateSourceReceipts=dates.map((date,i)=>({
    date,sha256:(i+1).toString(16).padStart(64,'0'),
    projectionSha256:(i+1000).toString(16).padStart(64,'0'),
  }));
  return {
    status:'PAID_R2_STORED_PRIVATE_CALCULATED',prepared:true,
    source:US_PAID_R2_SOURCE,priceMode:US_PAID_R2_PRICE_MODE,
    publicationAllowed:false,comparedSessions:250,fullYearHistory:true,
    firstDate:points[0].date,lastDate,
    sourceLatestProviderDateVerified:false,
    publicHistoryPreview:points,publicPercentPreview:points.at(-1),
    privateSourceReceipts,
  };
}

export function fullPaidUsR2Record({lastDate='2026-11-20',
  finalizedAt='2026-11-20T22:00:00.000Z'}={}){
  const calculated=fullPaidUsR2Calculated({lastDate});
  return {
    version:US_PAID_R2_VERSION,status:'READY',market:'usa',
    phase:'CONFIRMED',publicationStage:'PUBLIC_FINAL',plan:'full',
    source:US_PAID_R2_SOURCE,universe:US_PAID_R2_UNIVERSE,
    priceMode:US_PAID_R2_PRICE_MODE,methodologyVersion:US_PAID_R2_METHOD,
    finalizedAt,sourceFileSha256:'a'.repeat(64),
    firstDate:calculated.firstDate,lastDate,
    observationDate:lastDate,historyComplete:true,
    points:calculated.publicHistoryPreview,
  };
}
