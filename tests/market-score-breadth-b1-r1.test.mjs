import test from "node:test";
import assert from "node:assert/strict";
import {buildBreadthB1R1,B1_R1_LIMITS} from "../lib/market-score/breadth-b1-r1.mjs";

const obs="2026-09-18";
const prev="2026-09-17";

function snapshot(members,extra={}){
  return {
    asOfDate:obs,
    isDaily:true,
    constituentCount:members.length,
    unlinkedCount:members.filter(x=>x.isLinked!==true).length,
    source:"Equibles tracking-fund basket fixture",
    members,
    ...extra,
  };
}
function member(ticker,weight=1,isLinked=true){ return {ticker,weight,isLinked}; }
function pair(ticker,previousClose,currentClose,currentVolume=10,previousDate=prev,currentDate=obs){
  return {ticker,previousDate,currentDate,previousClose,currentClose,currentVolume};
}

test("B1-R1 exact 60/40 formula uses half credit for FLAT",()=>{
  const members=[member("A"),member("B"),member("C"),member("D")];
  const out=buildBreadthB1R1({
    observationDate:obs,snapshot:snapshot(members),
    pricePairs:[
      pair("A",100,110,10),
      pair("B",100,120,10),
      pair("C",100,100,10),
      pair("D",100,90,10),
    ],
  });
  const ar=(2+0.5)/4;
  const av=(1100+1200+0.5*1000)/(1100+1200+1000+900);
  const expected=100*(0.60*ar+0.40*av);
  assert.equal(out.status,"READY");
  assert.ok(Math.abs(out.score-expected)<1e-12);
  assert.equal(out.components.advanceRatio,ar);
  assert.ok(Math.abs(out.components.advanceValueShare-av)<1e-12);
});

test("B1-R1 turnover is close×volume and ignores constituent weight in the score",()=>{
  const members=[member("UP",99),member("DOWN",1)];
  const out=buildBreadthB1R1({
    observationDate:obs,snapshot:snapshot(members),
    pricePairs:[pair("UP",99,100,10),pair("DOWN",101,100,10)],
  });
  assert.equal(out.status,"READY");
  assert.equal(out.components.advanceRatio,0.5);
  assert.equal(out.components.advanceValueShare,0.5);
  assert.equal(out.score,50);
  assert.match(out.turnoverDefinition,/close×volume/);
});

test("B1-R1 exact PIT date mismatch fails closed",()=>{
  const s=snapshot([member("A")],{asOfDate:"2026-09-17"});
  const out=buildBreadthB1R1({
    observationDate:obs,snapshot:s,pricePairs:[pair("A",1,2)]
  });
  assert.equal(out.status,"PARTIAL");
  assert.equal(out.score,null);
  assert.deepEqual(out.missing,["PIT_SNAPSHOT_DATE_MISMATCH"]);
});

test("B1-R1 current membership cannot be silently back-applied to another date",()=>{
  const s=snapshot([member("A")]);
  const out=buildBreadthB1R1({
    observationDate:"2026-09-16",
    snapshot:s,
    pricePairs:[],
  });
  assert.equal(out.status,"PARTIAL");
  assert.equal(out.score,null);
  assert.equal(out.missing[0],"PIT_SNAPSHOT_DATE_MISMATCH");
});

test("B1-R1 uses each security's immediately previous actual observation date",()=>{
  const members=[member("A"),member("B")];
  const out=buildBreadthB1R1({
    observationDate:obs,
    snapshot:snapshot(members),
    pricePairs:[
      pair("A",100,101,10,"2026-09-17",obs),
      pair("B",100,99,10,"2026-09-16",obs),
    ],
  });
  assert.equal(out.status,"READY");
  assert.equal(out.quality.previousObservationDateCount,2);
  assert.equal(out.components.advanceRatio,0.5);
});

test("B1-R1 rejects future/same-date previous observations",()=>{
  const members=[member("A")];
  for(const bad of [obs,"2026-09-19"]){
    const out=buildBreadthB1R1({
      observationDate:obs,snapshot:snapshot(members),
      pricePairs:[pair("A",100,101,10,bad,obs)],
    });
    assert.equal(out.status,"PARTIAL");
    assert.equal(out.score,null);
    assert.equal(out.missing[0],"LOW_RETURN_COVERAGE");
  }
});

test("B1-R1 duplicate linked ticker fails closed",()=>{
  const out=buildBreadthB1R1({
    observationDate:obs,
    snapshot:snapshot([member("A",0.5),member("A",0.5)]),
    pricePairs:[pair("A",1,2)],
  });
  assert.equal(out.status,"PARTIAL");
  assert.equal(out.score,null);
  assert.equal(out.missing[0],"DUPLICATE_LINKED_TICKER");
});

