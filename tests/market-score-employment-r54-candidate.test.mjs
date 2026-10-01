import test from "node:test";
import assert from "node:assert/strict";
import {
  buildEmploymentR54Candidate,
  EMPLOYMENT_R54_METHOD,
  EMPLOYMENT_R54_WEIGHTS,
} from "../lib/market-score/employment-r54-candidate.mjs";

function monthRows(startYear,count,startValue,stepFn){
  const rows=[];
  let value=startValue;
  for(let i=0;i<count;i++){
    const d=new Date(Date.UTC(startYear,i,1));
    value+=stepFn(i);
    rows.push({observationDate:d.toISOString().slice(0,10),value});
  }
  return rows;
}
function claimRows(start,count){
  const rows=[];
  for(let w=0;w<count;w++){
    const date=new Date(Date.UTC(2025,0,4+w*7)).toISOString().slice(0,10);
    for(let s=0;s<51;s++)rows.push({
      logicalSeriesId:"STATE_INITIAL_CLAIMS",
      geographyCode:"S"+String(s).padStart(2,"0"),
      observationDate:date,
      value:1000+w*2+s,
    });
  }
  return rows;
}
test("R54 candidate uses four stored employment factors without reweighting",()=>{
  const unemployment=monthRows(2016,130,6,()=>-0.01);
  const payroll=monthRows(2016,130,140000,()=>150);
  const shadow=claimRows("2025-01-04",60);
  const out=buildEmploymentR54Candidate({
    unemploymentRows:unemployment,
    payrollLevelRows:payroll,
    shadowRows:shadow,
    asOfDate:"2026-12-31",
  });
  assert.equal(out.methodologyVersion,EMPLOYMENT_R54_METHOD);
  assert.equal(out.status,"READY");
  assert.equal(out.indicators.length,4);
  assert.deepEqual(out.indicators.map(x=>x.id),["employment-41","employment-42","employment-43","employment-44"]);
  assert.deepEqual(out.indicators.map(x=>x.name),["실업률","비농업고용 3M 평균 증감","신규 실업수당 4W 평균","주 실업수당 개선 비율"]);
  assert.ok(out.indicators.every(x=>x.status==="READY"));
  const weighted=
    EMPLOYMENT_R54_WEIGHTS.unemployment*out.indicators[0].score+
    EMPLOYMENT_R54_WEIGHTS.payrollMomentum*out.indicators[1].score+
    EMPLOYMENT_R54_WEIGHTS.claims4w*out.indicators[2].score+
    EMPLOYMENT_R54_WEIGHTS.claimsBreadth*out.indicators[3].score;
  assert.ok(Math.abs(out.score-weighted)<1e-9);
});

test("R54 candidate returns PARTIAL when a factor is missing and never renormalizes",()=>{
  const unemployment=monthRows(2016,130,6,()=>-0.01);
  const payroll=monthRows(2016,130,140000,()=>150);
  const out=buildEmploymentR54Candidate({
    unemploymentRows:unemployment,
    payrollLevelRows:payroll,
    shadowRows:[],
    asOfDate:"2026-12-31",
  });
  assert.equal(out.status,"PARTIAL");
  assert.equal(out.score,null);
  assert.ok(out.missingFactors.includes("employment-43"));
  assert.ok(out.missingFactors.includes("employment-44"));
});

test("R54 candidate keeps explicit 30/30/20/20 weights",()=>{
  assert.deepEqual(EMPLOYMENT_R54_WEIGHTS,{
    unemployment:0.30,
    payrollMomentum:0.30,
    claims4w:0.20,
    claimsBreadth:0.20,
  });
  assert.equal(Object.values(EMPLOYMENT_R54_WEIGHTS).reduce((a,b)=>a+b,0),1);
});
