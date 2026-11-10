import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,access,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {COMPOSITE_OBSERVED_VERSION,compositeSampleFromVerified} from '../lib/composite-observed-history-r1.mjs';
import {recordD05LineageFromStoredArchive} from '../lib/score-history/d05-lineage-local-record-r1.mjs';

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

async function fixture(t){
 const dir=await mkdtemp(join(tmpdir(),'zgmini-d05-local-record-'));
 t.after(()=>rm(dir,{recursive:true,force:true}));
 const ledgerPath=join(dir,'d05-composite-events.jsonl');
 let queries=0;
 const db={prepare(sql){
  assert.equal(sql,'SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?');
  return {bind(key){assert.equal(key,'composite-observed:2026-11-09');return {first:async()=>{
   queries++;return {stored_at:now,
    body:JSON.stringify({version:COMPOSITE_OBSERVED_VERSION,date:'2026-11-09',points:[sample]})};
  }};}};
 }};
 const args={db,now,marketBody,
  capture:{calculatedAt:sample.calculatedAt,score:sample.score,asOfDate:sample.asOfDate,
   evidence:{status:'SHADOW_7_BATCHES_ONLY',verifiedCount:7,totalBatches:7,sources}},
  archiveResult:{status:'LOCAL_STORED',date:'2026-11-09',points:1},
  runtimeSourceSha:'a'.repeat(40),approvedSourceSha:'b'.repeat(40),
  recordedAt:new Date(now+1000).toISOString(),ledgerPath,
  exclusiveWriter:{ownerId:'fixture-writer',assertExclusive:()=>true}};
 return {args,ledgerPath,queries:()=>queries};
}
async function absent(path){try{await access(path);return false;}catch(e){return e?.code==='ENOENT';}}

test('one local saved event produces exactly one verified private JSONL entry',async t=>{
 const f=await fixture(t);
 const first=await recordD05LineageFromStoredArchive(f.args);
 assert.equal(first.status,'APPENDED_VERIFIED_LOCAL_ONLY');
 assert.equal(first.eventCount,1);
 const text=await readFile(f.ledgerPath,'utf8');
 const event=JSON.parse(text.trim());
 assert.equal(event.completeD05InputLineage,false);
 assert.equal(event.publicD1Verified,false);
 assert.equal(event.sources.length,7);
 const again=await recordD05LineageFromStoredArchive({...f.args,
  recordedAt:new Date(now+2000).toISOString()});
 assert.equal(again.status,'NOOP_SAME_EVENT');
 assert.equal(await readFile(f.ledgerPath,'utf8'),text);
 assert.equal(f.queries(),2);
});

test('unchanged archive does not query DB or create a ledger',async t=>{
 const f=await fixture(t);
 const r=await recordD05LineageFromStoredArchive({...f.args,
  archiveResult:{...f.args.archiveResult,status:'UNCHANGED'}});
 assert.equal(r.code,'ARCHIVE_UNCHANGED_NO_NEW_EVENT');
 assert.equal(f.queries(),0);
 assert.equal(await absent(f.ledgerPath),true);
});

test('unknown runtime SHA and missing Writer lease both prevent recording',async t=>{
 const f=await fixture(t);
 const unproven=await recordD05LineageFromStoredArchive({...f.args,
  runtimeSourceSha:null});
 assert.equal(unproven.code,'SOURCE_OR_RECORD_TIME_UNVERIFIED');
 const noLease=await recordD05LineageFromStoredArchive({...f.args,
  exclusiveWriter:undefined});
 assert.equal(noLease.code,'LINEAGE_WRITER_LEASE_REQUIRED');
 assert.equal(await absent(f.ledgerPath),true);
});

test('same event with conflicting evidence preserves first stored receipt',async t=>{
 const f=await fixture(t);
 assert.equal((await recordD05LineageFromStoredArchive(f.args)).status,'APPENDED_VERIFIED_LOCAL_ONLY');
 const before=await readFile(f.ledgerPath,'utf8');
 const conflicting=await recordD05LineageFromStoredArchive({...f.args,
  approvedSourceSha:'c'.repeat(40)});
 assert.equal(conflicting.code,'EVENT_ID_CONFLICT');
 assert.equal(await readFile(f.ledgerPath,'utf8'),before);
});
