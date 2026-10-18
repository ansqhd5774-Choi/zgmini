import test from "node:test";
import assert from "node:assert/strict";
import {
  COMPOSITE_MODEL_VERSION,
  DOMAIN_WEIGHTS,
  buildCompositeMarketScore,
  buildCompositeTrend,
} from "../lib/market-score/composite-model-r1.mjs";

const ids=DOMAIN_WEIGHTS.map(x=>x.id);
const ready=(score=50)=>ids.map(id=>({id,status:"READY",score}));

test("CM-R1 weights are fixed and sum to 100",()=>{
  assert.equal(COMPOSITE_MODEL_VERSION,"CM-R1");
  assert.deepEqual(DOMAIN_WEIGHTS.map(x=>x.weight),[8,7,10,10,8,7,13,10,8,8,5,6]);
  assert.equal(DOMAIN_WEIGHTS.reduce((s,x)=>s+x.weight,0),100);
  assert.equal(new Set(ids).size,12);
});

test("CM-R1 computes Overall only with all 12 READY",()=>{
  const input=DOMAIN_WEIGHTS.map((x,i)=>({id:x.id,status:"READY",score:40+i}));
  const out=buildCompositeMarketScore(input);
  const expected=input.reduce((sum,d)=>{
    const w=DOMAIN_WEIGHTS.find(x=>x.id===d.id).weight;
    return sum+d.score*w;
  },0)/100;
  assert.equal(out.overall.status,"READY");
  assert.equal(out.dataQuality.overallComputable,true);
  assert.equal(out.dataQuality.coverageWeight,100);
  assert.equal(out.dataQuality.reweighted,false);
  assert.ok(Math.abs(out.overall.score-expected)<1e-12);
});

test("CM-R1 never renormalizes missing weight",()=>{
  const input=ready(60);
  input.find(x=>x.id==="earnings").status="PARTIAL";
  input.find(x=>x.id==="earnings").score=null;
  const out=buildCompositeMarketScore(input);
  assert.equal(out.overall.score,null);
  assert.equal(out.overall.status,"PARTIAL");
  assert.equal(out.dataQuality.readyDomains,11);
  assert.equal(out.dataQuality.coverageWeight,87);
  assert.deepEqual(out.dataQuality.partialDomains,["earnings"]);
  assert.equal(out.dataQuality.reweighted,false);
});

test("CM-R1 rejects out-of-contract READY scores from Overall",()=>{
  const input=ready(50);
  input.find(x=>x.id==="credit").score=101;
  const out=buildCompositeMarketScore(input);
  assert.equal(out.overall.score,null);
  assert.equal(out.dataQuality.readyDomains,11);
  assert.equal(out.dataQuality.coverageWeight,90);
});

test("CM-R1 keeps fixed 12-domain order regardless of input order",()=>{
  const input=ready(55).reverse();
  const out=buildCompositeMarketScore(input);
  assert.deepEqual(out.domains.map(x=>x.id),ids);
});


test("CM-R1 reconstructs monthly Overall trend from stored domain histories without reweighting",()=>{
  const input=DOMAIN_WEIGHTS.map((spec,index)=>({
    id:spec.id,
    status:"READY",
    score:60+index/10,
    trend:[
      {label:"2026-07-31",value:40+index},
      {label:"2026-08-31",value:50+index},
      {label:"2026-09-30",value:55+index},
    ],
  }));
  const out=buildCompositeMarketScore(input,{updatedAt:"2026-10-05T12:00:00.000Z"});
  assert.equal(out.overall.status,"READY");
  assert.ok(out.overall.trend.length>=4);
  const september=out.overall.trend.find(point=>point.label==="2026-09-30");
  const expectedSeptember=DOMAIN_WEIGHTS.reduce((sum,spec,index)=>sum+(55+index)*spec.weight,0)/100;
  assert.ok(september);
  assert.ok(Math.abs(september.value-expectedSeptember)<1e-12);
  assert.equal(out.overall.trend.at(-1).label,"2026-10-05");
  assert.equal(out.overall.trend.at(-1).value,out.overall.score);
});

