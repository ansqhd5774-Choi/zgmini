/** R20 staging-only contract. Distinct from legacy 503/SP500 confirmed and IEX. */
export const US_FULL_MARKET_STAGING_KEY='public:market-breadth-confirmed-r2:usa:staging';
export const US_FULL_MARKET_SOURCE='MARKETPARQUET_STOCK_DAILY';
export const US_FULL_MARKET_UNIVERSE='US_MARKETPARQUET_ACTIVE_STOCKS';
export const US_FULL_MARKET_PRICE_MODE='SPLIT_ADJUSTED_DIVIDEND_UNADJUSTED';
export const US_FULL_MARKET_METHOD='ISSUE_DIRECTION_COUNTS_MISSING_AS_UNCHANGED_R2';

const date=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)
  && !Number.isNaN(Date.parse(value+'T00:00:00Z'))
  && new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
const count=n=>Number.isSafeInteger(n)&&n>=0;
const sha=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);

export function validFullMarketStagingRecord(r){
  if(!r||r.version!==2||r.market!=='usa'||r.phase!=='CONFIRMED'
    ||r.status!=='CANDIDATE'||r.publicationStage!=='STAGING_ONLY'
    ||r.universe!==US_FULL_MARKET_UNIVERSE||r.source!==US_FULL_MARKET_SOURCE
    ||r.priceMode!==US_FULL_MARKET_PRICE_MODE||r.methodologyVersion!==US_FULL_MARKET_METHOD
    ||!date(r.observationDate)||!date(r.previousDate)||r.previousDate>=r.observationDate
    ||!Number.isFinite(Date.parse(r.calculatedAt))||typeof r.calculatedAt!=='string'
    ||!count(r.expectedCount)||r.expectedCount===0||!count(r.eligibleCount)
    ||r.eligibleCount!==r.expectedCount||r.missingCount!==0
    ||!count(r.imputedUnchangedCount)||!count(r.observedComparableCount)
    ||!count(r.observedUnchangedCount)
    ||r.observedComparableCount+r.imputedUnchangedCount!==r.expectedCount
    ||r.observedUnchangedCount+r.imputedUnchangedCount!==r.counts?.unchanged
    ||!Number.isFinite(r.sourcePairCoverage)||r.sourcePairCoverage<0||r.sourcePairCoverage>1
    ||Math.abs(r.sourcePairCoverage-r.observedComparableCount/r.expectedCount)>1e-9
    ||r.coverage!==1
    ||Math.abs(r.coverage-r.eligibleCount/r.expectedCount)>1e-9
    ||!r.counts||Object.keys(r.counts).sort().join(',')!=='falling,rising,unchanged'
    ||!count(r.counts.rising)||!count(r.counts.unchanged)||!count(r.counts.falling)
    ||r.counts.rising+r.counts.unchanged+r.counts.falling!==r.eligibleCount
    ||!r.sourceEvidence||r.sourceEvidence.verification!=='SAVED_PARQUET_MANIFEST_SHA256_READBACK')return false;
  const {current,previous}=r.sourceEvidence;
  if(!current||!previous||current.date!==r.observationDate||previous.date!==r.previousDate
    ||!sha(current.sha256)||!sha(previous.sha256)||current.sha256===previous.sha256
    ||!count(current.bytes)||current.bytes===0||!count(previous.bytes)||previous.bytes===0
    ||!count(current.sourceRows)||current.sourceRows===0
    ||!count(previous.sourceRows)||previous.sourceRows===0)return false;
  return true;
}
