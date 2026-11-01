import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {buildBeaManufacturingProfitPreview,BEA_MFG_PROFIT_SERIES}
 from '../lib/market-score/earnings-bea-manufacturing-profit-source-r1.mjs';
import {BEA_MFG_ROUTE,BEA_MFG_SNAPSHOT_KEY,validateBeaMfgProfit,
 beaMfgFreshness,readBeaMfgResponse,beaMfgWriter}
 from '../worker/earnings-bea-manufacturing-profit-r1.mjs';

const csv=`observation_date,${BEA_MFG_PROFIT_SERIES}\n2025-04-01,681.285\n2025-07-01,741.175\n2025-10-01,801.724\n2026-01-01,812.346\n2026-04-01,1053.304\n`;
const now=Date.parse('2026-10-28T00:00:00Z');
const sourceVersion='ebaf93f7a1e526cabae22388ed96d280d94eb58fdd4ddf484325bf651c59bf9b';
const payload=()=>buildBeaManufacturingProfitPreview(csv,{sourceVersion,sourceStoredAt:now});
const url='https://zgmini.kr'+BEA_MFG_ROUTE;

function dbFixture(){
 const db=new DatabaseSync(':memory:');
 db.exec('CREATE TABLE market_public_snapshots_v1 (snapshot_key TEXT PRIMARY KEY,body TEXT NOT NULL,stored_at INTEGER NOT NULL)');
 const adapter={prepare(sql){return {bind(...args){return {
   first:async()=>db.prepare(sql).get(...args)??null,
   run:async()=>{const result=db.prepare(sql).run(...args);return {meta:{changes:Number(result.changes)}};},
 };}};}};
 return {db,adapter};
}

test('captured source builds valid, non-scoring manufactured-profit preview',()=>{
 const p=validateBeaMfgProfit(payload(),{now});
 assert.equal(p.indicator.seriesId,BEA_MFG_PROFIT_SERIES);
 assert.equal(p.indicator.officialReleaseDate,null);
 assert.equal(p.historicalMode,'CURRENT_VINTAGE_NOT_PIT');
 assert.ok(Math.abs(p.indicator.value-54.60548815840656)<1e-10);
 assert.deepEqual(beaMfgFreshness(p,{now}),{status:'FRESH',reason:null});
});

test('tampered values and stale time reject closed',()=>{
 const p=payload();p.indicator.value+=10;
 assert.throws(()=>validateBeaMfgProfit(p,{now}),/INVALID_INDICATOR/);
 assert.equal(beaMfgFreshness(payload(),{now:now+170*86_400_000}).status,'STALE');
});

test('reader responds pending until storage exists, writer readback verifies',async()=>{
 const {db,adapter}=dbFixture();
 try{
  const missing=await readBeaMfgResponse(new Request(url),adapter,{now});
  assert.equal(missing.status,503);
  assert.equal((await missing.json()).reason,'STORED_PROJECTION_PENDING');
  const w=beaMfgWriter(adapter);
  const stored=await w.write(payload(),{storedAt:now+1000});
  assert.equal(stored.status,'READBACK_VERIFIED');
  assert.equal(stored.key,BEA_MFG_SNAPSHOT_KEY);
  const response=await readBeaMfgResponse(new Request(url),adapter,{now:now+2000});
  assert.equal(response.status,200);
  const body=await response.json();
  assert.equal(body.indicator.observationPeriod,'2026-Q2');
  assert.equal(body.freshness.status,'FRESH');
  assert.equal((await w.write(payload(),{storedAt:now+3000})).status,'ALREADY_STORED');
  const stale=await readBeaMfgResponse(new Request(url),adapter,{now:now+170*86_400_000});
  assert.equal(stale.status,503);
 }finally{db.close();}
});

test('GET-only route rejects mutation and queries without touching D1',async()=>{
 const {db,adapter}=dbFixture();
 try{
  const post=await readBeaMfgResponse(new Request(url,{method:'POST'}),adapter,{now});
  assert.equal(post.status,405);
  const query=await readBeaMfgResponse(new Request(url+'?x=1'),adapter,{now});
  assert.equal(query.status,400);
 }finally{db.close();}
});
