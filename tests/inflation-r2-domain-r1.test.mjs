import test from "node:test";
import assert from "node:assert/strict";
import {buildCmR1DomainResults} from "../lib/market-score/domain-adapter-r1.mjs";

test("public inflation uses explicit R2 domain while diagnostic D1 can remain preserved",()=>{
  const domains=buildCmR1DomainResults({
    diagnostics:{inflationStability:{status:"READY",score:11,missing:[]}},
    publicDomains:{inflation:{
      status:"READY",score:77,missingFactors:[],indicators:[{name:"목표안정",status:"READY",score:70}],
      methodologyVersion:"INFLATION_R2_R29_56",freshness:"STORED_INITIAL_RELEASE_HISTORY_ONLY"
    }}
  });
  const inflation=domains.find(x=>x.id==="inflation");
  assert.equal(inflation.status,"READY");
  assert.equal(inflation.score,77);
  assert.equal(inflation.methodologyVersion,"INFLATION_R2_R29_56");
  assert.equal(inflation.indicators[0].name,"목표안정");
});

test("legacy diagnostic remains fallback only when explicit R2 domain is absent",()=>{
  const domains=buildCmR1DomainResults({
    diagnostics:{inflationStability:{status:"READY",score:11,missing:[]}},
  });
  assert.equal(domains.find(x=>x.id==="inflation").score,11);
});
