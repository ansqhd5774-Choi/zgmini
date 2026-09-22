import test from "node:test";
import assert from "node:assert/strict";
import {buildCmR1DomainResults} from "../lib/market-score/domain-adapter-r1.mjs";
const domain=breadth=>buildCmR1DomainResults({publicDomains:{breadth}}).find(d=>d.id==="breadth");
test("B1 READY does not fabricate four normalized factors",()=>{
  const d=domain({status:"READY",score:65,components:{advanceRatio:.625,advanceValueShare:.6875}});
  assert.equal(d.score,65);
  assert.equal(d.indicators.length,4);
  assert.equal(d.indicators[1].value,62.5);
  assert.equal(d.indicators[1].unit,"%");
  for(const item of d.indicators) assert.equal(item.score,null);
  for(const i of [0,2,3]){assert.equal(d.indicators[i].value,null);assert.equal(d.indicators[i].status,"PARTIAL");}
});
test("unverified or invalid A/D ratio never leaks a numeric detail",()=>{
  for(const input of [null,{status:"PARTIAL",components:{advanceRatio:.8}},...[-1,2,NaN,null,".5"].map(advanceRatio=>({status:"READY",components:{advanceRatio}}))]) {
    const d=domain(input);
    assert.equal(d.indicators[1].value,null);
    assert.equal(d.indicators[1].status,"PARTIAL");
  }
});
test("zero advance ratio is a valid raw observation, not missing",()=>{
  assert.equal(domain({status:"READY",score:0,components:{advanceRatio:0}}).indicators[1].value,0);
});
