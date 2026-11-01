import test from 'node:test';
import assert from 'node:assert/strict';
import {readProjectionCheckpoint,readProjectionCheckpoints} from '../worker/projection-checkpoint-r52.mjs';

function db(row,calls,label){
 return {prepare(sql){calls.push({label,sql});return {bind(){return this},async first(){return row}}}};
}

test('non-KFG projection checkpoint reads CORE only',async()=>{
 const calls=[];
 const env={DB_CORE:db({stored_at:123},calls,'core'),DB_HISTORY:db({date:'20261003',calculated_at:'2026-10-03T00:00:00Z'},calls,'history')};
 const out=await readProjectionCheckpoint(env,'creditRisk');
 assert.deepEqual(out,{sourceVersion:'core:123',sourceStoredAt:123});
 assert.deepEqual(calls.map(x=>x.label),['core']);
});

test('inflation checkpoint carries mini chart and score comparison build version',async()=>{
 const calls=[];
 const env={DB_CORE:db({stored_at:123},calls,'core'),DB_HISTORY:db({date:'20261003',calculated_at:'2026-10-03T00:00:00Z'},calls,'history')};
 const out=await readProjectionCheckpoint(env,'inflation');
 assert.deepEqual(out,{sourceVersion:'core:123:inflation-indicator-table-r2-mini-chart-1y-score-comparisons-r1',sourceStoredAt:123});
 assert.deepEqual(calls.map(x=>x.label),['core']);
});

test('earnings checkpoint carries E1-R5 detail build version',async()=>{
 const calls=[];
 const env={DB_CORE:db({stored_at:123},calls,'core'),DB_HISTORY:db({date:'20261003',calculated_at:'2026-10-03T00:00:00Z'},calls,'history')};
 const out=await readProjectionCheckpoint(env,'earningsRecession');
 assert.deepEqual(out,{sourceVersion:'core:123:earnings-e1-r5-detail-r1',sourceStoredAt:123});
 assert.deepEqual(calls.map(x=>x.label),['core']);
});

test('KFG projection checkpoint reads HISTORY only',async()=>{
 const calls=[];
 const env={DB_CORE:db({stored_at:123},calls,'core'),DB_HISTORY:db({date:'20261003',calculated_at:'2026-10-03T00:00:00Z'},calls,'history')};
 const out=await readProjectionCheckpoint(env,'koreaFearGreed');
 assert.match(out.sourceVersion,/^kfg:20261003:/);
 assert.deepEqual(calls.map(x=>x.label),['history']);
});

test('batch checkpoint reads each needed shard once and versions selected builders',async()=>{
 const calls=[];
 const env={DB_CORE:db({stored_at:123},calls,'core'),DB_HISTORY:db({date:'20261003',calculated_at:'2026-10-03T00:00:00Z'},calls,'history')};
 const out=await readProjectionCheckpoints(env,['inflation','recession','earningsRecession','koreaFearGreed']);
 assert.equal(out.inflation.sourceVersion,'core:123:inflation-indicator-table-r2-mini-chart-1y-score-comparisons-r1');
 assert.equal(out.recession.sourceVersion,'core:123');
 assert.equal(out.earningsRecession.sourceVersion,'core:123:earnings-e1-r5-detail-r1');
 assert.match(out.koreaFearGreed.sourceVersion,/^kfg:/);
 assert.deepEqual(calls.map(x=>x.label).sort(),['core','history']);
});
