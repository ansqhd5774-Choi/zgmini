import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {promoteVerifiedFullMarketStaging} from '../scripts/pc-writer/us-breadth-confirmed-final-r22.mjs';
import {US_FULL_MARKET_STAGING_KEY} from '../lib/market-breadth/us-marketparquet-confirmed-public-r2.mjs';
import {US_FULL_MARKET_PUBLIC_KEY,US_FULL_MARKET_PUBLIC_DAILY_PREFIX}
 from '../lib/market-breadth/us-marketparquet-confirmed-reader-r2.mjs';
import {US_BREADTH_CURRENT_KEY,US_BREADTH_DAILY_KEY_PREFIX} from '../lib/market-breadth/us-public-r1.mjs';
import {US_BREADTH_PROVISIONAL_KEY} from '../lib/market-breadth/us-provisional-r1.mjs';

const now=Date.parse('2026-10-30T22:00:00Z'),date='2026-10-30',previous='2026-10-29';
const hash=s=>createHash('sha256').update(s).digest('hex');
const a='a'.repeat(64),b='b'.repeat(64);
const body={version:2,market:'usa',phase:'CONFIRMED',status:'CANDIDATE',publicationStage:'STAGING_ONLY',
  universe:'US_MARKETPARQUET_ACTIVE_STOCKS',source:'MARKETPARQUET_STOCK_DAILY',
  priceMode:'SPLIT_ADJUSTED_DIVIDEND_UNADJUSTED',methodologyVersion:'ISSUE_DIRECTION_COUNTS_MISSING_AS_UNCHANGED_R2',
  calculatedAt:'2026-10-30T21:20:00Z',observationDate:date,previousDate:previous,
  expectedCount:6506,eligibleCount:6506,missingCount:0,coverage:1,
  observedComparableCount:6317,observedUnchangedCount:188,imputedUnchangedCount:189,
  sourcePairCoverage:6317/6506,counts:{rising:1719,falling:4410,unchanged:377},
  sourceEvidence:{verification:'SAVED_PARQUET_MANIFEST_SHA256_READBACK',
    current:{date,sha256:a,bytes:230000,sourceRows:7000},
    previous:{date:previous,sha256:b,bytes:229000,sourceRows:6990}}};

function fixture(){
  const data=new Map([[US_FULL_MARKET_STAGING_KEY,{body:JSON.stringify(body),stored_at:now-30000}]]);
  const writes=[];
  const remote={
    async query(_db,_sql,params){const row=data.get(params[0]);return {results:row?[row]:[]};},
    async request(_db,statements){writes.push(statements);for(const s of statements){
      const [key,newBody,storedAt,oldAt,oldBody]=s.params,old=data.get(key);
      if(!old||(old.stored_at===oldAt&&old.body===oldBody))data.set(key,{body:newBody,stored_at:storedAt});
    }},
  };
  const options={now,approvedStagingBodySha256:hash(JSON.stringify(body)),
    approvedProviderSourceSha256:{current:a,previous:b},finalWriteEnabled:true};
  return {data,writes,remote,options};
}

test('final publication is off by default; explicit independent approval is mandatory',async()=>{
  const f=fixture();
  assert.equal((await promoteVerifiedFullMarketStaging(f.remote,'core')).status,'FULL_MARKET_FINAL_WRITE_DISABLED');
  assert.equal((await promoteVerifiedFullMarketStaging(f.remote,'core',{now,finalWriteEnabled:true})).status,'INDEPENDENT_APPROVAL_REQUIRED');
  assert.equal(f.writes.length,0);
});

test('verified promotion writes only new R2 current and same-day keys with read-back',async()=>{
  const f=fixture();
  const result=await promoteVerifiedFullMarketStaging(f.remote,'core',f.options);
  assert.equal(result.status,'VERIFIED_FULL_MARKET_FINAL');
  assert.equal(result.expectedCount,6506);
  assert.equal(result.imputedUnchangedCount,189);
  assert.deepEqual([...f.data.keys()],[
    US_FULL_MARKET_STAGING_KEY,US_FULL_MARKET_PUBLIC_KEY,US_FULL_MARKET_PUBLIC_DAILY_PREFIX+date]);
  assert.equal(f.writes.length,1);
  const final=JSON.parse(f.data.get(US_FULL_MARKET_PUBLIC_KEY).body);
  assert.equal(final.publicationStage,'PUBLIC_FINAL');
  assert.equal(final.promotionProof.stagingBodySha256,f.options.approvedStagingBodySha256);
  assert.notEqual(US_FULL_MARKET_PUBLIC_KEY,US_BREADTH_CURRENT_KEY);
  assert.notEqual(US_FULL_MARKET_PUBLIC_KEY,US_BREADTH_PROVISIONAL_KEY);
  assert.equal(US_FULL_MARKET_PUBLIC_DAILY_PREFIX.startsWith(US_BREADTH_DAILY_KEY_PREFIX),false);
  assert.equal((await promoteVerifiedFullMarketStaging(f.remote,'core',f.options)).status,'FINAL_ALREADY_PUBLISHED');
  assert.equal(f.writes.length,1);
});

test('staging mismatch, stale sessions and same-day mutation cannot overwrite saved final',async()=>{
  const f=fixture();
  assert.equal((await promoteVerifiedFullMarketStaging(f.remote,'core',{
    ...f.options,approvedStagingBodySha256:'c'.repeat(64)})).status,'STAGING_APPROVAL_SHA_MISMATCH');
  assert.equal((await promoteVerifiedFullMarketStaging(f.remote,'core',{
    ...f.options,now:Date.parse('2026-11-02T22:00:00Z')})).status,'STAGING_NOT_LATEST_COMPLETED_SESSION');
  assert.equal(f.writes.length,0);
  assert.equal((await promoteVerifiedFullMarketStaging(f.remote,'core',f.options)).status,'VERIFIED_FULL_MARKET_FINAL');
  f.data.get(US_FULL_MARKET_STAGING_KEY).body=JSON.stringify({...body,counts:{...body.counts,rising:1720}});
  assert.equal((await promoteVerifiedFullMarketStaging(f.remote,'core',f.options)).status,'STAGING_INVALID_PRESERVED');
  assert.equal(f.writes.length,1);
});
