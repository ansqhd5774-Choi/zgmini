import test from "node:test";
import assert from "node:assert/strict";
import {buildSectorSpeculativeCandidateR22,SECTOR_FEAR_GREED_R22_WEIGHTS} from "../lib/market-score/sector-fear-greed-r22-speculative-shadow.mjs";

function day(index){const d=new Date(Date.UTC(2023,0,1+index));return d.toISOString().slice(0,10);}
function fixture(days=820){
  const spy=[],etf=[],rows=[],byTicker={};
  for(let i=0;i<days;i++){
    const date=day(i);
    spy.push({date,close:100*Math.exp(i*0.0004+0.004*Math.sin(i/17))});
    etf.push({date,close:90*Math.exp(i*0.00045+0.005*Math.sin(i/19))});
  }
  for(let t=0;t<8;t++){
    const ticker=`T${t}`;byTicker[ticker]=[{ticker,sectorId:"technology",dateAdded:"2020-01-01",dateRemoved:null}];
    for(let i=0;i<days;i++){
      const cyc=Math.sin((i+t*3)/11)*(0.003+t*0.0005),trend=(0.0002+t*0.00008)*i;
      rows.push({tradeDate:day(i),ticker,currentClose:50*Math.exp(trend+cyc),currentVolume:1_000_000*(1+t*0.05)*(1+0.1*Math.sin(i/7+t))});
    }
  }
  return {spy,etf,rows,pitHistory:{byTicker}};
}

test("R2.2 uses only residual lottery demand and speculative volume at equal weight",()=>{
  const {spy,etf,rows,pitHistory}=fixture(820);
  const result=buildSectorSpeculativeCandidateR22({rows,spyRows:spy,etfRows:etf,pitHistory,sectorId:"technology"});
  assert.equal(result.status,"READY");
  assert.equal(result.requiredReferenceObservations,756);
  assert.deepEqual(result.weights,SECTOR_FEAR_GREED_R22_WEIGHTS);
  assert.deepEqual(Object.keys(result.metrics).sort(),["lotteryDemand","speculativeVolume"]);
  assert.ok(Number.isFinite(result.score));
  assert.equal(result.productionFormulaChanged,false);
  assert.equal(result.publicMutation,false);
});

test("R2.2 keeps the 756-reference requirement and does not manufacture readiness",()=>{
  const {spy,etf,rows,pitHistory}=fixture(539);
  const result=buildSectorSpeculativeCandidateR22({rows,spyRows:spy,etfRows:etf,pitHistory,sectorId:"technology"});
  assert.equal(result.status,"PARTIAL");
  assert.equal(result.score,null);
  assert.equal(result.metrics.lotteryDemand.referenceObservations,479);
  assert.equal(result.metrics.speculativeVolume.referenceObservations,479);
});

test("R2.2 cannot fabricate lottery demand without a sector ETF benchmark",()=>{
  const {spy,rows,pitHistory}=fixture(820);
  const result=buildSectorSpeculativeCandidateR22({rows,spyRows:spy,etfRows:[],pitHistory,sectorId:"technology"});
  assert.equal(result.status,"PARTIAL");
  assert.equal(result.score,null);
  assert.equal(result.metrics.lotteryDemand.current,null);
});
