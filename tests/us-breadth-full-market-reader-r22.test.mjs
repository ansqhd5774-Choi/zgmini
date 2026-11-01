import test from 'node:test';
import assert from 'node:assert/strict';
import {US_FULL_MARKET_STAGING_KEY} from '../lib/market-breadth/us-marketparquet-confirmed-public-r2.mjs';
import {US_BREADTH_CURRENT_KEY,US_BREADTH_DAILY_KEY_PREFIX} from '../lib/market-breadth/us-public-r1.mjs';
import {US_BREADTH_PROVISIONAL_KEY} from '../lib/market-breadth/us-provisional-r1.mjs';
import {US_FULL_MARKET_PUBLIC_KEY,US_FULL_MARKET_PUBLIC_DAILY_PREFIX,
  validFullMarketPublicRecord,readFullMarketPublicCurrent}
  from '../lib/market-breadth/us-marketparquet-confirmed-reader-r2.mjs';

const date='2026-10-30',prior='2026-10-29',now=Date.parse('2026-10-30T22:00:00Z');
const sha=a=>a.repeat(64);
const candidate={version:2,phase:'CONFIRMED',status:'CANDIDATE',publicationStage:'STAGING_ONLY',
  market:'usa',universe:'US_MARKETPARQUET_ACTIVE_STOCKS',source:'MARKETPARQUET_STOCK_DAILY',
  priceMode:'SPLIT_ADJUSTED_DIVIDEND_UNADJUSTED',
  methodologyVersion:'ISSUE_DIRECTION_COUNTS_MISSING_AS_UNCHANGED_R2',
  observationDate:date,previousDate:prior,calculatedAt:'2026-10-30T21:25:00Z',
  expectedCount:6506,eligibleCount:6506,missingCount:0,
  observedComparableCount:6317,observedUnchangedCount:188,imputedUnchangedCount:189,
  sourcePairCoverage:6317/6506,coverage:1,
  counts:{rising:1719,falling:4410,unchanged:377},
  sourceEvidence:{verification:'SAVED_PARQUET_MANIFEST_SHA256_READBACK',
    current:{date,sha256:sha('a'),bytes:232000,sourceRows:7020},
    previous:{date:prior,sha256:sha('b'),bytes:231500,sourceRows:7022}},
};
const final={...candidate,status:'READY',publicationStage:'PUBLIC_FINAL',
  finalizedAt:'2026-10-30T21:40:00Z',
  promotionProof:{stagingKey:US_FULL_MARKET_STAGING_KEY,
    stagingBodySha256:sha('c'),verifiedAt:'2026-10-30T21:35:00Z'}};

test('public full-market reader has keys isolated from 503 R1, IEX and staging',()=>{
  assert.notEqual(US_FULL_MARKET_PUBLIC_KEY,US_FULL_MARKET_STAGING_KEY);
  assert.notEqual(US_FULL_MARKET_PUBLIC_KEY,US_BREADTH_CURRENT_KEY);
  assert.notEqual(US_FULL_MARKET_PUBLIC_KEY,US_BREADTH_PROVISIONAL_KEY);
  assert.equal(US_FULL_MARKET_PUBLIC_KEY.startsWith(US_BREADTH_DAILY_KEY_PREFIX),false);
  assert.equal(US_FULL_MARKET_PUBLIC_DAILY_PREFIX.startsWith(US_BREADTH_DAILY_KEY_PREFIX),false);
});

test('staging candidate never passes as final; approved final can expose 6506 counts',async()=>{
  assert.equal(validFullMarketPublicRecord(candidate),false);
  assert.equal(validFullMarketPublicRecord(final),true);
  const queried=[];
  const selected=await readFullMarketPublicCurrent(async key=>{queried.push(key);
    return {body:JSON.stringify(final),stored_at:now-15_000};},{now});
  assert.equal(selected.ok,true);
  assert.equal(selected.httpStatus,200);
  assert.equal(selected.body.expectedCount,6506);
  assert.equal(selected.body.imputedUnchangedCount,189);
  assert.deepEqual(queried,[US_FULL_MARKET_PUBLIC_KEY]);
});

test('no final row, staging in final key, future timestamp, stale day fail closed',async()=>{
  const absent=await readFullMarketPublicCurrent(async()=>null,{now});
  assert.equal(absent.reason,'FULL_MARKET_NOT_PUBLISHED');
  const stage=await readFullMarketPublicCurrent(async()=>({body:JSON.stringify(candidate),stored_at:now-1000}),{now});
  assert.equal(stage.reason,'FULL_MARKET_NOT_VERIFIED_FINAL');
  const future=await readFullMarketPublicCurrent(async()=>({body:JSON.stringify(final),stored_at:now+300_000}),{now});
  assert.equal(future.reason,'FULL_MARKET_INVALID_PUBLICATION_TIME');
  const stale=await readFullMarketPublicCurrent(async()=>({body:JSON.stringify(final),stored_at:now-1000}),
    {now:Date.parse('2026-11-02T23:00:00Z')});
  assert.equal(stale.reason,'FULL_MARKET_STALE_OBSERVATION');
});

test('tampered provenance and missing-as-flat counts cannot masquerade as final',()=>{
  assert.equal(validFullMarketPublicRecord({...final,imputedUnchangedCount:0}),false);
  assert.equal(validFullMarketPublicRecord({...final,promotionProof:{...final.promotionProof,stagingKey:US_BREADTH_CURRENT_KEY}}),false);
  assert.equal(validFullMarketPublicRecord({...final,counts:{...final.counts,rising:1720}}),false);
  assert.equal(validFullMarketPublicRecord({...final,sourceEvidence:{...final.sourceEvidence,current:{...final.sourceEvidence.current,sha256:'wrong'}}}),false);
});
