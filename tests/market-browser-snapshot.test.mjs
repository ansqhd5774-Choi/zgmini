import test from 'node:test';
import assert from 'node:assert/strict';
import {readMarketSnapshot,saveMarketSnapshot} from '../lib/market-score/browser-snapshot.mjs';
const now=Date.parse('2026-09-23T00:00:00Z');
const body={status:'SUCCESS',updatedAt:new Date(now).toISOString(),domains:Array.from({length:12},()=>({score:null,status:'PARTIAL'}))};
const storage=()=>{let data;return {getItem:()=>data,setItem:(k,v)=>{data=v}}};
test('manual reload may retain expired display without renewing its server deadline',()=>{
 const s=storage();saveMarketSnapshot(s,body,new Headers({'cache-control':'max-age=300'}),now);
 const retained=readMarketSnapshot(s,now+3600000,{allowExpired:true});
 assert.deepEqual(retained.body,body);
 assert.equal(retained.expiresAt,now+300000);
 assert.equal(readMarketSnapshot(s,now+3600000),null);
 assert.equal(readMarketSnapshot({getItem:()=>JSON.stringify({body})},now,{allowExpired:true}),null);
});
test('browser snapshot preserves nulls and expires at remaining server TTL',()=>{
 const s=storage();saveMarketSnapshot(s,body,new Headers({'cache-control':'public, max-age=100','age':'20'}),now);
 assert.deepEqual(readMarketSnapshot(s,now+79000).body,body);assert.equal(readMarketSnapshot(s,now+80000),null);
});
test('repeated saves never extend original observation beyond five minutes',()=>{
 const s=storage();saveMarketSnapshot(s,body,new Headers({'cache-control':'public, max-age=300'}),now+250000);
 assert.equal(readMarketSnapshot(s,now+300000),null);
});
test('invalid, expired and storage-disabled snapshots fail safely',()=>{
 const s=storage();saveMarketSnapshot(s,{...body,status:'FAILED'},new Headers({'cache-control':'max-age=300'}),now);assert.equal(readMarketSnapshot(s,now),null);
 assert.equal(readMarketSnapshot({getItem:()=>{throw Error()}}),null);
 saveMarketSnapshot({setItem:()=>{throw Error()}},body,new Headers({'cache-control':'max-age=300'}),now);
});
