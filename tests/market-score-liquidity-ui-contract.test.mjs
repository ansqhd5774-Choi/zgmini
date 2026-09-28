import test from "node:test";
import assert from "node:assert/strict";
import {buildCmR1DomainResults} from "../lib/market-score/domain-adapter-r1.mjs";

test("liquidity public contract carries indicators and trend instead of diagnostic score-only projection",()=>{
  const indicators=[
    {name:"은행 준비금",status:"READY",score:61},
    {name:"M2 증가율",status:"READY",score:52},
    {name:"TGA 변화",status:"READY",score:48},
    {name:"ON RRP 변화",status:"READY",score:64},
  ];
  const trend=[{label:"2026-09-20",value:58},{label:"2026-09-28",value:61}];
  const domains=buildCmR1DomainResults({
    diagnostics:{liquidityCrisisDefense:{status:"READY",score:99,missing:[]}},
    publicDomains:{
      liquidity:{
        status:"READY",score:61,indicators,trend,
        methodologyVersion:"DIAGNOSTIC_SCORE_TRANSFORM_R1",
      },
    },
  });
  const liq=domains.find(x=>x.id==="liquidity");
  assert.equal(liq.score,61);
  assert.deepEqual(liq.indicators,indicators);
  assert.deepEqual(liq.trend,trend);
  assert.equal(liq.methodologyVersion,"DIAGNOSTIC_SCORE_TRANSFORM_R1");
});
