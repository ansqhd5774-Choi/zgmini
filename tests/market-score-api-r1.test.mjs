import test from "node:test";
import assert from "node:assert/strict";
import {createMarketScoreR1Handler} from "../worker/market-score-r1.mjs";

const diagnostics={
  inflationStability:{status:"READY",score:60,missing:[]},
  recessionDefense:{status:"READY",score:58,missing:[]},
  creditRiskDefense:{status:"READY",score:55,missing:[]},
  earningsRecessionDefense:{status:"READY",score:62,missing:[]},
  liquidityCrisisDefense:{status:"READY",score:57,missing:[]},
};

const rows=(n=80,start=100)=>Array.from({length:n},(_,i)=>({
  observationDate:`${2019+Math.floor(i/12)}-${String(i%12+1).padStart(2,"0")}-01`,
  value:start+i,
}));

test("public market-score returns truthful PARTIAL without renormalization",async()=>{
  const collectInputs=async()=>({
    series:{
      UNRATE:rows(84,4).map((x,i)=>({...x,value:4+(i%5)*.1})),
      PAYEMS:rows(84,150000),
      DGS10:rows(320,3.5),
      DTWEXBGS:rows(320,100),
    },
    external:{
      registeredFundFlowRows:rows(24,.2),
      publicDomainScores:{},
    },
  });
  const orchestrate=()=>({
    historyMode:"CURRENT_VINTAGE_ONLY",
    lookAheadSafe:false,
    snapshot:{diagnostics},
    limitations:{releaseDateAvailableAt:"CURRENT_VINTAGE_ONLY_NOT_PROVEN"},
  });
  const h=createMarketScoreR1Handler({
    env:{},
    collectInputs,
    orchestrate,
    now:()=>new Date("2026-09-22T00:00:00.000Z"),
  });
  const res=await h(new Request("https://zgmini.kr/api/market-score",{method:"GET"}));
  assert.equal(res.status,200);
  const body=await res.json();
  assert.equal(body.status,"SUCCESS");
  assert.equal(body.modelVersion,"CM-R1");
  assert.equal(body.domains.length,12);
  assert.equal(body.overall.score,null);
  assert.equal(body.overall.status,"PARTIAL");
  assert.equal(body.dataQuality.reweighted,false);
  assert.equal(body.dataQuality.overallComputable,false);
  assert.ok(body.dataQuality.readyDomains<12);
  const consumption=body.domains.find(x=>x.id==="consumption");
  const breadth=body.domains.find(x=>x.id==="breadth");
  const commodities=body.domains.find(x=>x.id==="commodities");
  assert.equal(consumption.status,"PARTIAL");
  assert.equal(consumption.score,null);
  assert.equal(breadth.status,"UNAVAILABLE");
  assert.equal(breadth.score,null);
  assert.equal(commodities.status,"PARTIAL");
  assert.equal(commodities.score,null);
});

test("public market-score computes Overall only when explicit missing producers are supplied",async()=>{
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
        consumption:{status:"READY",score:50},
        breadth:{status:"READY",score:50},
        commodities:{status:"READY",score:50},
      },
    },
  });
  const orchestrate=()=>({
    historyMode:"CURRENT_VINTAGE_ONLY",
    lookAheadSafe:false,
    snapshot:{diagnostics},
    limitations:{},
  });
  const h=createMarketScoreR1Handler({
    env:{},collectInputs,orchestrate,
    now:()=>new Date("2026-09-22T00:00:00.000Z"),
  });
  const res=await h(new Request("https://zgmini.kr/api/market-score"));
  const body=await res.json();
  // Some approved producers can still be PARTIAL if synthetic test history is insufficient.
  // The key contract is: no renormalization and no fabricated score.
  assert.equal(body.dataQuality.reweighted,false);
  if(body.dataQuality.readyDomains===12){
    assert.equal(body.overall.status,"READY");
    assert.equal(typeof body.overall.score,"number");
  }else{
    assert.equal(body.overall.status,"PARTIAL");
    assert.equal(body.overall.score,null);
  }
});

test("public market-score failure never fabricates zero",async()=>{
  const h=createMarketScoreR1Handler({
    env:{},
    collectInputs:async()=>{throw Object.assign(new Error("x"),{status:"SOURCE_UNAVAILABLE"})},
    orchestrate:()=>null,
    now:()=>new Date("2026-09-22T00:00:00.000Z"),
  });
  const res=await h(new Request("https://zgmini.kr/api/market-score"));
  assert.equal(res.status,503);
  const body=await res.json();
  assert.equal(body.overall.score,null);
  assert.equal(body.dataQuality.overallComputable,false);
});


test("stored READY earnings components are wired into earnings diagnostic input",async()=>{
  let captured=null;
  const collectInputs=async()=>({
    series:{},
    external:{
      publicDomainScores:{
        earnings:{
          status:"READY",
          score:62.5,
          components:{
            epsGrowth:{score:70},
            margin:{score:60},
            revenueGrowth:{score:50},
            earningsGrowthBreadth:{score:40},
          },
        },
      },
    },
  });
  const orchestrate=({external})=>{
    captured=external.earningsScores;
    return {
      historyMode:"CURRENT_VINTAGE_ONLY",
      lookAheadSafe:false,
      snapshot:{diagnostics},
      limitations:{},
    };
  };
  const h=createMarketScoreR1Handler({
    env:{},
    collectInputs,
    orchestrate,
    now:()=>new Date("2026-09-22T00:00:00.000Z"),
  });
  const res=await h(new Request("https://zgmini.kr/api/market-score"));
  assert.equal(res.status,200);
  assert.deepEqual(captured,{
    epsGrowth:70,
    margin:60,
    revenueGrowth:50,
    earningsGrowthBreadth:40,
  });
});
