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

test('damaged existing BEA checkpoint never returns ALREADY_STORED',async()=>{
 const {db,adapter}=dbFixture();
 try{
  const writer=beaMfgWriter(adapter);
  await writer.write(payload(),{storedAt:now+1000});
  const original=db.prepare('SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?')
    .get(BEA_MFG_SNAPSHOT_KEY);
  const corruptions=[
    envelope=>{delete envelope.projection;},
    envelope=>{envelope.projection.sourceVersion='f'.repeat(64);},
    envelope=>{envelope.projection.sourceStoredAt+=1;},
    envelope=>{envelope.projection.builtAt+=1;},
    envelope=>{envelope.projection.builtAt=now-1;},
  ];
  for(const corrupt of corruptions){
    const envelope=JSON.parse(original.body);corrupt(envelope);
    db.prepare('UPDATE market_public_snapshots_v1 SET body=? WHERE snapshot_key=?')
      .run(JSON.stringify(envelope),BEA_MFG_SNAPSHOT_KEY);
    await assert.rejects(writer.write(payload(),{storedAt:now+3000}),
      /BEA_MFG_EXISTING_INVALID/);
    const response=await readBeaMfgResponse(new Request(url),adapter,{now:now+3000});
    assert.equal(response.status,503);
    assert.equal((await response.json()).reason,'STORED_PROJECTION_INVALID');
    assert.equal(db.prepare('SELECT body FROM market_public_snapshots_v1 WHERE snapshot_key=?')
      .get(BEA_MFG_SNAPSHOT_KEY).body,JSON.stringify(envelope));
  }
 }finally{db.close();}
});

test('same raw SHA with a newer stored-source observation advances the D1 checkpoint',async()=>{
 const {db,adapter}=dbFixture();
 try{
  const writer=beaMfgWriter(adapter);
  const first=await writer.write(payload(),{storedAt:now+1000});
  assert.equal(first.status,'READBACK_VERIFIED');
  const refreshed=buildBeaManufacturingProfitPreview(csv,
    {sourceVersion,sourceStoredAt:now+2000});
  const second=await writer.write(refreshed,{storedAt:now+3000});
  assert.equal(second.status,'READBACK_VERIFIED');
  const row=db.prepare('SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?')
    .get(BEA_MFG_SNAPSHOT_KEY);
  assert.equal(JSON.parse(row.body).projection.sourceStoredAt,now+2000);
  assert.equal(row.stored_at,now+3000);
  assert.equal((await writer.write(refreshed,{storedAt:now+4000})).status,'ALREADY_STORED');
 }finally{db.close();}
});

test('same archived SHA and retrieval checkpoint cannot overwrite an incompatible BEA indicator',async()=>{
 const {db,adapter}=dbFixture();
 try{
  const writer=beaMfgWriter(adapter);
  assert.equal((await writer.write(payload(),{storedAt:now+1000})).status,'READBACK_VERIFIED');
  const before=db.prepare('SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?')
    .get(BEA_MFG_SNAPSHOT_KEY);
  const altered=payload();
  altered.indicator.history[4].profitsBillionsUsdAnnualRate+=10;
  altered.indicator.currentProfitsBillionsUsdAnnualRate+=10;
  altered.indicator.value=(altered.indicator.currentProfitsBillionsUsdAnnualRate/
    altered.indicator.yearAgoProfitsBillionsUsdAnnualRate-1)*100;
  validateBeaMfgProfit(altered,{now:now+3000}); // internally consistent but not tied to raw SHA
  assert.notEqual(altered.indicator.value,payload().indicator.value);
  await assert.rejects(writer.write(altered,{storedAt:now+3000}),
    /BEA_MFG_CONFLICTING_SNAPSHOT/);
  const after=db.prepare('SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?')
    .get(BEA_MFG_SNAPSHOT_KEY);
  assert.deepEqual(after,before);
  assert.equal((await writer.write(payload(),{storedAt:now+4000})).status,'ALREADY_STORED');
  const get=await readBeaMfgResponse(new Request(url),adapter,{now:now+5000});
  assert.equal(get.status,200);
  assert.equal((await get.json()).indicator.value,payload().indicator.value);
 }finally{db.close();}
});

test('stale prewrite view cannot race-overwrite a D1 row at the same stored-source checkpoint',async()=>{
 const {db,adapter}=dbFixture();
 try{
  await beaMfgWriter(adapter).write(payload(),{storedAt:now+1000});
  const before=db.prepare('SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?')
    .get(BEA_MFG_SNAPSHOT_KEY);
  let staleFirst=true;
  const staleAdapter={prepare(sql){
   const q=adapter.prepare(sql);
   return {bind(...args){
    const v=q.bind(...args);
    return {
     first:async()=>staleFirst&&sql.startsWith('SELECT body,stored_at')?
       (staleFirst=false,null):v.first(),
     run:()=>v.run(),
    };
   }};
  }};
  const altered=payload();
  altered.indicator.history[4].profitsBillionsUsdAnnualRate+=10;
  altered.indicator.currentProfitsBillionsUsdAnnualRate+=10;
  altered.indicator.value=(altered.indicator.currentProfitsBillionsUsdAnnualRate/
    altered.indicator.yearAgoProfitsBillionsUsdAnnualRate-1)*100;
  await assert.rejects(beaMfgWriter(staleAdapter).write(altered,{storedAt:now+3000}),
    /BEA_MFG_SUPERSEDED/);
  const after=db.prepare('SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?')
    .get(BEA_MFG_SNAPSHOT_KEY);
  assert.deepEqual(after,before);
 }finally{db.close();}
});
