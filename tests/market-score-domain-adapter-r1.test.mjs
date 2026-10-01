import test from "node:test";
import assert from "node:assert/strict";
import {buildCmR1DomainResults} from "../lib/market-score/domain-adapter-r1.mjs";

const ready=score=>({status:"READY",score,missing:[]});

test("CM-R1 adapter keeps fixed 12-domain order and no proxy substitution",()=>{
  const out=buildCmR1DomainResults({
    diagnostics:{
      inflationStability:ready(60),
      creditRiskDefense:ready(55),
      recessionDefense:ready(58),
      earningsRecessionDefense:ready(62),
      liquidityCrisisDefense:ready(57),
      supplyShockSafety:ready(99),
    },
    employment:{status:"READY",current:{score:61},chart:[]},
    rates:{status:"READY",score:54},
    fundFlows:{status:"READY",score:53},
    dollarFx:{status:"READY",score:52,rows:[]},
  });
  assert.deepEqual(out.map(x=>x.id),[
    "inflation","employment","rates","credit","growth","consumption",
    "earnings","liquidity","fundFlows","breadth","dollarFx","commodities"
  ]);
  assert.equal(out.find(x=>x.id==="consumption").status,"UNAVAILABLE");
  assert.equal(out.find(x=>x.id==="breadth").status,"UNAVAILABLE");
  assert.equal(out.find(x=>x.id==="commodities").status,"UNAVAILABLE");
  assert.notEqual(out.find(x=>x.id==="commodities").score,99);
});

test("CM-R1 adapter accepts only explicit approved public-domain inputs for unresolved domains",()=>{
  const out=buildCmR1DomainResults({
    publicDomains:{
      consumption:{status:"READY",score:51},
      breadth:{status:"READY",score:49},
      commodities:{status:"READY",score:47},
    },
  });
  assert.equal(out.find(x=>x.id==="consumption").score,51);
  assert.equal(out.find(x=>x.id==="breadth").score,49);
  assert.equal(out.find(x=>x.id==="commodities").score,47);
});


test("Employment R54 explicit score, indicators and native trend are preserved",()=>{
  const employment={
    status:"READY",
    score:72,
    methodologyVersion:"EMPLOYMENT_R54_STORED_4FACTOR_R1",
    asOfDate:"2026-10-01",
    indicators:[
      {id:"employment-41",name:"실업률",status:"READY",score:70,value:4.2,unit:"%"},
      {id:"employment-42",name:"비농업고용 3M 평균 증감",status:"READY",score:75,value:145,unit:"천명/월"},
      {id:"employment-43",name:"신규 실업수당 4W 평균",status:"READY",score:68,value:220000,unit:"건"},
      {id:"employment-44",name:"주 실업수당 개선 비율",status:"READY",score:80,value:80,unit:"%"},
    ],
    trend:[
      {label:"2026-07-01",value:70},
      {label:"2026-08-01",value:72},
    ],
  };
  const domain=buildCmR1DomainResults({employment}).find(x=>x.id==="employment");
  assert.equal(domain.score,72);
  assert.equal(domain.methodologyVersion,"EMPLOYMENT_R54_STORED_4FACTOR_R1");
  assert.deepEqual(domain.indicators.map(x=>x.id),["employment-41","employment-42","employment-43","employment-44"]);
  assert.deepEqual(domain.trend,[{label:"2026-07-01",value:70},{label:"2026-08-01",value:72}]);
});

test("Employment R54 PARTIAL never falls back to legacy current score",()=>{
  const domain=buildCmR1DomainResults({employment:{
    status:"PARTIAL",
    score:null,
    methodologyVersion:"EMPLOYMENT_R54_STORED_4FACTOR_R1",
    missingFactors:["employment-43"],
    trend:[],
  }}).find(x=>x.id==="employment");
  assert.equal(domain.status,"PARTIAL");
  assert.equal(domain.score,null);
  assert.deepEqual(domain.missingFactors,["employment-43"]);
});
