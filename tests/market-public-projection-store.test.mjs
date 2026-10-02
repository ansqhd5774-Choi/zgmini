import test from 'node:test';
import assert from 'node:assert/strict';
import {PUBLIC_PROJECTION_KEYS,publicProjectionStore,storedProjectionResponse} from '../worker/market-public-projection-store.mjs';

test('stored projection read is one bounded SELECT',async()=>{
  const calls=[];const now=Date.now();
  const db={prepare(sql){
    calls.push(sql);assert.equal(sql,'SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?');
    return {bind(key){assert.equal(key,PUBLIC_PROJECTION_KEYS.recession);return this;},async first(){return {body:JSON.stringify({status:'READY',score:51}),stored_at:now};}};
  }};
  const store=publicProjectionStore(db);
  const row=await store.read(PUBLIC_PROJECTION_KEYS.recession);
  assert.equal(row.body.score,51);assert.equal(calls.length,1);
});

test('stored projection response returns cached JSON and truthful stale 503',async()=>{
  const now=Date.now();
  const ok=await storedProjectionResponse(new Request('https://candidate/api/recession-detail'),{
    key:PUBLIC_PROJECTION_KEYS.recession,now,maxAgeMs:1000,
    store:{read:async()=>({body:{status:'READY',score:51},storedAt:now-10})},
  });
  assert.equal(ok.status,200);assert.equal(ok.headers.get('x-public-projection'),'STORED');
  assert.equal((await ok.json()).score,51);
  const stale=await storedProjectionResponse(new Request('https://candidate/api/recession-detail'),{
    key:PUBLIC_PROJECTION_KEYS.recession,now,maxAgeMs:1000,
    store:{read:async()=>({body:{status:'READY'},storedAt:now-5000})},
  });
  assert.equal(stale.status,503);assert.equal((await stale.json()).reason,'STORED_PROJECTION_STALE');
});

test('projection key allowlist rejects arbitrary keys',async()=>{
  const store=publicProjectionStore({prepare(){throw Error('SHOULD_NOT_RUN')}});
  await assert.rejects(()=>store.read('detail:../../x'),/INVALID_PROJECTION_KEY/);
});
