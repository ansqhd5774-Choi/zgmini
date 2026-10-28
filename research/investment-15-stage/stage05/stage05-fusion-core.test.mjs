import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateFusionStage05,SCHEMA_VERSION} from './stage05-fusion-core.mjs';

const completed=(id,M4)=>({id,status:'QUANTIFIED',M4,
  scoreKind:'STAGE04_M4_FINAL',scoreValidation:'VERIFIED',
  validatedDate:'2026-10-27'});
function fixture(){
  return {schemaVersion:SCHEMA_VERSION,snapshotDate:'2026-10-28',
    stage01:{status:'READY',date:'2026-10-27',risk:'CAUTION'},
    stage02:{status:'READY',sectors:[{id:'s1',score:74},{id:'s2',score:31}]},
    stage03:{status:'READY',themes:[
      {id:'a',sectorId:'s1',approved:true,score:89},
      {id:'b',sectorId:'s2',approved:true,score:65},
      {id:'c',sectorId:'s1',approved:false,score:99}]},
    stage04:{status:'READY',themes:[completed('a',81),completed('b',52)]}};
}

test('uses completed Stage04 M4 exactly once; Stage02/03 scores stay separate',()=>{
  const result=calculateFusionStage05(fixture());
  assert.equal(result.summary.rankableCount,2);
  assert.equal(result.summary.selectedThemeId,null);
  assert.deepEqual(result.ranking.map(x=>[x.themeId,x.S5]),[['a',81],['b',52]]);
  assert.equal(result.stage01.risk,'CAUTION');
  assert.equal(result.rows[0].stage02Score,74);
  assert.equal(result.rows[0].stage03Score,89);
  assert.equal(result.rows[0].stage04M4,81);
  assert.equal(result.rows[0].calculation,'STAGE04_FINAL_SCORE_REUSED_NO_REWEIGHTING');
  assert.equal(result.rows.some(row=>row.themeId==='c'),false);
});

test('does not require or recompute ETF relative strength and theme trend',()=>{
  const input=fixture();
  input.stage02.sectors[0].relativeStrength={score:2};
  input.stage03.themes[0].trend={score:3};
  assert.equal(calculateFusionStage05(input).rows[0].S5,81);
  delete input.stage02.sectors[0].relativeStrength;
  delete input.stage03.themes[0].trend;
  assert.equal(calculateFusionStage05(input).rows[0].S5,81);
});

test('does not calculate G/D/M4 again from G1/G2/F or a forecast',()=>{
  const input=fixture();
  Object.assign(input.stage04.themes[0],{G1:10,G2:20,F:99,mean_pct:11.285});
  assert.equal(calculateFusionStage05(input).rows[0].S5,81);
  delete input.stage04.themes[0].M4;
  const a=calculateFusionStage05(input).rows[0];
  assert.equal(a.S5,null);
  assert.ok(a.blockReasons.includes('STAGE04_FINAL_M4_MISSING'));
});

test('a forecast average cannot impersonate Stage04 verified final M4',()=>{
  const input=fixture();
  input.stage04.themes[0].M4=11.285;
  input.stage04.themes[0].scoreKind='FORECAST_CAGR';
  const a=calculateFusionStage05(input).rows[0];
  assert.equal(a.S5,null);
  assert.ok(a.blockReasons.includes('STAGE04_FINAL_M4_MISSING'));
});

test('existing Stage01 risk is context, never a scoring penalty',()=>{
  const input=fixture();
  input.stage01.risk='HIGH_RISK';
  assert.equal(calculateFusionStage05(input).rows[0].S5,81);
  input.stage01.status='UNAVAILABLE';
  assert.equal(calculateFusionStage05(input).rows[0].S5,null);
});

test('missing completed Stage02/03 scores never silently become 0 or 50',()=>{
  const input=fixture();
  delete input.stage02.sectors[0].score;
  assert.equal(calculateFusionStage05(input).rows[0].S5,null);
  input.stage02.sectors[0].score=74;
  delete input.stage03.themes[0].score;
  assert.equal(calculateFusionStage05(input).rows[0].S5,null);
});

test('a tie keeps stable ID order; earlier scores never get a second ranking weight',()=>{
  const input=fixture();
  input.stage04.themes[1].M4=81;
  input.stage03.themes[1].score=99;
  assert.deepEqual(calculateFusionStage05(input).ranking.map(r=>r.themeId),['a','b']);
  assert.equal(calculateFusionStage05(input).ranking[0].S5,81);
});

test('unverified or future Stage04 final score stays NULL',()=>{
  const input=fixture();
  input.stage04.themes[0].scoreValidation='UNVERIFIED';
  assert.equal(calculateFusionStage05(input).rows[0].S5,null);
  input.stage04.themes[0].scoreValidation='VERIFIED';
  input.stage04.themes[0].validatedDate='2026-10-29';
  assert.equal(calculateFusionStage05(input).rows[0].S5,null);
});

test('duplicate IDs and malformed schema are rejected without a default score',()=>{
  const input=fixture();
  input.stage03.themes.push({...input.stage03.themes[0]});
  assert.throws(()=>calculateFusionStage05(input),/STAGE03_THEME_DUPLICATE_ID_a/);
  input.stage03.themes.pop();
  input.schemaVersion='OLD';
  assert.throws(()=>calculateFusionStage05(input),/INPUT_SCHEMA_VERSION_MISMATCH/);
});

test('no approved candidates produces no invented selection',()=>{
  const input=fixture();input.stage03.themes.forEach(r=>r.approved=false);
  const r=calculateFusionStage05(input);
  assert.equal(r.summary.approvedCandidateCount,0);
  assert.equal(r.summary.selectedThemeId,null);
  assert.deepEqual(r.ranking,[]);
});
