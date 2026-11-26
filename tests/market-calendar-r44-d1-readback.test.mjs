import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {r44D1Readback} from '../scripts/pc-writer/market-calendar-r44-d1-readback.mjs';
import {DELTA_R44_OUTPUT_KEY} from '../lib/market-calendar-deltascreener-public.mjs';
const row=(body='{"grades":{"DAC":1}}',stored_at=1794800000000)=>({
 feed_key:DELTA_R44_OUTPUT_KEY,body,stored_at});
test('identical D1 R44 row is proved by both timestamp and SHA',()=>{
 const local=row(),remote={body:local.body,stored_at:local.stored_at};
 const r=r44D1Readback(local,remote);
 assert.equal(r.status,'MATCHED');
 assert.equal(r.localBodySha256,createHash('sha256').update(local.body).digest('hex'));
 assert.equal(r.localStoredAt,r.d1StoredAt);
 assert.equal(JSON.stringify(r).includes('DAC'),false);
});
test('same timestamp different body is not falsely matched',()=>{
 const r=r44D1Readback(row(),{stored_at:1794800000000,body:'{"grades":{"DAC":3}}'});
 assert.equal(r.status,'NOT_MATCHED');
 assert.notEqual(r.localBodySha256,r.d1BodySha256);
});
test('newer D1 is preserved but never equals local proof',()=>{
 const r=r44D1Readback(row(),{stored_at:1794800000001,body:row().body});
 assert.equal(r.status,'REMOTE_NEWER_PRESERVED');
});
test('missing D1 and invalid timestamp are not matched',()=>{
 assert.equal(r44D1Readback(row(),null).status,'D1_ROW_MISSING');
 assert.equal(r44D1Readback(row(undefined,NaN),{stored_at:NaN,body:row().body}).status,'NOT_MATCHED');
});
test('non-R44 feed rows remain untouched',()=>{
 assert.equal(r44D1Readback({feed_key:'another-key',body:'{}',stored_at:1},null),null);
});
