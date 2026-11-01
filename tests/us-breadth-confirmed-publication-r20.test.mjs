import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {prepareFullMarketStaging,publishFullMarketStaging} from '../scripts/pc-writer/us-breadth-confirmed-staging-r20.mjs';
import {US_FULL_MARKET_STAGING_KEY,validFullMarketStagingRecord} from '../lib/market-breadth/us-marketparquet-confirmed-public-r2.mjs';
import {US_BREADTH_CURRENT_KEY,US_BREADTH_DAILY_KEY_PREFIX} from '../lib/market-breadth/us-public-r1.mjs';
import {US_BREADTH_PROVISIONAL_KEY} from '../lib/market-breadth/us-provisional-r1.mjs';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const pdate='2026-10-29',cdate='2026-10-30';
const barRows=(date,n=6500,falling=false)=>Array.from({length:n},(_,i)=>({
  date,asset_type:'Stock',symbol:'STK'+i,close:falling&&i%2?99:100,volume:1000,
}));

function fixture(t,{currentCount=6500,previousCount=6500,corrupt=false,partial=false}={}){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-r20-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const build=date=>{
  const file=path.join(root,`stock_daily_${date}.parquet`);
  const bytes=Buffer.from(`PAR1:${date}:R20:PAR1`);
  fs.writeFileSync(file,bytes);
  return {date,provider:'MarketParquet',feed:'stock_daily',
   priceMode:'SPLIT_ADJUSTED_DIVIDEND_UNADJUSTED',complete:true,path:file,sha256:sha(bytes),
   rowCount:date===cdate?currentCount:previousCount};
 };
 const manifest={previous:build(pdate),current:build(cdate)};
 if(corrupt)manifest.current.sha256='b'.repeat(64);
 if(partial)manifest.current.complete=false;
 const reader=async bytes=>{
  const day=bytes.toString('utf8').includes(cdate)?cdate:pdate;
  return barRows(day,day===cdate?currentCount:previousCount,day===cdate);
 };
 return {root,manifest,reader};
}

test('SHA-proven full source yields 6500-item STAGING_ONLY aggregate, never raw symbols',async t=>{
 const f=fixture(t);
 const result=await prepareFullMarketStaging({approvedSourceRoot:f.root,manifest:f.manifest,
  now:new Date('2026-10-31T04:00:00Z'),readParquet:f.reader});
 assert.equal(result.prepared,true);
 assert.equal(result.body.expectedCount,6500);
 assert.equal(result.body.eligibleCount,6500);
 assert.equal(result.body.counts.falling,3250);
 assert.equal(result.body.counts.unchanged,3250);
 assert.equal(result.body.publicationStage,'STAGING_ONLY');
 assert.equal(validFullMarketStagingRecord(result.body),true);
 assert.doesNotMatch(JSON.stringify(result),/STK\d+|previousClose|currentClose|members_json/);
 assert.notEqual(US_FULL_MARKET_STAGING_KEY,US_BREADTH_CURRENT_KEY);
 assert.notEqual(US_FULL_MARKET_STAGING_KEY,US_BREADTH_PROVISIONAL_KEY);
 assert.equal(US_FULL_MARKET_STAGING_KEY.startsWith(US_BREADTH_DAILY_KEY_PREFIX),false);
});

test('no source manifest, incomplete source and digest mismatch prevent preparation',async t=>{
 const f=fixture(t);
 assert.equal((await prepareFullMarketStaging({})).prepared,false);
 f.manifest.current.complete=false;
 const incomplete=await prepareFullMarketStaging({approvedSourceRoot:f.root,manifest:f.manifest,readParquet:f.reader});
 assert.equal(incomplete.status,'SAVED_SOURCE_NOT_VERIFIED');
 f.manifest.current.complete=true;f.manifest.current.sha256='b'.repeat(64);
 const mismatch=await prepareFullMarketStaging({approvedSourceRoot:f.root,manifest:f.manifest,readParquet:f.reader});
 assert.equal(mismatch.status,'SAVED_SOURCE_NOT_VERIFIED');
 assert.equal(mismatch.reason,'SAVED_PARQUET_SHA_MISMATCH');
});

