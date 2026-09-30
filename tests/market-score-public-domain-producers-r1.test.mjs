import test from "node:test";
import assert from "node:assert/strict";

import {
  buildConsumptionC1,
  buildCommoditiesK1,
} from "../lib/market-score/public-domain-producers-r1.mjs";
import {buildCommoditiesK1R2} from "../lib/market-score/public-domain-producers-r2.mjs";
import {createMarketScoreR1Handler} from "../worker/market-score-r1.mjs";

const mrow=(date,extra)=>({observationDate:date,...extra});
const rows=(n=84,start=100)=>Array.from({length:n},(_,i)=>({
  observationDate:`${2019+Math.floor(i/12)}-${String(i%12+1).padStart(2,"0")}-01`,
  value:start+i,
}));

test("C1 uses independent latest-at-or-before component scores and exact 50/50 weights",()=>{
  const out=buildConsumptionC1({
    asOfDate:"2026-09-22",
    recessionRows:[
      mrow("2026-07-01",{realPceScore:60,retailSalesScore:40}),
      mrow("2026-08-01",{realPceScore:80,retailSalesScore:null}),
    ],
  });
  assert.equal(out.status,"READY");
  assert.equal(out.score,60);
  assert.deepEqual(out.missingFactors,[]);
});

test("C1 is PARTIAL/null when either approved component is unavailable",()=>{
  const out=buildConsumptionC1({
    asOfDate:"2026-09-22",
    recessionRows:[mrow("2026-08-01",{realPceScore:80,retailSalesScore:null})],
  });
  assert.equal(out.status,"PARTIAL");
  assert.equal(out.score,null);
  assert.deepEqual(out.missingFactors,["RETAIL_SALES_SCORE_MISSING"]);
});

test("K1 uses exact 50/25/25 weights on one latest supply row",()=>{
  const out=buildCommoditiesK1({
    asOfDate:"2026-09-22",
    supplyRows:[
      mrow("2026-07-01",{oilScore:10,gasolineScore:20,copperScore:30}),
      mrow("2026-08-01",{oilScore:20,gasolineScore:40,copperScore:60}),
    ],
  });
  assert.equal(out.status,"READY");
  assert.equal(out.score,35);
  assert.deepEqual(out.missingFactors,[]);
});

test("K1 is PARTIAL/null with no renormalization when any factor is missing",()=>{
  const out=buildCommoditiesK1({
    asOfDate:"2026-09-22",
    supplyRows:[mrow("2026-08-01",{oilScore:20,gasolineScore:40,copperScore:null})],
  });
  assert.equal(out.status,"PARTIAL");
  assert.equal(out.score,null);
  assert.deepEqual(out.missingFactors,["COPPER_SCORE_MISSING"]);
});

test("public API wires approved C1 and active K1-R2 internally while B1 remains unavailable",async()=>{
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
      MCOILWTICO:rows(92,70),
      MCOILBRENTEU:rows(92,75),
      GASREGCOVM:rows(93,2.5),
    },
    external:{
      registeredFundFlowRows:rows(24,.2),
      copperRows:rows(92,7000),
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
      recession:{rows:[
        mrow("2026-08-01",{realPceScore:80,retailSalesScore:60}),
      ]},
      supply:{rows:[
        mrow("2026-08-01",{oilScore:20,gasolineScore:40,copperScore:60}),
      ]},
    },
    limitations:{},
  });

  const h=createMarketScoreR1Handler({
    env:{},collectInputs,orchestrate,
    now:()=>new Date("2026-09-22T00:00:00.000Z"),
  });
  const res=await h(new Request("https://zgmini.kr/api/market-score"));
  assert.equal(res.status,200);
  const body=await res.json();

  const consumption=body.domains.find(x=>x.id==="consumption");
  const breadth=body.domains.find(x=>x.id==="breadth");
  const commodities=body.domains.find(x=>x.id==="commodities");

  assert.equal(consumption.status,"READY");
  assert.equal(consumption.score,70);

  const expectedK1=buildCommoditiesK1R2({
    wtiRows:rows(92,70),brentRows:rows(92,75),copperRows:rows(92,7000),gasolineRows:rows(93,2.5),
    asOfDate:"2026-09-22",
  });
  assert.equal(commodities.status,"READY");
  assert.equal(commodities.score,expectedK1.score);
  assert.equal(commodities.indicators.length,4);

  assert.equal(breadth.status,"UNAVAILABLE");
  assert.equal(breadth.score,null);
  assert.equal(body.dataQuality.reweighted,false);
});


test("K1 history uses same-row component scores, sorted dates, and excludes future rows",()=>{
  const out=buildCommoditiesK1({asOfDate:"2026-09-22",supplyRows:[
    mrow("2026-09-01",{oilScore:20,gasolineScore:40,copperScore:60,score:99}),
    mrow("2026-08-01",{oilScore:0,gasolineScore:0,copperScore:0,score:99}),
    mrow("2026-10-01",{oilScore:100,gasolineScore:100,copperScore:100}),
  ]});
  assert.equal(out.score,35);
  assert.deepEqual(out.trend,[{label:"2026-08-01",value:0},{label:"2026-09-01",value:35}]);
});
test("K1 missing latest component cannot fall back to older components or diagnostic score",()=>{
  const out=buildCommoditiesK1({asOfDate:"2026-09-22",supplyRows:[
    mrow("2026-08-01",{oilScore:20,gasolineScore:40,copperScore:60}),
    mrow("2026-09-01",{oilScore:20,gasolineScore:40,copperScore:null,score:90}),
  ]});
  assert.equal(out.status,"PARTIAL");
  assert.equal(out.score,null);
  assert.deepEqual(out.trend,[]);
});
test("K1 chart does not bridge missing components or missing months",()=>{
  for(const middle of [[],[mrow("2026-08-01",{oilScore:10,gasolineScore:20,copperScore:null})]]){
    const out=buildCommoditiesK1({asOfDate:"2026-09-22",supplyRows:[
      mrow("2026-07-01",{oilScore:10,gasolineScore:20,copperScore:30}),
      ...middle,
      mrow("2026-09-01",{oilScore:20,gasolineScore:40,copperScore:60}),
    ]});
    assert.deepEqual(out.trend,[{label:"2026-09-01",value:35}]);
  }
});
