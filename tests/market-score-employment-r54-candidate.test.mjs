import test from "node:test";
import assert from "node:assert/strict";
import {
  buildEmploymentR54Candidate,
  EMPLOYMENT_R54_METHOD,
  EMPLOYMENT_R54_WEIGHTS,
  EMPLOYMENT_R54_CLAIMS_READ_WEEKS,
  loadEmploymentR54CandidateFromStored,
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
  assert.ok(out.trend.length>0);
  assert.ok(out.trend.every(x=>typeof x.value==="number"&&x.value>=0&&x.value<=100));
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


test("R54 compact claim aggregates preserve raw calculation",async()=>{
  const unemployment=monthRows(2016,130,6,()=>-0.01);
  const payroll=monthRows(2016,130,140000,()=>150);
  const raw=claimRows("2025-01-04",60);
  const rawOut=buildEmploymentR54Candidate({
    unemploymentRows:unemployment,
    payrollLevelRows:payroll,
    shadowRows:raw,
    asOfDate:"2026-12-31",
  });

  const byDate=new Map();
  const byState=new Map();
  for(const row of raw){
    const d=byDate.get(row.observationDate)??[];
    d.push(row.value);byDate.set(row.observationDate,d);
    const s=byState.get(row.geographyCode)??[];
    s.push({observationDate:row.observationDate,value:row.value});byState.set(row.geographyCode,s);
  }
  const weekly=[...byDate].map(([observationDate,values])=>({
    observation_date:observationDate,value:values.reduce((a,b)=>a+b,0),
  })).sort((a,b)=>a.observation_date.localeCompare(b.observation_date));

  const state4w=new Map();
  for(const [state,rows] of byState){
    rows.sort((a,b)=>a.observationDate.localeCompare(b.observationDate));
    for(let i=3;i<rows.length;i++){
      const avg=rows.slice(i-3,i+1).reduce((sum,x)=>sum+x.value,0)/4;
      const bucket=state4w.get(rows[i].observationDate)??new Map();
      bucket.set(state,avg);state4w.set(rows[i].observationDate,bucket);
    }
  }
  const dates=[...state4w.keys()].sort();
  const breadth=[];
  for(let i=4;i<dates.length;i++){
    const cur=state4w.get(dates[i]),prior=state4w.get(dates[i-4]);
    let eligible=0,improved=0;
    for(const [state,value] of cur){const p=prior.get(state);if(p==null)continue;eligible++;if(value<=p)improved++;}
    if(eligible>=51)breadth.push({observation_date:dates[i],value:100*improved/eligible});
  }

  const compactOut=buildEmploymentR54Candidate({
    unemploymentRows:unemployment,
    payrollLevelRows:payroll,
    claimsWeeklyTotalRows:weekly,
    claimsBreadthScoreRows:breadth,
    asOfDate:"2026-12-31",
  });
  assert.equal(compactOut.status,"READY");
  assert.ok(Math.abs(compactOut.score-rawOut.score)<1e-9);
  assert.deepEqual(compactOut.indicators.map(x=>[x.id,x.score,x.value]),rawOut.indicators.map(x=>[x.id,x.score,x.value]));
});


test("R54 stored reader loads 108 claim weeks so 1Y trend is not truncated",async()=>{
  assert.equal(EMPLOYMENT_R54_CLAIMS_READ_WEEKS,108);
  const sql=[];
  const db={
    prepare(statement){
      sql.push(statement);
      return {
        bind(){return this},
        async all(){return {results:[]}},
      };
    },
  };
  const out=await loadEmploymentR54CandidateFromStored(db,{asOfDate:"2026-10-07"});
  assert.equal(out.status,"PARTIAL");
  assert.equal(sql.length,2);
  assert.ok(sql.every(statement=>statement.includes("LIMIT 108")));
});
