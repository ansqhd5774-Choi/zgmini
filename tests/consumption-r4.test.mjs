import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateConsumptionR4} from '../lib/market-score/consumption-r4.mjs';
import {parseRealPceCsv,collectConsumptionR4} from '../scripts/pc-writer/consumption-r4.mjs';
import {loadStoredConsumptionR4} from '../worker/consumption-r4-reader.mjs';
import {localDatabase} from '../scripts/pc-writer/local-db.mjs';
const fixture=(rate=0)=>Array.from({length:24},(_,i)=>({observationDate:new Date(Date.UTC(2024,i,1)).toISOString().slice(0,10),value:100*(1+rate)**(i/12)}));
const calculate=rows=>calculateConsumptionR4(rows,{asOfDate:'2025-12-31'});
test('zero growth is 50; constant 2% annual growth is 70; unit scaling is invariant',()=>{
  assert.equal(calculate(fixture()).score,50);
  const rows=fixture(.02),result=calculate(rows);
  assert.ok(Math.abs(result.score-70)<1e-9);
  assert.ok(Math.abs(calculate(rows.map(row=>({...row,value:row.value*1000}))).score-result.score)<1e-9);
  assert.equal(result.trend.filter(row=>row.status==='READY').length,12);
});
test('recovery turns upward; decline scores below 50; saturation stays bounded',()=>{
  const rows=fixture();rows.at(-1).value=101;
  assert.ok(calculate(rows).score>calculate(fixture()).score);
  assert.ok(calculate(fixture(-.02)).score<50);
  assert.equal(calculate(fixture(.2)).score,100);
});
test('missing month, invalid zero and latest missing are null, without reweighting',()=>{
  for(const rows of [fixture().filter((_,i)=>i!==20),fixture().map((row,i)=>i===23?{...row,value:0}:row),fixture().map((row,i)=>i===23?{...row,value:null}:row)])assert.equal(calculate(rows).score,null);
  assert.throws(()=>calculate([...fixture(),fixture()[0]]),/DUPLICATE/);
  assert.equal(calculate([...fixture(),{observationDate:'2026-01-01',value:500}]).score,50);
});
test('stored input is read back; calculation is network free; R3 rows survive',async()=>{
  const db=localDatabase(':memory:');
  await db.exec('CREATE TABLE c1_r3_candidate_scores_v1(score REAL); INSERT INTO c1_r3_candidate_scores_v1 VALUES(42);');
  const csv='observation_date,PCEC96\n'+fixture(.02).map(row=>row.observationDate+','+row.value).join('\n');
  let calls=0;const now=Date.parse('2025-12-31T12:00:00Z');
  const collected=await collectConsumptionR4({db,now,fetchImpl:async()=>{calls++;return new Response(csv);}});
  assert.equal(collected.status,'COMPLETE');
  const stored=await loadStoredConsumptionR4(db,{asOf:'2025-12-31'});
  assert.ok(Math.abs(stored.score-70)<1e-9);
  await collectConsumptionR4({db,now,fetchImpl:()=>{throw Error('cached request must not fetch');}});
  assert.equal(calls,1);
  assert.equal((await db.prepare('SELECT score FROM c1_r3_candidate_scores_v1').first()).score,42);
  assert.equal((await loadStoredConsumptionR4(db,{asOf:'2026-01-10'})).score,null);
  assert.throws(()=>parseRealPceCsv('observation_date,PCEC96\n2025-01-01,bad'),/CSV_VALUE/);
  db.close();
});
