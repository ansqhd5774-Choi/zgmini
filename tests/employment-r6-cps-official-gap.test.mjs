import test from 'node:test';
import assert from 'node:assert/strict';
import {EMPLOYMENT_R6_FEATURES, EMPLOYMENT_R6_FORMULA_CONTRACT} from '../lib/market-score/employment-r6-formula.mjs';
import {computeFeaturePoint, computeFamilyScores, computeEmploymentScore} from '../lib/market-score/employment-r6-feature-engine.mjs';
import {buildEmploymentR6OneYearReadModel} from '../lib/market-score/employment-r6-one-year-read-model.mjs';
import {validEmploymentR6PublicDisplay,employmentR6StoredDisplayResponse} from '../worker/employment-r6-public-display.mjs';

const cpsIds=['U3_UNEMPLOYMENT','U6_UNEMPLOYMENT','LFPR','EPOP'];
const find=id=>EMPLOYMENT_R6_FEATURES.find(f=>f.id===id);
function monthEnd(year, monthOffset){
  return new Date(Date.UTC(year,monthOffset+1,0)).toISOString().slice(0,10);
}
function fixture(feature,{current='2026-10-31',missing=['2025-10-31']}={}){
  const last=new Date(`${current}T00:00:00Z`),years=last.getUTCFullYear(),months=last.getUTCMonth();
  const rows=[];
  for(let i=120;i>=0;i--){
    const date=monthEnd(years,months-i);
    if(missing.includes(date))continue;
    rows.push({logicalSeriesId:feature.logical[0],observationDate:date,
      value: 3+(i%37)*0.1,sourceHash:`source-${date}`});
  }
  return rows;
}

test('four CPS indicators use exactly 119 actual references for the single official 2025-10 absence',()=>{
  for(const id of cpsIds){
    const feature=find(id),result=computeFeaturePoint(feature,fixture(feature));
    assert.equal(result.status,'READY',id);
    assert.equal(result.referenceCount,119,id);
    assert.equal(result.officialMissingReferenceDate,'2025-10-31',id);
    assert.equal(result.inputHashCount,120,id);
    assert.ok(Number.isFinite(result.score),id);
    assert.equal(result.observationDate,'2026-10-31',id);
  }
});

test('another missing CPS month remains blocked; no survivor substitution',()=>{
  for(const id of cpsIds){
    const f=find(id),result=computeFeaturePoint(f,fixture(f,{missing:['2025-10-31','2024-09-30']}));
    assert.equal(result.status,'PARTIAL_HISTORY',id);
    assert.equal(result.missingExpectedDate,'2024-09-30',id);
    assert.equal(result.score,null,id);
  }
});

test('a manufactured October CPS observation is a provenance conflict, not valid input',()=>{
  for(const id of cpsIds){
    const f=find(id),result=computeFeaturePoint(f,fixture(f,{missing:[]}));
    assert.equal(result.status,'PARTIAL_SOURCE_CONFLICT',id);
    assert.equal(result.missingExpectedDate,'2025-10-31',id);
    assert.equal(result.score,null,id);
  }
});

test('an October 2025 synthetic row cannot be accepted even when it is the latest observation',()=>{
  for(const id of cpsIds){
    const f=find(id);
    const result=computeFeaturePoint(f,fixture(f,{current:'2025-10-31',missing:[]}));
    assert.equal(result.status,'PARTIAL_SOURCE_CONFLICT',id);
    assert.equal(result.score,null,id);
  }
});

test('other monthly features remain strict 120-reference and do not inherit CPS waiver',()=>{
  const f=find('AVG_WEEKLY_HOURS');
  const partial=computeFeaturePoint(f,fixture(f));
  assert.equal(partial.status,'PARTIAL_HISTORY');
  assert.equal(partial.missingExpectedDate,'2025-10-31');
  const ready=computeFeaturePoint(f,fixture(f,{missing:[]}));
  assert.equal(ready.status,'READY');
  assert.equal(ready.officialMissingReferenceDate,undefined);
  assert.equal(ready.inputHashCount,121);
});

