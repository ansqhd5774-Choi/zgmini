import test from "node:test";
import assert from "node:assert/strict";
import {buildSectorSpeculativeCandidate,SECTOR_FEAR_GREED_R2_SPEC_WEIGHTS} from "../lib/market-score/sector-fear-greed-r2-speculative-shadow.mjs";

function day(index){const d=new Date(Date.UTC(2023,0,1+index));return d.toISOString().slice(0,10);}
function fixture(days=820){
  const spy=[],rows=[],byTicker={};
  for(let i=0;i<days;i++)spy.push({date:day(i),close:100*Math.exp(i*0.0004)});
  for(let t=0;t<8;t++){
    const ticker=`T${t}`;byTicker[ticker]=[{ticker,sectorId:"technology",dateAdded:"2020-01-01",dateRemoved:null}];
    for(let i=0;i<days;i++){
      const cyc=Math.sin((i+t*3)/11)*(0.003+t*0.0005),trend=(0.0002+t*0.00008)*i;
      rows.push({tradeDate:day(i),ticker,currentClose:50*Math.exp(trend+cyc),currentVolume:1_000_000*(1+t*0.05)*(1+0.1*Math.sin(i/7+t))});
    }
  }
  return {spy,rows,pitHistory:{byTicker}};
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

test("539 raw sessions remain PARTIAL and never shorten the ECDF requirement",()=>{
  const {spy,rows,pitHistory}=fixture(539);
  const result=buildSectorSpeculativeCandidate({rows,spyRows:spy,pitHistory,sectorId:"technology"});
  assert.equal(result.status,"PARTIAL");
  assert.equal(result.score,null);
  assert.equal(result.metrics.tailBalance.historyObservations,479);
  assert.equal(result.metrics.speculativeLeadership.referenceObservations,479);
  assert.equal(result.metrics.speculativeVolume.score,null);
});

test("missing SPY history cannot fabricate speculative features",()=>{
  const {rows,pitHistory}=fixture(100);
  const result=buildSectorSpeculativeCandidate({rows,spyRows:[],pitHistory,sectorId:"technology"});
  assert.equal(result.history.length,0);
  assert.equal(result.status,"PARTIAL");
  assert.equal(result.metrics.tailBalance.current,null);
});
