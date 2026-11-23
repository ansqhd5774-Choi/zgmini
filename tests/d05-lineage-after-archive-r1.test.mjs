import test from 'node:test';
import assert from 'node:assert/strict';
import {COMPOSITE_OBSERVED_VERSION,compositeSampleFromVerified} from '../lib/composite-observed-history-r1.mjs';
import {prepareD05LineageAfterStoredArchive} from '../lib/score-history/d05-lineage-after-archive-r1.mjs';

const now=Date.UTC(2026,10,9,20,42,51);
const names=['macro','credit','supply','fundFlows','bisDsr','bisTc','rates'];
const marketBody={status:'SUCCESS',asOfDate:'2026-11-09',
 overall:{status:'READY',score:47.31578798432822},
 domains:names.concat(['breadth','earnings','inflation','liquidity','volatility'])
  .map((id,i)=>({id,status:'READY',score:21+i,asOfDate:'2026-11-09',methodologyVersion:'R1'}))};
const sample=compositeSampleFromVerified(marketBody,now);
const sources=names.map((sourceKey,i)=>({sourceKey,status:'VERIFIED',
 batchKey:sourceKey+':2026-11-09',storedAt:now-i*1000,
 storedBodySha256:i.toString(16).padStart(64,'0'),selectionWitness:'READER_DIRECT_ID'}));

function fixture(options={}){
 let reads=0;
 const db={prepare(sql){
  assert.equal(sql,'SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?');
  return {bind(key){assert.equal(key,'composite-observed:2026-11-09');return {
   first:async()=>{reads++;return {stored_at:options.storedAt??now,
    body:JSON.stringify({version:COMPOSITE_OBSERVED_VERSION,date:'2026-11-09',points:[sample]})};}};}};
 }};
 const args={db,now,marketBody,
  capture:{calculatedAt:sample.calculatedAt,score:sample.score,asOfDate:sample.asOfDate,
   evidence:{status:'SHADOW_7_BATCHES_ONLY',verifiedCount:7,totalBatches:7,sources}},
  archiveResult:{status:'LOCAL_STORED',date:'2026-11-09',points:1},
  runtimeSourceSha:'a'.repeat(40),approvedSourceSha:'b'.repeat(40),
  recordedAt:new Date(now+200).toISOString()};
 return {args,reads:()=>reads};
}

test('prepares only the exact readback-confirmed local event, with no writes',async()=>{
 const {args,reads}=fixture();
 const result=await prepareD05LineageAfterStoredArchive(args);
 assert.equal(result.status,'PREPARED_LOCAL_ONLY');
 assert.equal(result.eventId,'D05/CM-R1/'+sample.calculatedAt);
 assert.equal(result.inputScope,'SELECTED_7_BATCHES_ONLY');
 assert.equal(result.selectionEvidence,'DIRECT_ID_AND_EXACT_ROW_MATCH');
 assert.equal(result.completeD05InputLineage,false);
 assert.equal(result.publicD1Verified,false);
 assert.equal(result.sources.length,7);
 assert.equal(reads(),1);
});

test('UNCHANGED or failed archive never prepares a new record',async()=>{
 const {args,reads}=fixture();
 const unchanged=await prepareD05LineageAfterStoredArchive({...args,
  archiveResult:{...args.archiveResult,status:'UNCHANGED'}});
 assert.equal(unchanged.code,'ARCHIVE_UNCHANGED_NO_NEW_EVENT');
 const missing=await prepareD05LineageAfterStoredArchive({...args,
  archiveResult:{...args.archiveResult,status:'FAILED'}});
 assert.equal(missing.code,'ARCHIVE_NOT_STORED');
 assert.equal(reads(),0);
});

test('unverified input or wrong stored archive never creates a candidate',async()=>{
 const {args,reads}=fixture();
 const bad=await prepareD05LineageAfterStoredArchive({...args,
  capture:{...args.capture,evidence:{...args.capture.evidence,verifiedCount:6}}});
 assert.equal(bad.code,'SELECTED_INPUTS_UNPROVEN');
 assert.equal(reads(),0);
 const stale=fixture({storedAt:now-1});
 const result=await prepareD05LineageAfterStoredArchive(stale.args);
 assert.equal(result.code,'ARCHIVE_ROW_UNVERIFIED');
 assert.equal(stale.reads(),1);
});

test('unknown source SHA or receipt before calculation remains UNPROVEN',async()=>{
 const {args}=fixture();
 const unknown=await prepareD05LineageAfterStoredArchive({...args,runtimeSourceSha:null});
 assert.equal(unknown.code,'SOURCE_OR_RECORD_TIME_UNVERIFIED');
 const reversed=await prepareD05LineageAfterStoredArchive({...args,
  recordedAt:new Date(now-1).toISOString()});
 assert.equal(reversed.code,'RECORD_TIME_BEFORE_CALCULATION');
});
