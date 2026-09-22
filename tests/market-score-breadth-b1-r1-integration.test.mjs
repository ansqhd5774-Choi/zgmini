import test from "node:test";
import assert from "node:assert/strict";

import {buildBreadthB1R1} from "../lib/market-score/breadth-b1-r1.mjs";
import {buildCmR1DomainResults} from "../lib/market-score/domain-adapter-r1.mjs";
import {createMarketScoreR1Handler} from "../worker/market-score-r1.mjs";

const observationDate="2026-09-18";
const previousDate="2026-09-17";

const readyBreadth=()=>buildBreadthB1R1({
  observationDate,
  snapshot:{
    asOfDate:observationDate,
    isDaily:true,
    constituentCount:2,
    unlinkedCount:0,
    source:"Equibles tracking-fund basket fixture",
    members:[
      {ticker:"UP",weight:0.5,isLinked:true},
      {ticker:"DOWN",weight:0.5,isLinked:true},
    ],
  },
  pricePairs:[
    {ticker:"UP",previousDate,currentDate:observationDate,previousClose:100,currentClose:101,currentVolume:10},
    {ticker:"DOWN",previousDate,currentDate:observationDate,previousClose:100,currentClose:99,currentVolume:10},
  ],
});

test("B1-R1 READY enters the existing CM-R1 breadth slot without proxy or reweight",()=>{
  const breadth=readyBreadth();
  assert.equal(breadth.status,"READY");
  const domains=buildCmR1DomainResults({
    diagnostics:{},
    publicDomains:{breadth},
  });
  const out=domains.find(x=>x.id==="breadth");
  assert.equal(out.status,"READY");
  assert.equal(out.score,breadth.score);
});

test("B1-R1 PARTIAL/null stays PARTIAL/null in CM-R1 and never fabricates zero",()=>{
  const partial=buildBreadthB1R1({
    observationDate,
    snapshot:{
      asOfDate:observationDate,
      isDaily:true,
      constituentCount:100,
      unlinkedCount:0,
      source:"fixture",
      members:Array.from({length:100},(_,i)=>({ticker:`T${i}`,weight:1,isLinked:true})),
    },
    pricePairs:Array.from({length:97},(_,i)=>({
      ticker:`T${i}`,previousDate,currentDate:observationDate,
      previousClose:100,currentClose:101,currentVolume:10,
    })),
  });
  assert.equal(partial.status,"PARTIAL");
  assert.equal(partial.score,null);

  const domains=buildCmR1DomainResults({
    diagnostics:{},
    publicDomains:{breadth:partial},
  });
  const out=domains.find(x=>x.id==="breadth");
  assert.equal(out.status,"PARTIAL");
  assert.equal(out.score,null);
});

test("existing public API handler accepts B1 through external.publicDomainScores.breadth",async()=>{
  const breadth=readyBreadth();
  const rows=(n=84,start=100)=>Array.from({length:n},(_,i)=>({
    observationDate:`${2019+Math.floor(i/12)}-${String(i%12+1).padStart(2,"0")}-01`,
    value:start+i,
  }));
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
      publicDomainScores:{breadth},
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
    env:{},collectInputs,orchestrate,
    now:()=>new Date("2026-09-22T00:00:00.000Z"),
  });
  const response=await handler(new Request("https://zgmini.kr/api/market-score"));
  assert.equal(response.status,200);
  const body=await response.json();
  const out=body.domains.find(x=>x.id==="breadth");
  assert.equal(out.status,"READY");
  assert.equal(out.score,breadth.score);
  assert.equal(out.weight,8);
  assert.equal(body.dataQuality.reweighted,false);
});
