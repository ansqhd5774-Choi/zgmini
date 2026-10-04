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

test('KFG projection checkpoint reads HISTORY only',async()=>{
 const calls=[];
 const env={DB_CORE:db({stored_at:123},calls,'core'),DB_HISTORY:db({date:'20261003',calculated_at:'2026-10-03T00:00:00Z'},calls,'history')};
 const out=await readProjectionCheckpoint(env,'koreaFearGreed');
 assert.match(out.sourceVersion,/^kfg:20261003:/);
 assert.deepEqual(calls.map(x=>x.label),['history']);
});

test('batch checkpoint reads each needed shard once',async()=>{
 const calls=[];
 const env={DB_CORE:db({stored_at:123},calls,'core'),DB_HISTORY:db({date:'20261003',calculated_at:'2026-10-03T00:00:00Z'},calls,'history')};
 const out=await readProjectionCheckpoints(env,['inflation','recession','koreaFearGreed']);
 assert.equal(out.inflation.sourceVersion,'core:123');
 assert.equal(out.recession.sourceVersion,'core:123');
 assert.match(out.koreaFearGreed.sourceVersion,/^kfg:/);
 assert.deepEqual(calls.map(x=>x.label).sort(),['core','history']);
});
