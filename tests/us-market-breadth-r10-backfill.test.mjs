import test from 'node:test';
import assert from 'node:assert/strict';
import {publishDatedBreadthOnly} from '../tools/us-market-breadth-r1/history-backfill-r10-core.mjs';
import {validUsBreadthRecord,US_BREADTH_DAILY_KEY_PREFIX,US_BREADTH_CURRENT_KEY,US_BREADTH_SOURCE}
  from '../lib/market-breadth/us-public-r1.mjs';

const now=Date.parse('2026-10-31T06:00:00Z');
function record(date,up=250){
  return {version:1,universe:'SP500',source:US_BREADTH_SOURCE,
    calculatedAt:new Date(now).toISOString(),market:'usa',
    methodologyVersion:'ISSUE_DIRECTION_COUNTS_R1',observationDate:date,
    status:'READY',expectedCount:500,eligibleCount:500,invalidCount:0,coverage:1,
    counts:{rising:up,unchanged:0,falling:500-up}};
}
function mockRemote({failWrite=()=>false}={}){
  const data=new Map();const writes=[];
  return {
    data,writes,
    async query(_database,sql,params){
      assert.match(sql,/SELECT snapshot_key,body,stored_at/);
      assert.match(sql,/ WHERE snapshot_key IN/);
      return {results:params.map(key=>data.get(key)).filter(Boolean)};
    },
    async request(_database,batch){
      for(const [i,{sql,params}] of batch.entries()){
        assert.match(sql,/ON CONFLICT\(snapshot_key\) DO NOTHING/);
        const [key,body,storedAt]=params;
        assert.ok(key.startsWith(US_BREADTH_DAILY_KEY_PREFIX));
        assert.notEqual(key,US_BREADTH_CURRENT_KEY);
        writes.push(key);
        if(!data.has(key))data.set(key,{snapshot_key:key,body,stored_at:storedAt});
        if(failWrite(i,key))throw Error('SIMULATED_TRANSPORT_FAILURE');
      }
      return [];
    },
  };
}

test('R10 publishes dated keys only, validates readback, and reruns without rewrites',async()=>{
  const remote=mockRemote();
  const current={snapshot_key:US_BREADTH_CURRENT_KEY,body:JSON.stringify(record('2026-10-30',226)),stored_at:now-1000};
  remote.data.set(US_BREADTH_CURRENT_KEY,current);
  const rows=[record('2026-10-28'),record('2026-10-29',300),record('2026-10-30',226)];
  const first=await publishDatedBreadthOnly(remote,'database',rows,{validRecord:validUsBreadthRecord,now,batchSize:2});
  assert.deepEqual(first,{status:'VERIFIED',expected:3,already:0,published:3,verified:3});
  assert.deepEqual(remote.data.get(US_BREADTH_CURRENT_KEY),current);
  const second=await publishDatedBreadthOnly(remote,'database',rows,{validRecord:validUsBreadthRecord,now,batchSize:2});
  assert.deepEqual(second,{status:'VERIFIED',expected:3,already:3,published:0,verified:3});
  assert.equal(remote.writes.length,3);
});

test('R10 detects an existing conflicting date before writing another date',async()=>{
  const remote=mockRemote();
  const conflicting=record('2026-10-30',400);
  const key=US_BREADTH_DAILY_KEY_PREFIX+'2026-10-30';
  remote.data.set(key,{snapshot_key:key,body:JSON.stringify(conflicting),stored_at:now-1000});
  await assert.rejects(()=>publishDatedBreadthOnly(remote,'database',[
    record('2026-10-28'),record('2026-10-30',226)],
    {validRecord:validUsBreadthRecord,now,batchSize:1}),/REMOTE_DAILY_CONFLICT/);
  assert.equal(remote.writes.length,0);
});

test('R10 stops on ambiguous partial write and can resume safely',async()=>{
  let crash=true;
  const remote=mockRemote({failWrite:i=>crash&&i===0});
  const rows=[record('2026-10-28'),record('2026-10-29')];
  await assert.rejects(()=>publishDatedBreadthOnly(remote,'database',rows,
    {validRecord:validUsBreadthRecord,now}),/D1_WRITE_OUTCOME_UNKNOWN/);
  assert.equal(remote.data.size,1);
  crash=false;
  const resumed=await publishDatedBreadthOnly(remote,'database',rows,{validRecord:validUsBreadthRecord,now});
  assert.deepEqual(resumed,{status:'VERIFIED',expected:2,already:1,published:1,verified:2});
});

test('R10 treats a transport failure with complete readback as verified',async()=>{
  const remote=mockRemote({failWrite:()=>true});
  const result=await publishDatedBreadthOnly(remote,'database',[record('2026-10-28')],
    {validRecord:validUsBreadthRecord,now});
  assert.equal(result.verified,1);
});

test('R10 rejects invalid daily records and duplicate dates before publication',async()=>{
  const remote=mockRemote();
  await assert.rejects(()=>publishDatedBreadthOnly(remote,'database',[record('2026-10-28'),record('2026-10-28')],
    {validRecord:validUsBreadthRecord,now}),/INVALID_OR_DUPLICATE/);
  assert.equal(remote.writes.length,0);
});
