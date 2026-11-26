import test from 'node:test';
import assert from 'node:assert/strict';
import {buildPaidUsR2Final,publishPaidUsR2Final}
  from '../scripts/pc-writer/us-breadth-paid-r2-publisher.mjs';
import {readPaidUsR2Feed}
  from '../worker/us-breadth-paid-r2-public.mjs';
import {US_PAID_R2_FEED_KEY}
  from '../worker/us-breadth-paid-r2-contract.mjs';
import {fullPaidUsR2Calculated}
  from './helpers/us-breadth-paid-r2-full-year-fixture.mjs';

const now=Date.parse('2026-11-20T22:01:00.000Z');
const calculated=()=>fullPaidUsR2Calculated();
function memoryD1(){
  const rows=new Map();const log=[];
  const remote={
    request:async(dbId,queries)=>{
      log.push(['write',dbId]);
      assert.equal(queries.length,1);
      const q=queries[0];
      const args=q.params;
      const key=q.sql.startsWith('INSERT')?args[0]:args[2];
      assert.equal(key,US_PAID_R2_FEED_KEY);
      const body=q.sql.startsWith('INSERT')?args[1]:args[0];
      const stored_at=q.sql.startsWith('INSERT')?args[2]:args[1];
      if(rows.has(key))throw Error('unexpected duplicate');
      rows.set(key,{body,stored_at});
      return [{meta:{changes:1}}];
    },
    query:async(dbId,sql,params)=>{
      log.push(['readback',dbId]);
      assert.deepEqual(params,[US_PAID_R2_FEED_KEY]);
      return {results:rows.has(params[0])?[rows.get(params[0])]:[]};
    },
  };
  const db={
    prepare(sql){
      assert.match(sql,/public_feed_snapshots_v1/);
      return {bind(key){
        assert.equal(key,US_PAID_R2_FEED_KEY);
        return {first:async()=>rows.get(key)??null};
      }};
    },
  };
  return {remote,db,log,rows};
}
test('saved paid candidate -> one D1 CAS -> public current/history, never raw',async()=>{
  const {remote,db,log,rows}=memoryD1();
  const record=buildPaidUsR2Final({
    calculated:calculated(),fileSha256:'9'.repeat(64),now,
  });
  const written=await publishPaidUsR2Final({
    remote,dbId:'mock-core',record,now,
  });
  assert.equal(written.status,'US_PAID_R2_D1_CAS_READBACK_VERIFIED');
  assert.equal(written.d1Writes,1);
  assert.equal(log.length,2);
  assert.equal(rows.size,1);
  const current=await readPaidUsR2Feed(db,{now,mode:'current'});
  const history=await readPaidUsR2Feed(db,{now,mode:'history'});
  assert.equal(current.ok,true);
  assert.equal(history.ok,true);
  assert.equal('points' in current.body,false);
  assert.deepEqual(current.body.current,calculated().publicPercentPreview);
  assert.equal(history.body.points.length,250);
  assert.equal(history.body.historyComplete,true);
  assert.deepEqual(history.body.points,calculated().publicHistoryPreview);
  for(const response of [current,history]){
    const body=JSON.stringify(response.body);
    assert.equal(body.includes('sourceFileSha256'),false);
    assert.equal(body.includes('sourceReceipts'),false);
    assert.equal(body.includes('privateCounts'),false);
    assert.equal(body.includes('rawPrices'),false);
    assert.equal(body.includes('plan'),false);
  }
});
test('reader correctly rejects a day that becomes stale without new D1 write',async()=>{
  const {remote,db,log}=memoryD1();
  const record=buildPaidUsR2Final({
    calculated:calculated(),fileSha256:'9'.repeat(64),now,
  });
  await publishPaidUsR2Final({remote,dbId:'mock-core',record,now});
  const later=Date.parse('2026-11-24T02:00:00Z');
  const current=await readPaidUsR2Feed(db,{now:later,mode:'current'});
  const history=await readPaidUsR2Feed(db,{now:later,mode:'history'});
  assert.equal(current.reason,'US_PAID_R2_STALE_OBSERVATION');
  assert.equal(history.ok,true);
  assert.equal(history.body.lastDate,'2026-11-20');
  assert.equal(log.filter(x=>x[0]==='write').length,1);
});
