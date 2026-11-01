import test from 'node:test';
import assert from 'node:assert/strict';
import {previousMarketSession} from '../lib/market-score/breadth-b1-r6-marketparquet-provider.mjs';
import {prepareVerifiedPercentHistoryR32} from '../scripts/pc-writer/us-breadth-confirmed-percent-history-publisher-r32.mjs';
import {r33CliOptions,runUsBreadthPercentHistoryR33}
 from '../scripts/pc-writer/us-breadth-confirmed-percent-history-runner-r33.mjs';

const now=Date.parse('2026-11-01T12:30:00Z');
const total=6400;

function verifiedFixture(){
 const dates=['2026-10-30'];
 for(let i=1;i<249;i++)dates.unshift(previousMarketSession(dates[0]));
 const points=dates.map(date=>({date,expectedCount:total,rising:2550,
  falling:3200,unchanged:650,imputedUnchangedCount:200,
  observedComparableCount:6200,sourcePairCoverage:6200/total,
  risingPct:100*2550/total,fallingPct:100*3200/total,
  unchangedPct:100*650/total}));
 return {status:'YEAR_PREVIEW_READY_UNPUBLISHED',prepared:true,
  publicationAllowed:false,publicationStage:'PREVIEW_ONLY',manualReviewRequired:true,
  providerAuthenticityVerified:true,chart:{
   status:'YEAR_PREVIEW_READY_UNPUBLISHED',prepared:true,
   publicationStage:'PREVIEW_ONLY',phase:'CONFIRMED',
   source:'MARKETPARQUET_STOCK_DAILY',universe:'US_MARKETPARQUET_ACTIVE_STOCKS',
   methodologyVersion:'ISSUE_DIRECTION_COUNTS_MISSING_AS_UNCHANGED_R2',
   sessionCount:249,firstDate:dates[0],lastDate:dates.at(-1),points}};
}

test('R33 CLI explicit inspect and three-part approved final-write flags only',()=>{
 const sha='a'.repeat(64);
 assert.deepEqual(r33CliOptions(['--inspect-only']),{mode:'inspect'});
 assert.deepEqual(r33CliOptions(['--publish-approved','--allow-d1-final-write',
  '--approved-sha256',sha]),{mode:'publish',allowD1FinalWrite:true,approvedPreviewSha256:sha});
 for(const args of [[],['--publish-approved'],['--inspect-only','--allow-d1-final-write'],
  ['--publish-approved','--approved-sha256',sha],
  ['--publish-approved','--allow-d1-final-write','--approved-sha256','invalid']])
  assert.equal(r33CliOptions(args),null);
});

test('R33 inspect uses verified 249-session R25 only, emits percentage-series, never D1',async()=>{
 const verified=verifiedFixture();
 let calls=0,d1=0;
 const output=await runUsBreadthPercentHistoryR33({mode:'inspect',now,dataRoot:'E:/ZGmini/data',
  pcHome:'E:/ZGmini/data/pc-writer',preparePreview:async opts=>{
   calls++;
   assert.equal(opts.sessionCount,249);
   assert.equal(opts.dataRoot,'E:/ZGmini/data');
   return verified;
  },loadD1:async()=>{d1++;throw Error('D1 must not be read');}});
 assert.equal(output.status,'R33_PERCENT_HISTORY_PREVIEW_READY_UNPUBLISHED');
 assert.equal(output.d1Writes,0);
 assert.equal(output.coreTaskChanges,0);
 assert.equal(calls,1);
 assert.equal(d1,0);
 assert.equal(output.points.length,249);
 assert.equal(output.evidenceSha256.length,64);
 assert.deepEqual(Object.keys(output.points[0]).sort(),
  ['date','fallingPct','risingPct','unchangedPct']);
 const json=JSON.stringify(output);
 for(const forbidden of ['expectedCount','imputedUnchangedCount',
  'observedComparableCount','sourcePairCoverage','rising','falling','unchanged','counts',
  'close','volume','database','credential','token'])
  assert.equal(json.includes('"'+forbidden+'"'),false,forbidden);
});

