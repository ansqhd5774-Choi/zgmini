import test from "node:test";
import assert from "node:assert/strict";
import {buildSectorSpeculativeCandidate,buildSectorSpeculativeCandidateR21,SECTOR_FEAR_GREED_R2_SPEC_WEIGHTS,SECTOR_FEAR_GREED_R21_SPEC_WEIGHTS} from "../lib/market-score/sector-fear-greed-r2-speculative-shadow.mjs";

function day(index){const d=new Date(Date.UTC(2023,0,1+index));return d.toISOString().slice(0,10);}
function fixture(days=820){
  const spy=[],etf=[],rows=[],byTicker={};
  for(let i=0;i<days;i++){
    spy.push({date:day(i),close:100*Math.exp(i*0.0004+0.01*Math.sin(i/23))});
    etf.push({date:day(i),close:90*Math.exp(i*0.00045+0.012*Math.sin(i/19))});
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

test("speculative appetite candidate becomes READY only after full 756-reference history",()=>{
  const {spy,rows,pitHistory}=fixture(820);
  const result=buildSectorSpeculativeCandidate({rows,spyRows:spy,pitHistory,sectorId:"technology"});
  assert.equal(result.status,"READY");
  assert.equal(result.requiredReferenceObservations,756);
  assert.equal(result.metrics.tailBalance.referenceObservations,756);
  assert.ok(Number.isFinite(result.score));
  assert.equal(result.productionFormulaChanged,false);
  assert.equal(result.publicMutation,false);
  assert.deepEqual(result.weights,SECTOR_FEAR_GREED_R2_SPEC_WEIGHTS);
});

test("R2.1 residual lottery-demand candidate uses sector benchmark and full 756-reference history",()=>{
  const {spy,etf,rows,pitHistory}=fixture(820);
  const result=buildSectorSpeculativeCandidateR21({rows,spyRows:spy,etfRows:etf,pitHistory,sectorId:"technology"});
  assert.equal(result.status,"READY");
  assert.equal(result.requiredReferenceObservations,756);
  assert.equal(result.metrics.lotteryDemand.referenceObservations,756);
  assert.ok(Number.isFinite(result.metrics.lotteryDemand.current));
  assert.ok(Number.isFinite(result.score));
  assert.equal(result.productionFormulaChanged,false);
  assert.deepEqual(result.weights,SECTOR_FEAR_GREED_R21_SPEC_WEIGHTS);
});

test("539 raw sessions remain PARTIAL and never shorten the ECDF requirement",()=>{
  const {spy,etf,rows,pitHistory}=fixture(539);
  const r2=buildSectorSpeculativeCandidate({rows,spyRows:spy,pitHistory,sectorId:"technology"});
  const r21=buildSectorSpeculativeCandidateR21({rows,spyRows:spy,etfRows:etf,pitHistory,sectorId:"technology"});
  assert.equal(r2.status,"PARTIAL");
  assert.equal(r2.score,null);
  assert.equal(r2.metrics.tailBalance.historyObservations,479);
  assert.equal(r2.metrics.speculativeLeadership.referenceObservations,479);
  assert.equal(r2.metrics.speculativeVolume.score,null);
  assert.equal(r21.status,"PARTIAL");
  assert.equal(r21.score,null);
  assert.equal(r21.metrics.lotteryDemand.historyObservations,479);
  assert.equal(r21.metrics.lotteryDemand.score,null);
});

test("missing SPY or sector ETF history cannot fabricate speculative features",()=>{
  const {spy,etf,rows,pitHistory}=fixture(100);
  const missingSpy=buildSectorSpeculativeCandidate({rows,spyRows:[],pitHistory,sectorId:"technology"});
  assert.equal(missingSpy.history.length,0);
  assert.equal(missingSpy.status,"PARTIAL");
  assert.equal(missingSpy.metrics.tailBalance.current,null);
  const missingEtf=buildSectorSpeculativeCandidateR21({rows,spyRows:spy,etfRows:[],pitHistory,sectorId:"technology"});
  assert.equal(missingEtf.status,"PARTIAL");
  assert.equal(missingEtf.metrics.lotteryDemand.current,null);
  assert.equal(missingEtf.score,null);
  const withEtf=buildSectorSpeculativeCandidateR21({rows,spyRows:spy,etfRows:etf,pitHistory,sectorId:"technology"});
  assert.ok(withEtf.history.length>0);
});
