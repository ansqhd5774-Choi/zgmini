import test from 'node:test';
import assert from 'node:assert/strict';
import {computeFeaturePoint,deriveEmploymentR6FeatureHistory} from '../lib/market-score/employment-r6-feature-engine.mjs';
import {EMPLOYMENT_R6_FEATURES} from '../lib/market-score/employment-r6-formula.mjs';
import {EMPLOYMENT_R4_CORE_STATES} from '../lib/market-score/employment-r4-shadow-contract.mjs';

const feature=EMPLOYMENT_R6_FEATURES.find(x=>x.id==='STATE_CLAIMS_BREADTH');
const latest=Date.parse('2026-10-31T00:00:00Z');
const week=7*86400000;

function raw(weeks){
  const rows=[];
  for(let i=weeks-1;i>=0;i--){
    const date=new Date(latest-i*week).toISOString().slice(0,10);
    for(let j=0;j<EMPLOYMENT_R4_CORE_STATES.length;j++){
      rows.push({logicalSeriesId:'STATE_INITIAL_CLAIMS',observationDate:date,
        geographyCode:EMPLOYMENT_R4_CORE_STATES[j],value:100+j+i%7,
        sourceHash:`synthetic-${i}-${j}`});
    }
  }
  return rows;
}

test('R6 ETA539 state breadth: 530 raw weeks cannot satisfy 10 years',()=>{
  const rows=raw(530);
  const derived=deriveEmploymentR6FeatureHistory(feature,rows);
  const score=computeFeaturePoint(feature,rows);
  assert.equal(rows.length,530*51);
  assert.equal(derived.length,475);
  assert.equal(score.status,'PARTIAL_HISTORY');
  assert.equal(score.score,null);
});

test('R6 ETA539 state breadth: 577 complete weeks yield a valid 10-year score',()=>{
  const rows=raw(577);
  const derived=deriveEmploymentR6FeatureHistory(feature,rows);
  const score=computeFeaturePoint(feature,rows);
  assert.equal(rows.length,577*51);
  assert.equal(derived.length,522);
  assert.equal(score.status,'READY');
  assert.equal(score.observationDate,'2026-10-31');
  assert.equal(Number.isFinite(score.score),true);
});