test('CPS waiver disappears when 2025-10 leaves the trailing ten-year window',()=>{
  const f=find('U3_UNEMPLOYMENT'),result=computeFeaturePoint(f,fixture(f,{current:'2035-11-30',missing:['2025-10-31']}));
  assert.equal(result.status,'READY');
  assert.equal(result.officialMissingReferenceDate,undefined);
  assert.equal(result.inputHashCount,121);
});

test('the formula remains 29-required, same weights, no survivor reweighting',()=>{
  assert.equal(EMPLOYMENT_R6_FEATURES.length,29);
  assert.equal(EMPLOYMENT_R6_FEATURES.reduce((sum,f)=>sum+f.w,0),100);
  assert.equal(EMPLOYMENT_R6_FORMULA_CONTRACT.all29Required,true);
  assert.equal(EMPLOYMENT_R6_FORMULA_CONTRACT.survivorReweight,false);
  assert.equal(EMPLOYMENT_R6_FORMULA_CONTRACT.officialCps2025OctoberGap.referenceMonths,119);
  const partial=computeFamilyScores(cpsIds.map(id=>computeFeaturePoint(find(id),fixture(find(id)))));
  assert.equal(computeEmploymentScore([],partial).status,'PARTIAL');
});

test('the new formula reads as a valid public snapshot only with genuine official CPS absence',()=>{
  const observations=cpsIds.flatMap(id=>fixture(find(id)).map(row=>({...row,
    retrievedAt:'2026-10-31T12:00:00.000Z'})));
  const sourceStoredAt=Date.parse('2026-11-01T00:00:00.000Z');
  const model=buildEmploymentR6OneYearReadModel(observations,{asOfDate:'2026-11-01',sourceStoredAt});
  assert.equal(validEmploymentR6PublicDisplay(model),true);
  assert.equal(model.summary.scoredFeatures,4);
  for(const id of cpsIds){
    const indicator=model.indicators.find(item=>item.id===id);
    assert.equal(indicator.scoreStatus,'READY');
    assert.equal(indicator.officialMissingReferenceDate,'2025-10-31');
  }
  assert.equal(validEmploymentR6PublicDisplay({...model,formulaHash:'sha256:18e18d1025d8c5b1ea9e4aa1bdd33596cfb8b5d5df7e59a6c2629f230be5480d'}),false);
  const corrupted=buildEmploymentR6OneYearReadModel([
    ...observations,
    {logicalSeriesId:'U3_UNEMPLOYMENT_RATE',observationDate:'2025-10-31',value:4.7,
      sourceHash:'manufactured-october-2025',retrievedAt:'2026-10-31T12:00:00.000Z'},
  ],{asOfDate:'2026-11-01',sourceStoredAt});
  assert.equal(corrupted.indicators[0].scoreStatus,'PARTIAL_SOURCE_CONFLICT');
  assert.equal(validEmploymentR6PublicDisplay(corrupted),false);
});

test('rollout reads verified R1 while keeping R2-only writer validation and version labels',async()=>{
  const sourceStoredAt=Date.parse('2026-11-01T00:00:00.000Z');
  const model=buildEmploymentR6OneYearReadModel([],{asOfDate:'2026-11-01',sourceStoredAt});
  const legacy=structuredClone(model);
  legacy.formulaHash='sha256:18e18d1025d8c5b1ea9e4aa1bdd33596cfb8b5d5df7e59a6c2629f230be5480d';
  legacy.methodologyVersion='EMP-R6-FORMULA-R1';
  assert.equal(validEmploymentR6PublicDisplay(legacy),false,'new writer must not accept old hash');
  assert.equal(validEmploymentR6PublicDisplay(legacy,{allowLegacy:true}),true,'GET may serve verified R1');
  const publishedAt=sourceStoredAt+1000;
  const db={prepare:()=>({bind:()=>({first:async()=>({body:JSON.stringify(legacy),stored_at:publishedAt})})})};
  const response=await employmentR6StoredDisplayResponse(new Request('https://zgmini.kr/api/employment-r6/observations'),db,{now:publishedAt+5000});
  assert.equal(response.status,200);
  assert.equal((await response.json()).formulaHash,legacy.formulaHash);
  const mismatched=structuredClone(legacy);
  mismatched.methodologyVersion=model.methodologyVersion;
  assert.equal(validEmploymentR6PublicDisplay(mismatched,{allowLegacy:true}),false);
});
