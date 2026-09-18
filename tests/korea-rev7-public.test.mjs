import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {
  publicSnapshot,createKoreaFundsHandler,stageForDisplayScore,
  PUBLIC_HISTORY_LIMIT,
} from '../worker/korea-funds.mjs';
import {buildHistoricalSnapshotRecords} from '../worker/korea-rev7-public-projection.mjs';
import {REV7_VERSION,REV7_FACTORS,REV7_INDEX_ID} from '../worker/korea-rev7-engine.mjs';

const factorScores={momentum:13.6,strength:58.2,breadth:44.4,putCall:71.1,volatility:39.2,safeHaven:60.5,junkBond:53.9};
const rows=[0,1,2].map(i=>{
  const factors=Object.fromEntries(REV7_FACTORS.map(id=>[id,{id,raw:i,score:factorScores[id]+i}]));
  const score=REV7_FACTORS.reduce((s,id)=>s+factors[id].score,0)/7;
  return {
    date:`2026091${3+i}`,methodology_version:REV7_VERSION,
    factors_json:JSON.stringify(factors),
    composite_json:JSON.stringify({id:REV7_INDEX_ID,score,status:'READY',observationDate:`2026091${3+i}`,weights:Object.fromEntries(REV7_FACTORS.map(id=>[id,1/7]))}),
    history_mode:'RECONSTRUCTED_CURRENT_VINTAGE',point_in_time_verified:0,calculated_at:'2026-09-18T00:00:00Z',
  };
});

test('public snapshot is Revision 7 only and exposes no factor raw fields',async()=>{
  const snap=await publicSnapshot({},{
    loadProgress:async()=>({status:'COMPLETE',successfulTradingDates:1030}),
    loadRows:async()=>rows,
    clock:()=>new Date('2026-09-15T12:00:00Z'),
  });
  assert.equal(snap.composite.methodologyVersion,REV7_VERSION);
  assert.equal(snap.composite.fallbackApplied,false);
  assert.equal(snap.indicators.length,7);
  assert.equal(snap.composite.components.length,7);
  assert.ok(snap.composite.components.every(x=>!Object.hasOwn(x,'raw')));
  assert.equal(snap.researchOnly,true);
  assert.equal(snap.productionEligible,false);
  assert.equal(PUBLIC_HISTORY_LIMIT,270);
});

test('approved Korea display stage thresholds are preserved',()=>{
  assert.equal(stageForDisplayScore(24.9).stageCode,'EXTREME_FEAR');
  assert.equal(stageForDisplayScore(25).stageCode,'FEAR');
  assert.equal(stageForDisplayScore(44.9).stageCode,'FEAR');
  assert.equal(stageForDisplayScore(45).stageCode,'NEUTRAL');
  assert.equal(stageForDisplayScore(55).stageCode,'NEUTRAL');
  assert.equal(stageForDisplayScore(55.1).stageCode,'GREED');
  assert.equal(stageForDisplayScore(75).stageCode,'GREED');
  assert.equal(stageForDisplayScore(75.1).stageCode,'EXTREME_GREED');
});

test('incomplete state fails closed instead of V1/V2 fallback',async()=>{
  const snap=await publicSnapshot({},{
    loadProgress:async()=>({status:'RUNNING',successfulTradingDates:1000}),
    loadRows:async()=>rows,
  });
  assert.equal(snap.composite.score,null);
  assert.equal(snap.composite.fallbackApplied,false);
  assert.equal(snap.composite.staleReason,'REV7_BACKFILL_NOT_COMPLETE');
});

test('historical projection records preserve internal full factor data but public API strips raw',()=>{
  const result={
    id:REV7_INDEX_ID,methodologyVersion:REV7_VERSION,historyMode:'RECONSTRUCTED_CURRENT_VINTAGE',
    pointInTimeVerified:false,weights:Object.fromEntries(REV7_FACTORS.map(id=>[id,1/7])),
    history:rows.map(row=>({
      date:row.date,status:'READY',factors:JSON.parse(row.factors_json),
      composite:JSON.parse(row.composite_json).score,
    })),
  };
  const records=buildHistoricalSnapshotRecords(result,'2026-09-18T00:00:00Z');
  assert.equal(records.length,3);
  assert.ok(JSON.parse(records[0].factorsJson).momentum.raw!==undefined);
});

test('handler keeps strict method/query contract',async()=>{
  const handler=createKoreaFundsHandler({
    loadProgress:async()=>({status:'COMPLETE',successfulTradingDates:1030}),
    loadRows:async()=>rows,
    clock:()=>new Date('2026-09-15T12:00:00Z'),
  });
  assert.equal((await handler(new Request('https://zgmini.kr/api/indicators/korea-funds',{method:'POST'}),{})).status,405);
  assert.equal((await handler(new Request('https://zgmini.kr/api/indicators/korea-funds?x=1'),{})).status,400);
  const r=await handler(new Request('https://zgmini.kr/api/indicators/korea-funds'),{});
  assert.equal(r.status,200);
  assert.equal((await r.json()).composite.methodologyVersion,REV7_VERSION);
});

test('public source accepts only Revision 7 and removes legacy public fallback',async()=>{
  const worker=await readFile(new URL('../worker/korea-funds.mjs',import.meta.url),'utf8');
  const store=await readFile(new URL('../app/korea-funds-store.ts',import.meta.url),'utf8');
  const view=await readFile(new URL('../app/korea-composite-view.tsx',import.meta.url),'utf8');
  assert.ok(!worker.includes('korea-composite-v2'));
  assert.ok(!worker.includes('runFscScoped'));
  assert.ok(!worker.includes('buildComposite('));
  assert.ok(store.includes('kr-fg-cnn-r7-1.0.0'));
  assert.ok(!store.includes('kr-fg-2f-cs-2.0.0'));
  assert.ok(view.includes('Revision 7'));
  assert.ok(!view.includes('기업스트레스 최대 10점 감점'));
});