test('98% confirmed coverage gates staging; no provisional-style partial publication',async t=>{
 const f=fixture(t,{previousCount:6300});
 const result=await prepareFullMarketStaging({approvedSourceRoot:f.root,manifest:f.manifest,readParquet:f.reader});
 assert.equal(result.prepared,false);
 assert.equal(result.status,'FULL_MARKET_CANDIDATE_NOT_READY');
 assert.equal(result.reason,'INSUFFICIENT_CONFIRMED_COVERAGE');
 assert.equal(result.expectedCount,6500);
 assert.equal(result.eligibleCount,6300);
});

test('path traversal and source outside approved root rejected, without creation',async t=>{
 const f=fixture(t);
 f.manifest.current.path=path.join(os.tmpdir(),'outside_stock_daily_2026-10-30.parquet');
 const before=fs.readdirSync(f.root).sort();
 const result=await prepareFullMarketStaging({approvedSourceRoot:f.root,manifest:f.manifest,readParquet:f.reader});
 assert.equal(result.prepared,false);
 assert.deepEqual(fs.readdirSync(f.root).sort(),before);
});

test('staging publisher disabled by default; opt-in writes exactly one independent key',async t=>{
 const f=fixture(t);
 const prepared=await prepareFullMarketStaging({approvedSourceRoot:f.root,manifest:f.manifest,readParquet:f.reader});
 const data=new Map(),requests=[];
 const remote={
  async query(_db,_sql,params){const row=data.get(params[0]);return {results:row?[row]:[]};},
  async request(_db,statements){requests.push(statements);for(const item of statements){
   const [key,body,storedAt,oldAt,oldBody]=item.params;
   const old=data.get(key);if(!old||(old.stored_at===oldAt&&old.body===oldBody))data.set(key,{body,stored_at:storedAt});
  }},
 };
 assert.equal((await publishFullMarketStaging(remote,'core',prepared)).status,'STAGING_WRITE_DISABLED');
 assert.equal(requests.length,0);
 const result=await publishFullMarketStaging(remote,'core',prepared,{stageWriteEnabled:true,now:Date.now()});
 assert.equal(result.status,'VERIFIED_STAGING_ONLY');
 assert.equal(requests.length,1);
 assert.equal(requests[0].length,1);
 assert.deepEqual([...data.keys()],[US_FULL_MARKET_STAGING_KEY]);
 assert.equal((await publishFullMarketStaging(remote,'core',prepared,{stageWriteEnabled:true})).status,'ALREADY_VERIFIED');
});

test('older, same-day-different and corrupt remote staging states are preserved',async t=>{
 const f=fixture(t);
 const prepared=await prepareFullMarketStaging({approvedSourceRoot:f.root,manifest:f.manifest,readParquet:f.reader});
 const body=prepared.body;
 const now=Date.now();
 const data=new Map([[US_FULL_MARKET_STAGING_KEY,{body:JSON.stringify({...body,observationDate:'2026-10-31'}),stored_at:now-1000}]]);
 let writes=0;
 const remote={query:async()=>({results:[data.get(US_FULL_MARKET_STAGING_KEY)]}),request:async()=>{writes++;}};
 const newer=await publishFullMarketStaging(remote,'core',prepared,{stageWriteEnabled:true,now});
 assert.equal(newer.status,'UNKNOWN_STAGING_RECORD_PRESERVED'); // mutated date breaks proof
 const different={...body,sourceEvidence:{...body.sourceEvidence,current:{...body.sourceEvidence.current,sha256:'c'.repeat(64)}}};
 data.set(US_FULL_MARKET_STAGING_KEY,{body:JSON.stringify(different),stored_at:now-1000});
 assert.equal((await publishFullMarketStaging(remote,'core',prepared,{stageWriteEnabled:true,now})).status,'SAME_DAY_STAGING_PRESERVED');
 data.set(US_FULL_MARKET_STAGING_KEY,{body:'{bad-json',stored_at:now-1000});
 assert.equal((await publishFullMarketStaging(remote,'core',prepared,{stageWriteEnabled:true,now})).status,'UNKNOWN_STAGING_RECORD_PRESERVED');
 assert.equal(writes,0);
});
