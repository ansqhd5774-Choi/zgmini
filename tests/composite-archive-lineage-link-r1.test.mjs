import test from 'node:test';
import assert from 'node:assert/strict';
import {COMPOSITE_OBSERVED_VERSION,compositeSampleFromVerified} from '../lib/composite-observed-history-r1.mjs';
import {linkMarketInputEvidenceToStoredArchive} from '../lib/score-history/composite-archive-lineage-link-r1.mjs';

const now=Date.UTC(2026,10,9,20,42,51);
const keys=['macro','credit','supply','fundFlows','bisDsr','bisTc','rates'];
const marketBody={status:'SUCCESS',asOfDate:'2026-11-09',
 overall:{status:'READY',score:47.31578798432822},
 domains:keys.concat(['breadth','earnings','inflation','liquidity','volatility']).map((key,i)=>({
  id:key,status:'READY',score:i+21,asOfDate:'2026-11-09',methodologyVersion:'R1'}))};
const sample=compositeSampleFromVerified(marketBody,now);
const selected=keys.map((key,i)=>({sourceKey:key,status:'VERIFIED',
 batchKey:key+':2026-11-09',storedAt:now-i*1000,storedBodySha256:i.toString(16).padStart(64,'0')}));

function fixture({event={},sources=selected,archiveResult={},archive={},row={},readError=null}={}){
 const capture={calculatedAt:sample.calculatedAt,score:sample.score,asOfDate:sample.asOfDate,
  evidence:{status:'SHADOW_7_BATCHES_ONLY',verifiedCount:sources.filter(s=>s.status==='VERIFIED').length,
   totalBatches:7,sources},...event};
 const stored={version:COMPOSITE_OBSERVED_VERSION,date:'2026-11-09',points:[sample],...archive};
 const storedRow={stored_at:now,body:JSON.stringify(stored),...row};
 const statements=[];
 const db={prepare(sql){statements.push(sql);assert.equal(sql,
  'SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?');
  return {bind(key){assert.equal(key,'composite-observed:2026-11-09');return {
   async first(){if(readError)throw Error(readError);return storedRow;}};}};
 }};
 const archiveStatus={status:'LOCAL_STORED',date:'2026-11-09',points:1,...archiveResult};
 const read=(overrides={})=>linkMarketInputEvidenceToStoredArchive({db,now,marketBody,capture,
  archiveResult:archiveStatus,...overrides});
 return {read,db,statements,capture,archiveStatus};
}

test('joins only a readback-confirmed exact local calculation event',async()=>{
 const {read,statements}=fixture();
 const result=await read();
 assert.equal(result.status,'LINKED_SELECTED_7_BATCHES_ONLY');
 assert.equal(result.calculatedAt,sample.calculatedAt);
 assert.equal(result.asOfDate,sample.asOfDate);
 assert.equal(result.score,sample.score);
 assert.equal(result.archiveStoredAt,now);
 assert.equal(result.outputSignature,sample.signature);
 assert.equal(result.sources.length,7);
 assert.ok(result.sources.every(x=>x.selectionWitness==='POST_SELECTION_MATCH_ONLY'));
 assert.equal(result.effectiveUseVerified,false);
 assert.equal(result.completeD05InputLineage,false);
 assert.equal(result.publicD1Verified,false);
 assert.equal(statements.length,1);
 assert.equal(JSON.stringify(result).includes('domains'),false);
});

test('unchanged archive never creates a synthetic new calculated event',async()=>{
 const {read,statements}=fixture({archiveResult:{status:'UNCHANGED'}});
 assert.deepEqual(await read(),{status:'UNPROVEN',code:'ARCHIVE_UNCHANGED_NO_NEW_EVENT'});
 assert.equal(statements.length,0);
});

test('failed or absent archive is not counted as stored',async()=>{
 const {read,statements}=fixture({archiveResult:{status:'PENDING'}});
 assert.equal((await read()).code,'ARCHIVE_NOT_STORED');
 assert.equal(statements.length,0);
});

test('invalid score is rejected without a local archive query',async()=>{
 const {read,statements}=fixture();
 assert.equal((await read({marketBody:{...marketBody,overall:{status:'UNAVAILABLE',score:null}}})).code,'SCORE_EVENT_UNVERIFIED');
 assert.equal(statements.length,0);
});

test('a capture from another calculation timestamp never links',async()=>{
 const {read,statements}=fixture({event:{calculatedAt:new Date(now+1000).toISOString()}});
 assert.equal((await read()).code,'CALCULATION_CAPTURE_MISMATCH');
 assert.equal(statements.length,0);
});

test('one unproven selected batch cannot masquerade as seven verified',async()=>{
 const sources=selected.map((item,i)=>i===2?{sourceKey:item.sourceKey,status:'UNPROVEN',code:'MISSING'}:item);
 const {read,statements}=fixture({sources});
 assert.equal((await read()).code,'SELECTED_INPUTS_UNPROVEN');
 assert.equal(statements.length,0);
});

test('invalid digest, foreign prefix, and duplicate source each fail closed',async()=>{
 for(const change of [{storedBodySha256:'NOT_SHA256'},{batchKey:'credit:wrong'},{sourceKey:'credit'}]){
  const sources=selected.map((item,i)=>i===0?{...item,...change}:item);
  const {read,statements}=fixture({sources});
  assert.equal((await read()).code,'SELECTED_INPUTS_UNPROVEN');
  assert.equal(statements.length,0);
 }
});

test('archive date or reported points mismatch cannot be linked',async()=>{
 const wrongDate=fixture({archiveResult:{date:'2026-11-08'}});
 assert.equal((await wrongDate.read()).code,'ARCHIVE_EVENT_MISMATCH');
 assert.equal(wrongDate.statements.length,0);
 const wrongCount=fixture({archiveResult:{points:2}});
 assert.equal((await wrongCount.read()).code,'ARCHIVE_ROW_UNVERIFIED');
 assert.equal(wrongCount.statements.length,1);
});

test('stale archive stored_at cannot attest to the new calculation',async()=>{
 const {read}=fixture({row:{stored_at:now-1000}});
 assert.equal((await read()).code,'ARCHIVE_ROW_UNVERIFIED');
});

test('changed output signature or duplicate event time is rejected',async()=>{
 for(const points of [[{...sample,signature:'bad'}],[sample,{...sample}]]){
  const {read}=fixture({archive:{points},archiveResult:{points:points.length}});
  assert.equal((await read()).code,'ARCHIVE_SAMPLE_MISMATCH');
 }
});

test('malformed archive and unsupported version fail without raw error details',async()=>{
 const badJson=fixture({row:{body:'{not json'}});
 assert.equal((await badJson.read()).code,'ARCHIVE_ROW_UNVERIFIED');
 const wrongVersion=fixture({archive:{version:'OLDER_VERSION'}});
 assert.equal((await wrongVersion.read()).code,'ARCHIVE_ROW_UNVERIFIED');
});

test('read errors and missing DB reader are safe, never retried or written',async()=>{
 const {read,statements}=fixture({readError:'SECRET_PATH_IN_SQL_ERROR'});
 assert.deepEqual(await read(),{status:'UNPROVEN',code:'ARCHIVE_READ_FAILED'});
 assert.equal(statements.length,1);
 const {read:read2}=fixture();
 assert.equal((await read2({db:null})).code,'ARCHIVE_READER_UNAVAILABLE');
});
