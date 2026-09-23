import test from "node:test";
import assert from "node:assert/strict";

import {buildCmR1DomainResults} from "../lib/market-score/domain-adapter-r1.mjs";
import {createMarketScoreR1Handler} from "../worker/market-score-r1.mjs";
import {collectEarningsE1R2PublicDomain} from "../lib/market-score/sec-earnings-e1-r2-provider.mjs";

test("E1-R2 PARTIAL parser failure preserves upstream methodology through public response",async()=>{
  const earnings=await collectEarningsE1R2PublicDomain({
    asOf:"2026-09-23",
    fetchImpl:async()=>Response.json({parse:{text:"<table></table>"}}),
  });
  assert.equal(earnings.methodologyVersion,"E1-R2");
  assert.equal(earnings.status,"PARTIAL");
  assert.equal(earnings.score,null);
  assert.deepEqual(earnings.missing,["WIKIPEDIA_UNIVERSE_PARSE_FAILED"]);
  const adapted=buildCmR1DomainResults({publicDomains:{earnings}}).find(x=>x.id==="earnings");
  assert.equal(adapted.methodologyVersion,earnings.methodologyVersion);
  const handler=createMarketScoreR1Handler({
    env:{},now:()=>new Date("2026-09-23T00:00:00Z"),
    collectInputs:async()=>({series:{},external:{publicDomainScores:{earnings}}}),
    orchestrate:()=>({snapshot:{diagnostics:{}},artifacts:{}}),
  });
  const response=await handler(new Request("https://zgmini.kr/api/market-score"));
  assert.equal(response.status,200);
  const body=await response.json();
  const out=body.domains.find(x=>x.id==="earnings");
  assert.equal(out.methodologyVersion,earnings.methodologyVersion);
  assert.equal(out.status,"PARTIAL");
  assert.equal(out.score,null);
  assert.deepEqual(out.missingFactors,earnings.missing);
  assert.equal(body.dataQuality.reweighted,false);
});

const readyEarnings = {
  id:"earnings",
  status:"READY",
  score:77,
  methodologyVersion:"E1-R1",
  source:"Equibles",
  missing:[],
};

const partialEarnings = {
  id:"earnings",
  status:"PARTIAL",
  score:null,
  methodologyVersion:"E1-R1",
  source:"Equibles",
  missing:["EQUIBLES_PRO_ENTITLEMENT_NOT_PROVEN"],
};

test("E1-R1 public earnings explicitly overrides diagnostic earnings in CM-R1",()=>{
  const domains=buildCmR1DomainResults({
    diagnostics:{
      earningsRecessionDefense:{status:"READY",score:12,missing:[]},
    },
    publicDomains:{earnings:readyEarnings},
  });
  const out=domains.find(x=>x.id==="earnings");
  assert.equal(out.status,"READY");
  assert.equal(out.score,77);
});

test("E1-R1 PARTIAL/null never falls back to diagnostic earnings",()=>{
  const domains=buildCmR1DomainResults({
    diagnostics:{
      earningsRecessionDefense:{status:"READY",score:88,missing:[]},
    },
    publicDomains:{earnings:partialEarnings},
  });
  const out=domains.find(x=>x.id==="earnings");
  assert.equal(out.status,"PARTIAL");
  assert.equal(out.score,null);
});

test("public /api/market-score consumes external.publicDomainScores.earnings and applies CM-R1 weight",async()=>{
  const rows=(n=84,start=100)=>Array.from({length:n},(_,i)=>({
    observationDate:`${2019+Math.floor(i/12)}-${String(i%12+1).padStart(2,"0")}-01`,
    value:start+i,
  }));

  const diagnostics={
    inflationStability:{status:"READY",score:60,missing:[]},
    recessionDefense:{status:"READY",score:58,missing:[]},
    creditRiskDefense:{status:"READY",score:55,missing:[]},
    earningsRecessionDefense:{status:"READY",score:11,missing:[]},
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
        earnings:readyEarnings,
        breadth:{id:"breadth",status:"PARTIAL",score:null,missing:["fixture"]},
      },
    },
  });

  const orchestrate=()=>({
    historyMode:"CURRENT_VINTAGE_ONLY",
    lookAheadSafe:false,
    snapshot:{diagnostics},
    artifacts:{
      recession:{rows:[{observationDate:"2026-08-01",realPceScore:80,retailSalesScore:60}]},
      supply:{rows:[{observationDate:"2026-08-01",oilScore:20,gasolineScore:40,copperScore:60}]},
    },
    limitations:{},
  });

  const handler=createMarketScoreR1Handler({
    env:{},
    collectInputs,
    orchestrate,
    now:()=>new Date("2026-09-23T00:00:00.000Z"),
  });

  const response=await handler(new Request("https://zgmini.kr/api/market-score"));
  assert.equal(response.status,200);
  const body=await response.json();

  const out=body.domains.find(x=>x.id==="earnings");
  assert.equal(out.status,"READY");
  assert.equal(out.score,77);
  assert.equal(out.weight,13);
  assert.equal(body.dataQuality.reweighted,false);
});
