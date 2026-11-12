import test from "node:test";
import assert from "node:assert/strict";
import {R21336_FEATURES,R21336_HORIZONS,R21336_REFERENCE_OBSERVATIONS,R21336_WINDOW,scoreR21336Feature,summarizeR21336Feature} from "../scripts/pc-writer/sector-fear-greed-r21336-tail-feature-attribution.mjs";

test("R2.13.36 preserves the diagnostic contract",()=>{
  assert.deepEqual(R21336_FEATURES,["tailBalance","maxLottery","lotteryDemand","speculativeLeadership","speculativeVolume"]);
  assert.deepEqual(R21336_HORIZONS,[5,20,60]);
  assert.equal(R21336_REFERENCE_OBSERVATIONS,756);
  assert.equal(R21336_WINDOW,252);
});

test("R2.13.36 scores a raw feature with a rolling 756 percentile window",()=>{
  const history=[];for(let i=0;i<760;i++)history.push({date:new Date(Date.UTC(2020,0,1+i)).toISOString().slice(0,10),tailBalance:i});
  const scored=scoreR21336Feature(history,"tailBalance");
  assert.equal(scored.length,5);
  assert.equal(scored[0].date,history[755].date);
  assert.ok(scored.every(x=>x.score>99&&x.score<=100));
});

test("R2.13.36 does not fabricate missing feature observations",()=>{
  const history=[];for(let i=0;i<800;i++)history.push({date:new Date(Date.UTC(2020,0,1+i)).toISOString().slice(0,10),lotteryDemand:i<100?null:i});
  const scored=scoreR21336Feature(history,"lotteryDemand");
  assert.equal(scored.length,0);
});

test("R2.13.36 summarizes sector time-series and cross-sectional evidence descriptively",()=>{
  const mk=(sectorOffset)=>{const rows=[];for(let i=0;i<70;i++){const date=new Date(Date.UTC(2026,0,1+i)).toISOString().slice(0,10);rows.push({date,score:i+sectorOffset,forwardReturn5:-(i+sectorOffset),forwardDrawdown5:-(i+sectorOffset),forwardReturn20:-(i+sectorOffset),forwardDrawdown20:-(i+sectorOffset),forwardReturn60:-(i+sectorOffset),forwardDrawdown60:-(i+sectorOffset)});}return {rows,summary:{5:{returnIC:-1,drawdownIC:-1},20:{returnIC:-1,drawdownIC:-1},60:{returnIC:-1,drawdownIC:-1}}};};
  const result=summarizeR21336Feature({A:mk(0),B:mk(1),C:mk(2)});
  assert.equal(result.sectorCount,3);
  assert.equal(result.timeSeries[5].return.medianIC,-1);
  assert.equal(result.timeSeries[20].drawdown.negativeSectors,3);
  assert.ok(result.crossSectional[5].return.eligibleDates>0);
});