test("B1-R1 return coverage below 0.98 is PARTIAL/null with no reweight",()=>{
  const members=Array.from({length:100},(_,i)=>member(`T${i}`,1));
  const pricePairs=Array.from({length:97},(_,i)=>pair(`T${i}`,100,101,10));
  const out=buildBreadthB1R1({
    observationDate:obs,snapshot:snapshot(members),pricePairs
  });
  assert.equal(out.status,"PARTIAL");
  assert.equal(out.score,null);
  assert.equal(out.missing[0],"LOW_RETURN_COVERAGE");
  assert.equal(out.quality.returnCoverage,0.97);
});

test("B1-R1 exactly 0.98 return and value coverage passes",()=>{
  const members=Array.from({length:100},(_,i)=>member(`T${i}`,1));
  const pricePairs=Array.from({length:98},(_,i)=>pair(`T${i}`,100,i%2?99:101,10));
  const out=buildBreadthB1R1({
    observationDate:obs,snapshot:snapshot(members),pricePairs
  });
  assert.equal(out.status,"READY");
  assert.equal(out.quality.returnCoverage,B1_R1_LIMITS.returnCoverage);
  assert.equal(out.quality.tradingValueCoverage,B1_R1_LIMITS.tradingValueCoverage);
});

test("B1-R1 unlinked rows stay in universe denominator and linked-weight gate is strict",()=>{
  const members=[
    member("A",0.96,true),
    {ticker:null,weight:0.04,isLinked:false},
  ];
  const out=buildBreadthB1R1({
    observationDate:obs,snapshot:snapshot(members),
    pricePairs:[pair("A",100,101,10)],
  });
  assert.equal(out.status,"PARTIAL");
  assert.equal(out.score,null);
  assert.equal(out.missing[0],"LOW_LINKED_WEIGHT_COVERAGE");
  assert.equal(out.quality.linkedWeightCoverage,0.96);
});

test("B1-R1 stale snapshot above two trading sessions is PARTIAL/null",()=>{
  const out=buildBreadthB1R1({
    observationDate:obs,
    snapshot:snapshot([member("A")]),
    pricePairs:[pair("A",100,101,10)],
    lagTradingSessions:3,
  });
  assert.equal(out.status,"PARTIAL");
  assert.equal(out.score,null);
  assert.equal(out.missing[0],"STALE");
});

test("B1-R1 missing volume cannot fabricate a numeric score",()=>{
  const members=Array.from({length:100},(_,i)=>member(`T${i}`,1));
  const pricePairs=Array.from({length:100},(_,i)=>pair(`T${i}`,100,101,i<97?10:NaN));
  const out=buildBreadthB1R1({
    observationDate:obs,snapshot:snapshot(members),pricePairs
  });
  assert.equal(out.status,"PARTIAL");
  assert.equal(out.score,null);
  assert.equal(out.missing[0],"LOW_TRADING_VALUE_COVERAGE");
});

test("B1-R1 score is bounded 0 to 100",()=>{
  const allUp=Array.from({length:100},(_,i)=>member(`U${i}`,1));
  const upPairs=allUp.map((_,i)=>pair(`U${i}`,100,101,10));
  const greed=buildBreadthB1R1({
    observationDate:obs,snapshot:snapshot(allUp),pricePairs:upPairs
  });
  assert.equal(greed.status,"READY");
  assert.equal(greed.score,100);

  const allDown=Array.from({length:100},(_,i)=>member(`D${i}`,1));
  const downPairs=allDown.map((_,i)=>pair(`D${i}`,100,99,10));
  const fear=buildBreadthB1R1({
    observationDate:obs,snapshot:snapshot(allDown),pricePairs:downPairs
  });
  assert.equal(fear.status,"READY");
  assert.equal(fear.score,0);
});


test("missing volume is not coerced to a valid zero",()=>{
 const out=buildBreadthB1R1({observationDate:obs,snapshot:snapshot([member("A"),member("B")]),
 pricePairs:[pair("A",100,101,null),pair("B",100,99,10)]});
 assert.equal(out.score,null);
 assert.equal(out.quality.tradingValueCoverage,0.5);
});
test("missing weight is not silently accepted as zero weight",()=>{
 const out=buildBreadthB1R1({observationDate:obs,snapshot:snapshot([member("A",null)]),pricePairs:[pair("A",100,101,10)]});
 assert.deepEqual(out.missing,["WEIGHT_COVERAGE_UNAVAILABLE"]);
});