test("CM-R1 composite history never looks ahead and skips incomplete 12-domain anchors",()=>{
  const input=DOMAIN_WEIGHTS.map((spec,index)=>({
    id:spec.id,
    status:"READY",
    score:70,
    trend:[
      {label:"2026-01-31",value:50+index/10},
      {label:"2026-02-28",value:60+index/10},
    ],
  }));
  input.find(x=>x.id==="earnings").trend=[
    {label:"2026-02-15",value:61},
  ];
  const trend=buildCompositeTrend(
    input.map((d,index)=>({...d,weight:DOMAIN_WEIGHTS[index].weight})),
    {asOfDate:"2026-03-15",currentScore:70,points:4},
  );
  assert.equal(trend.some(point=>point.label==="2026-01-31"),false);
  assert.equal(trend.some(point=>point.label==="2026-02-28"),true);
  assert.deepEqual(trend.at(-1),{label:"2026-03-15",value:70});
});

test("CM-R1 composite history stays empty when Overall is not computable",()=>{
  const input=ready(60);
  input.find(x=>x.id==="credit").status="PARTIAL";
  input.find(x=>x.id==="credit").score=null;
  for(const item of input)item.trend=[{label:"2026-09-30",value:60}];
  const out=buildCompositeMarketScore(input,{updatedAt:"2026-10-05T12:00:00Z"});
  assert.equal(out.overall.status,"PARTIAL");
  assert.deepEqual(out.overall.trend,[]);
});


test("CM-R1 keeps real intra-month composite changes instead of collapsing to month-end only",()=>{
  const input=DOMAIN_WEIGHTS.map((spec,index)=>({
    id:spec.id,
    status:"READY",
    score:60,
    trend:[
      {label:"2026-09-20",value:40+index},
      {label:"2026-09-24",value:45+index},
      {label:"2026-09-28",value:50+index},
      {label:"2026-10-02",value:55+index},
    ],
  }));
  const out=buildCompositeMarketScore(input,{updatedAt:"2026-10-05T12:00:00.000Z"});
  assert.deepEqual(out.overall.trend.map(point=>point.label),[
    "2026-09-20",
    "2026-09-24",
    "2026-09-28",
    "2026-10-02",
    "2026-10-05",
  ]);
  assert.equal(out.overall.trend.at(-1).value,out.overall.score);
});

test("CM-R1 union-date history still skips dates until all 12 domains have a prior score",()=>{
  const input=DOMAIN_WEIGHTS.map((spec,index)=>({
    id:spec.id,
    status:"READY",
    score:70,
    trend:[
      {label:"2026-09-20",value:40+index},
      {label:"2026-09-24",value:50+index},
    ],
  }));
  input.find(x=>x.id==="liquidity").trend=[
    {label:"2026-09-23",value:60},
    {label:"2026-09-24",value:62},
  ];
  const trend=buildCompositeTrend(input,{asOfDate:"2026-09-25",currentScore:70,points:370});
  assert.equal(trend.some(point=>point.label==="2026-09-20"),false);
  assert.equal(trend.some(point=>point.label==="2026-09-23"),true);
  assert.equal(trend.some(point=>point.label==="2026-09-24"),true);
  assert.deepEqual(trend.at(-1),{label:"2026-09-25",value:70});
});

test("CM-R1 preserves only the E1-R5 issuer count without changing scores or domain weights",()=>{
 const input=ready(60);
 const earnings=input.find(x=>x.id==="earnings");
 earnings.score=73.51207667731629;
 earnings.methodologyVersion="E1-R5";
 earnings.issuerCount=500;
 const out=buildCompositeMarketScore(input);
 assert.equal(out.domains.find(x=>x.id==="earnings").issuerCount,500);
 assert.equal(out.domains.find(x=>x.id==="earnings").score,earnings.score);
 assert.equal(out.domains.find(x=>x.id==="earnings").weight,13);
 assert.equal(out.domains.find(x=>x.id==="earnings").quality,undefined);
 const without=ready(60);
 assert.equal(Object.hasOwn(buildCompositeMarketScore(without).domains.find(x=>x.id==="earnings"),"issuerCount"),false);
});