test('R33 any absent publication authorization fails before provider calls and D1',async()=>{
 let providerCalls=0,d1Calls=0;
 const options={mode:'publish',now,dataRoot:'E:/ZGmini/data',pcHome:'pc',
  preparePreview:async()=>{providerCalls++;return verifiedFixture();},
  loadD1:async()=>{d1Calls++;return {};}};
 for(const changes of [{},{allowD1FinalWrite:true},
  {approvedPreviewSha256:'a'.repeat(64)}]){
  const result=await runUsBreadthPercentHistoryR33({...options,...changes});
  assert.equal(result.status,'R33_SEPARATE_D1_WRITE_APPROVAL_REQUIRED');
  assert.equal(result.d1Writes,0);
 }
 assert.equal(providerCalls,0);
 assert.equal(d1Calls,0);
});

test('R33 does not open D1 on provider failure, altered values, or approved digest mismatch',async()=>{
 let d1Calls=0;
 const basic={mode:'publish',now,dataRoot:'E:/ZGmini/data',pcHome:'pc',
  allowD1FinalWrite:true,approvedPreviewSha256:'f'.repeat(64),
  loadD1:async()=>{d1Calls++;return {};}};
 const failure=await runUsBreadthPercentHistoryR33({...basic,
  preparePreview:async()=>({...verifiedFixture(),providerAuthenticityVerified:false})});
 assert.equal(failure.status,'R33_PROVIDER_VERIFIED_PREVIEW_UNAVAILABLE');
 const mismatch=await runUsBreadthPercentHistoryR33({...basic,
  preparePreview:async()=>verifiedFixture()});
 assert.equal(mismatch.status,'R33_APPROVED_PREVIEW_SHA_MISMATCH');
 assert.equal(d1Calls,0);
});

test('R33 explicitly approved publication delegates only new percent-history writer',async()=>{
 const source=verifiedFixture();
 const digest=prepareVerifiedPercentHistoryR32(source,{now}).evidenceSha256;
 let d1Loads=0,writes=0;
 const result=await runUsBreadthPercentHistoryR33({mode:'publish',now,
  dataRoot:'E:/ZGmini/data',pcHome:'pc',allowD1FinalWrite:true,
  approvedPreviewSha256:digest,preparePreview:async()=>source,
  loadD1:async()=>{d1Loads++;return {remote:{},database:'test-history-db'};},
  publishHistory:async(remote,db,verified,options)=>{
   writes++;
   assert.equal(db,'test-history-db');
   assert.equal(verified,source);
   assert.equal(options.finalWriteEnabled,true);
   assert.equal(options.approvedPreviewSha256,digest);
   return {status:'VERIFIED_PERCENT_HISTORY_FINAL',d1Writes:1,publicationAllowed:true};
  }});
 assert.equal(d1Loads,1);
 assert.equal(writes,1);
 assert.equal(result.status,'VERIFIED_PERCENT_HISTORY_FINAL');
 assert.equal(result.d1Writes,1);
 assert.equal(JSON.stringify(result).includes('"counts"'),false);
});

test('R33 D1 uncertain outcome is explicitly non-success with no credential output',async()=>{
 const source=verifiedFixture();
 const digest=prepareVerifiedPercentHistoryR32(source,{now}).evidenceSha256;
 const result=await runUsBreadthPercentHistoryR33({mode:'publish',now,
  dataRoot:'E:/ZGmini/data',pcHome:'pc',allowD1FinalWrite:true,
  approvedPreviewSha256:digest,preparePreview:async()=>source,
  loadD1:async()=>({remote:{},database:'private'}),
  publishHistory:async()=>{throw Error('SENSITIVE_DB_TOKEN');}});
 assert.equal(result.status,'R33_D1_RESULT_UNKNOWN_REQUIRES_READBACK');
 assert.equal(result.d1Writes,0);
 assert.equal(JSON.stringify(result).includes('SENSITIVE_DB_TOKEN'),false);
});
