import test from "node:test";
import assert from "node:assert/strict";
import {
  buildLiquidityActivePublicDomainR1,
  selectLiquidityPublicDomainR1,
  LIQUIDITY_ACTIVE_UI_SEED_R1,
} from "../lib/market-score/liquidity-active-public-domain-r1.mjs";

test("active liquidity public domain exposes exact four UI component scores and real trend",()=>{
  const diagnostic={
    snapshot:{
      diagnostics:{
        liquidityCrisisDefense:{status:"READY",score:61,missing:[]},
      },
      r1:{
        latest:{
          bankReserves:{observationDate:"2026-09-23",value:62},
          m2:{observationDate:"2026-08-01",value:55},
          tga:{observationDate:"2026-09-23",value:47},
          onRrp:{observationDate:"2026-09-26",value:71},
        },
      },
    },
  };
  const out=buildLiquidityActivePublicDomainR1({
    diagnostic,
    storedTrend:[{label:"2026-09-25",value:59}],
    asOfDate:"2026-09-28",
  });
  assert.equal(out.status,"READY");
  assert.equal(out.score,61);
  assert.deepEqual(out.indicators.map(x=>x.name),["은행 준비금","M2 증가율","TGA 변화","ON RRP 변화"]);
  assert.deepEqual(out.indicators.map(x=>x.score),[62,55,47,71]);
  assert.equal(out.trend.at(-1).label,"2026-09-28");
  assert.equal(out.trend.at(-1).value,61);
  assert.ok(out.trend.length>=LIQUIDITY_ACTIVE_UI_SEED_R1.length+2);
});


test("partial detailed liquidity is exposed when no explicit public producer exists",()=>{
  const detailed={status:"PARTIAL",score:null,missingFactors:["bondVolatility"],indicators:[{name:"은행 준비금",score:61}],trend:[{label:"2026-09-20",value:58.7}]};
  assert.equal(selectLiquidityPublicDomainR1(undefined,detailed),detailed);
});

test("existing explicit liquidity is preserved while detailed D3 is partial",()=>{
  const existing={status:"READY",score:49,indicators:[],trend:[]};
  const detailed={status:"PARTIAL",score:null,indicators:[{name:"은행 준비금",score:61}],trend:[{label:"2026-09-20",value:58.7}]};
  assert.equal(selectLiquidityPublicDomainR1(existing,detailed),existing);
});

test("READY detailed D3 remains authoritative over an explicit public fallback",()=>{
  const existing={status:"READY",score:49};
  const detailed={status:"READY",score:61,indicators:[],trend:[]};
  assert.equal(selectLiquidityPublicDomainR1(existing,detailed),detailed);
});
