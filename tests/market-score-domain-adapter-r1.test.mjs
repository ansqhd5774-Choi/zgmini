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
