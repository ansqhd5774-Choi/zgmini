import test from "node:test";
import assert from "node:assert/strict";
import {composeBreadthB1R5Score,readBreadthB1R5StoredScore,smoothBreadthFinalSeries} from "../lib/market-score/breadth-b1-r5-reader.mjs";
import {projectBreadthB1R5PublicDomain,assertBreadthB1R5PublicContract} from "../lib/market-score/breadth-b1-r5-worker-domain.mjs";
import {B1_R5_METHOD} from "../lib/market-score/breadth-b1-r5-contract.mjs";

const near=(actual,expected,eps=1e-9)=>assert.ok(Math.abs(actual-expected)<=eps,`expected ${actual} ~= ${expected}`);

test("final EMA3 responds immediately to a shock and retains an ongoing change",()=>{
 const out=smoothBreadthFinalSeries([{label:"2026-10-01",value:80},{label:"2026-10-02",value:20},{label:"2026-10-05",value:20},{label:"2026-10-06",value:20}]);
 assert.deepEqual(out.map(x=>x.value),[80,50,35,27.5]);
});
test("missing trading sessions reset final EMA without invented observations",()=>{
 const out=smoothBreadthFinalSeries([{label:"2026-10-01",value:80},{label:"2026-10-05",value:20}]);
 assert.deepEqual(out.map(x=>x.value),[80,20]);
 assert.throws(()=>smoothBreadthFinalSeries([{label:"2026-10-01",value:null}]));
 assert.throws(()=>smoothBreadthFinalSeries([{label:"2026-10-01",value:50},{label:"2026-10-01",value:60}]));
 assert.throws(()=>smoothBreadthFinalSeries([{label:"2026-10-03",value:50}]));
 assert.throws(()=>smoothBreadthFinalSeries([{label:"2026-02-30",value:50}]));
});
test("public score and final trend use the same EMA while raw factors are retained",async()=>{
 const out=await readBreadthB1R5StoredScore({storedR4Reader:async()=>({status:"READY",score:20,observationDate:"2026-10-02",components:{advanceRatio:.2,advanceValueShare:.2},smoothing:{ema5:20,ema20:20},trend:[{label:"2026-10-01",value:80},{label:"2026-10-02",value:20}]})});
 near(out.score,50);near(out.trend.at(-1).value,out.score);near(out.smoothing.rawScore,20);near(out.factors.ema5,20);assert.equal(out.smoothing.finalPeriod,3);
});

test("R5 is explicit four-factor breadth scoring",()=>{
  const out=composeBreadthB1R5Score({advanceRatio:.62,advanceValueShare:.58,ema5:61,ema20:57});
  assert.ok(out);
  near(out.score,.30*62+.20*58+.30*61+.20*57);
  near(out.factors.advanceRatio,62);
  near(out.factors.advanceValueShare,58);
  near(out.factors.ema5,61);
  near(out.factors.ema20,57);
});

test("R5 preserves R4 numeric continuity while exposing four factors",async()=>{
  const base={
    id:"breadth",status:"READY",score:59,source:"IEX HIST",
    components:{advanceRatio:.60,advanceValueShare:.55},
    smoothing:{dailyScore:58,ema5:62,ema20:57},
    runtime:{asOfDate:"2026-10-01",observationDate:"2026-10-01",lagTradingSessions:0},
    observationDate:"2026-10-01",trend:[{label:"2026-10-01",value:59}],
  };
  const out=await readBreadthB1R5StoredScore({
    asOfDate:"2026-10-01",
    storedR4Reader:async()=>base,
  });
  assert.equal(out.status,"READY");
  assert.equal(out.methodologyVersion,B1_R5_METHOD);
  assert.equal(out.providerRequests,0);
  assert.equal(out.storageMode,"D1_STORED_ONLY");
  near(out.score,.30*60+.20*55+.30*62+.20*57);
  near(out.score,base.score);
});

test("R5 public projection exposes four new stable indicators",()=>{
  const domain=projectBreadthB1R5PublicDomain({
    status:"READY",score:61,methodologyVersion:B1_R5_METHOD,source:"stored-source",
    observationDate:"2026-10-01",
    components:{advanceRatio:.625,advanceValueShare:.59},
    smoothing:{ema5:60,ema20:58},
    runtime:{asOfDate:"2026-10-01",observationDate:"2026-10-01",lagTradingSessions:0},
    trend:[{label:"2026-10-01",value:61}],
  });
  assertBreadthB1R5PublicContract(domain);
  assert.deepEqual(domain.indicators.map(x=>x.id),["breadth-41","breadth-42","breadth-43","breadth-44"]);
  assert.deepEqual(domain.indicators.map(x=>x.name),["상승종목비율","상승거래대금비율","5일 수급 EMA","20일 수급 EMA"]);
  assert.deepEqual(domain.indicators.map(x=>x.score),[62.5,59,60,58]);
});
