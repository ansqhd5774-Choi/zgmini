import test from "node:test";
import assert from "node:assert/strict";
import {
  COMPOSITE_MODEL_VERSION,
  DOMAIN_WEIGHTS,
  buildCompositeMarketScore,
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
