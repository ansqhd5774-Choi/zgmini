import test from "node:test";
import assert from "node:assert/strict";
import {EMPLOYMENT_R4_CORE_STATES} from "../lib/market-score/employment-r4-shadow-contract.mjs";
import {EMPLOYMENT_R6_FEATURES} from "../lib/market-score/employment-r6-formula.mjs";
import {deriveEmploymentR6FeatureHistory} from "../lib/market-score/employment-r6-feature-engine.mjs";

const feature=EMPLOYMENT_R6_FEATURES.find(item=>item.n===14);
const DAY=86400000;
const dateAt=week=>new Date(Date.UTC(2015,0,3)+week*7*DAY).toISOString().slice(0,10);

function makeRows(weeks=600){
  const rows=[];
  for(let i=0;i<weeks;i++)for(const [j,geo] of EMPLOYMENT_R4_CORE_STATES.entries()){
    rows.push({logicalSeriesId:"STATE_INITIAL_CLAIMS",geographyCode:geo,
      geographyType:"STATE",observationDate:dateAt(i),
      value:100+j+i,sourceHash:geo+":"+i});
  }
  return rows;
}

test("600 weekly observations across exactly 51 states yield same 545 strict 52-week breadth windows",()=>{
  assert.equal(EMPLOYMENT_R4_CORE_STATES.length,51);
  assert.equal(feature.id,"STATE_CLAIMS_BREADTH");
  const result=deriveEmploymentR6FeatureHistory(feature,makeRows());
  assert.equal(result.length,545);
  assert.equal(result[0].date,dateAt(55));
  assert.equal(result.at(-1).date,dateAt(599));
  assert.ok(result.every(point=>point.value===100));
  assert.ok(result.every(point=>point.sourceHashes.length===8*51));
  const states=[...EMPLOYMENT_R4_CORE_STATES].sort();
  assert.deepEqual(result[0].sourceHashes.slice(0,8),
    [...[52,53,54,55].map(i=>states[0]+":"+i),
      ...[0,1,2,3].map(i=>states[0]+":"+i)]);
});

test("a blank state claim never becomes zero or a complete 51-region week",()=>{
  const rows=makeRows();
  const missing=rows.find(item=>item.observationDate===dateAt(599)&&item.geographyCode==="DC");
  assert.ok(missing);
  missing.value=null;
  const result=deriveEmploymentR6FeatureHistory(feature,rows);
  assert.equal(result.length,544);
  assert.equal(result.at(-1).date,dateAt(598));
  assert.ok(!result.some(point=>point.date===dateAt(599)));
});

test("a genuine zero denominator blocks only the affected window, not all other weeks",()=>{
  const rows=makeRows();
  for(const item of rows){
    if(item.geographyCode==="DC"&&[0,1,2,3].some(i=>item.observationDate===dateAt(i)))
      item.value=0;
  }
  const result=deriveEmploymentR6FeatureHistory(feature,rows);
  assert.equal(result.length,544);
  assert.equal(result[0].date,dateAt(56));
  assert.equal(result.at(-1).date,dateAt(599));
});

test("missing entire weekly observations are never shifted into a false 52-week comparison",()=>{
  const rows=makeRows().filter(item=>item.observationDate!==dateAt(100));
  const result=deriveEmploymentR6FeatureHistory(feature,rows);
  assert.ok(!result.some(point=>point.date===dateAt(103)));
  assert.ok(result.some(point=>point.date===dateAt(200)));
  assert.ok(result.every(point=>point.value===100));
});
