import test from "node:test";
import assert from "node:assert/strict";
import {createMarketScoreR1Handler} from "../worker/market-score-r1.mjs";

const rows=(n=84,start=100)=>Array.from({length:n},(_,i)=>({
  observationDate:`${2019+Math.floor(i/12)}-${String(i%12+1).padStart(2,"0")}-01`,
  value:start+i,
}));
const mrow=(date,extra)=>({observationDate:date,...extra});

test("public runtime uses stored C1-R3 instead of legacy live PCE/Retail",async()=>{
  const diagnostics={
    inflationStability:{status:"READY",score:60,missing:[]},
    recessionDefense:{status:"READY",score:58,missing:[]},
    creditRiskDefense:{status:"READY",score:55,missing:[]},
    earningsRecessionDefense:{status:"READY",score:62,missing:[]},
    liquidityCrisisDefense:{status:"READY",score:57,missing:[]},
  };
  const collectInputs=async()=>({
    series:{
      UNRATE:rows(84,4).map((x,i)=>({...x,value:4+(i%5)*.1})),
      PAYEMS:rows(84,150000),
      DGS10:rows(320,3.5),
      DTWEXBGS:rows(320,100),
    },
    external:{
      registeredFundFlowRows:rows(24,.2),
      publicDomainScores:{
        consumption:{status:"READY",score:1},
        commodities:{status:"READY",score:1},
      },
    },
  });
  const orchestrate=()=>({
    historyMode:"CURRENT_VINTAGE_ONLY",
    lookAheadSafe:false,
    snapshot:{diagnostics},
    artifacts:{
      recession:{rows:[mrow("2026-08-01",{realPceScore:1,retailSalesScore:1})]},
      supply:{rows:[mrow("2026-08-01",{oilScore:20,gasolineScore:40,copperScore:60})]},
    },
    limitations:{},
  });
  let storedCalls=0;
  const h=createMarketScoreR1Handler({
    env:{},
    collectInputs,
    orchestrate,
    loadConsumptionDomain:async()=>{
      storedCalls++;
      return {
        status:"READY",
        score:70,
        missingFactors:[],
        indicators:[],
        trend:[],
        freshness:"STORED_CALCULATION_HISTORY_ONLY",
        updatedAt:"2026-06-30",
        methodologyVersion:"R3.45P",
        interpretation:"test stored C1-R3",
      };
    },
    collectBreadthDomain:async()=>({
      status:"UNAVAILABLE",
      score:null,
      missingFactors:["TEST_BREADTH_UNAVAILABLE"],
      indicators:[],
      trend:[],
      freshness:"TEST_ONLY",
      updatedAt:null,
    }),
    now:()=>new Date("2026-09-22T00:00:00.000Z"),
  });
  const res=await h(new Request("https://zgmini.kr/api/market-score"));
  assert.equal(res.status,200);
  const body=await res.json();
  const c=body.domains.find(x=>x.id==="consumption");
  assert.equal(storedCalls,1);
  assert.equal(c.status,"READY");
  assert.equal(c.score,70);
  assert.notEqual(c.score,1);
});
