import {test} from 'node:test';
import assert from 'node:assert/strict';
import {collectionHealthSummary,readCollectionHealth,COLLECTION_WINDOW_MS} from '../worker/collection-health.mjs';
const now=Date.UTC(2026,9,6,14);
test('only completed recent storage counts; old, future, failed and missing do not',()=>{
 const result=collectionHealthSummary([{id:'good',storedAt:now-1,complete:true},{id:'old',storedAt:now-COLLECTION_WINDOW_MS,complete:true},{id:'future',storedAt:now+1,complete:true},{id:'failed',storedAt:now,complete:false},{id:'missing',storedAt:null,complete:true}],now);
 assert.equal(result.normal,1);assert.equal(result.total,5);assert.equal(result.status,'unknown');
});
test('visitor uses a fixed key single query and rechecks expiry',async()=>{
 const body=collectionHealthSummary([{id:'a',storedAt:now-100,complete:true}],now);
 let queries=0;
 const db={prepare(sql){queries++;assert.match(sql,/snapshot_key='current'/);return {bind(key){assert.equal(key,'collection-health');return {first:async()=>({body:JSON.stringify(body)})}}}}};
 const result=await readCollectionHealth(db,now+COLLECTION_WINDOW_MS);
 const value=await result.json();assert.equal(value.normal,0);assert.equal(value.status,'unknown');assert.equal(queries,1);
});
test('missing storage fails closed',async()=>{const result=await readCollectionHealth({prepare(){throw Error('missing')}},now);assert.equal(result.status,503);assert.equal((await result.json()).status,'unknown')});

test('recent validated check stays green with old observations; latest failure is orange',()=>{
 const old=now-10*COLLECTION_WINDOW_MS;
 const success=collectionHealthSummary([{id:'korea',storedAt:old,checkedAt:now-1,outcome:'success'}],now);
 assert.equal(success.status,'healthy');assert.equal(success.items[0].storedAt,old);
 const fail=collectionHealthSummary([{id:'korea',storedAt:old,checkedAt:now-1,outcome:'failure'}],now);
 assert.equal(fail.status,'partial');assert.equal(fail.failed,1);
 assert.equal(collectionHealthSummary(fail.items,now+COLLECTION_WINDOW_MS).status,'unknown');
});

test('visitor preserves failure and independent check timestamp',async()=>{
 const body=collectionHealthSummary([{id:'korea',storedAt:0,checkedAt:now-100,outcome:'failure'}],now);
 const db={prepare(){return {bind(){return {first:async()=>({body:JSON.stringify(body)})}}}}};
 const value=await (await readCollectionHealth(db,now+1)).json();
 assert.equal(value.failed,1);assert.equal(value.status,'partial');assert.equal(value.items[0].storedAt,0);
});
