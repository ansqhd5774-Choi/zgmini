// W06 #67 read-only contract probe. Characterizes CURRENT Writer behavior.
// Diagnostic-only: NOT a proposed source/Writer contract or permission to merge.
// Future Writer owner fix must replace the known-bad expectation with fail-closed
// or exact body readback while keeping the lawful idempotent scenario.
import test from 'node:test';
import assert from 'node:assert/strict';
import {publishCompositeObservedArchive} from '../scripts/pc-writer/composite-observed-archive-r1.mjs';
import {COMPOSITE_OBSERVED_VERSION} from '../lib/composite-observed-history-r1.mjs';

const key='composite-observed:2026-11-18';
const stamp=Date.parse('2026-11-18T00:00:48.177Z');
function body(score){
 return JSON.stringify({
  version:COMPOSITE_OBSERVED_VERSION,date:'2026-11-18',
  points:[{calculatedAt:new Date(stamp).toISOString(),score,
   asOfDate:'2026-11-18',signature:'score-'+score}],
 });
}
function fixture({localScore=53,remoteScore=50,remoteStoredAt=stamp,remoteCurrentAt=stamp}={}){
 const row={snapshot_key:key,body:body(localScore),stored_at:stamp};
 const local={prepare(sql){
  assert.match(sql,/^SELECT snapshot_key,body,stored_at FROM market_public_snapshots_v1/);
  return {async all(){return {results:[row]}}};
 }};
 const state={body:body(remoteScore),stored_at:remoteStoredAt};
 const queries=[],requests=[];
 const remote={
  async query(_db,sql,params=[]){
   queries.push({sql,params});
   if(sql.includes("snapshot_key='current'"))return {results:[{stored_at:remoteCurrentAt}]};
   if(sql.includes('SELECT snapshot_key,stored_at'))return {results:[{
    snapshot_key:key,stored_at:state.stored_at,
   }]};
   if(sql.includes('SELECT body,stored_at'))return {results:[{...state}]};
   throw Error('UNEXPECTED_MOCK_SELECT');
  },
  async request(_db,batch){
   requests.push(batch);
   const [target,payload,storedAt]=batch[0].params;
   assert.equal(target,key);
   if(storedAt>state.stored_at){
    state.body=payload;state.stored_at=storedAt;
   }
  },
 };
 return {local,remote,queries,requests,state,row};
}

test('#67 CHARACTERIZATION: equal timestamps with divergent bodies return VERIFIED without remote body SELECT',async()=>{
 const f=fixture({localScore:53,remoteScore:50});
 const receipt=await publishCompositeObservedArchive(f.local,f.remote,'core');
 assert.deepEqual(receipt,{status:'VERIFIED',storedDays:1,publishedDays:0,deferredDays:0});
 assert.equal(JSON.parse(f.row.body).points[0].score,53);
 assert.equal(JSON.parse(f.state.body).points[0].score,50);
 assert.equal(f.row.stored_at,f.state.stored_at);
 assert.equal(f.requests.length,0);
 assert.equal(f.queries.some(q=>q.sql.includes('SELECT body,stored_at')),false);
 assert.notEqual(f.row.body,f.state.body,'VIOLATION: VERIFIED does not imply D1 body equality');
});

test('#67 CONTROL: byte-identical D1 body with identical stored_at is a valid idempotent skip',async()=>{
 const f=fixture({localScore:53,remoteScore:53});
 const receipt=await publishCompositeObservedArchive(f.local,f.remote,'core');
 assert.equal(receipt.status,'VERIFIED');
 assert.equal(receipt.publishedDays,0);
 assert.equal(f.requests.length,0);
 assert.equal(f.row.body,f.state.body);
});

test('#67 CONTROL: genuinely older D1 timestamp triggers CAS publication and exact body readback',async()=>{
 const f=fixture({localScore:53,remoteScore:50,remoteStoredAt:stamp-60000});
 const receipt=await publishCompositeObservedArchive(f.local,f.remote,'core');
 assert.equal(receipt.status,'VERIFIED');
 assert.equal(receipt.publishedDays,1);
 assert.equal(f.requests.length,1);
 assert.ok(f.queries.some(q=>q.sql.includes('SELECT body,stored_at')));
 assert.equal(f.row.body,f.state.body);
 assert.equal(f.row.stored_at,f.state.stored_at);
});
