import test from 'node:test';
import assert from 'node:assert/strict';
import {projectionWriter} from '../worker/projection-runtime-r52.mjs';

test('projection writer performs one conditional upsert without a pre-read',async()=>{
  const sqls=[];
  const core={prepare(sql){
    sqls.push(sql);
    return {bind(...args){
      assert.equal(args[0],'detail:recession:v1');
      return {async run(){return {meta:{changes:1}}}};
    }};
  }};
  const writer=projectionWriter(core);
  const result=await writer.write('recession',{status:'READY',score:50},1000,{sourceStoredAt:900,sourceVersion:'v1'});
  assert.equal(sqls.length,1);
  assert.match(sqls[0],/^INSERT INTO market_public_snapshots_v1/);
  assert.equal(result.key,'detail:recession:v1');
});

test('projection writer rejects superseded conditional upsert',async()=>{
  const core={prepare(){return {bind(){return {async run(){return {meta:{changes:0}}}}}}}};
  const writer=projectionWriter(core);
  await assert.rejects(()=>writer.write('recession',{status:'READY'},1000,{sourceStoredAt:900,sourceVersion:'v1'}),/SUPERSEDED_PROJECTION_JOB/);
});
