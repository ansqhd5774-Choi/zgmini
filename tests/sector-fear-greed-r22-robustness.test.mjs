import test from "node:test";
import assert from "node:assert/strict";
import {alignedCorrelation,maxAbsCorrelation,pearsonCorrelation,spearmanCorrelation,splitChronologicalHistory,summarizeMemberCoverage} from "../lib/market-score/sector-fear-greed-r22-robustness.mjs";

test("R2.2 robustness split is chronological and leak-free",()=>{
  const rows=Array.from({length:40},(_,i)=>({date:`2026-01-${String(i+1).padStart(2,"0")}`,lotteryDemand:i,speculativeVolume:40-i,memberObservations:20+i%3,quartileSize:5}));
  const split=splitChronologicalHistory(rows.reverse());
  assert.equal(split.all.length,40);
  assert.equal(split.first.length,20);
  assert.equal(split.second.length,20);
  assert.ok(split.first.at(-1).date<split.second[0].date);
});

test("R2.2 robustness reports Pearson and Spearman without fabricating short samples",()=>{
  const x=Array.from({length:30},(_,i)=>i+1),y=x.map(v=>v*3+2),z=[...x].reverse();
  assert.ok(Math.abs(pearsonCorrelation(x,y)-1)<1e-12);
  assert.ok(Math.abs(spearmanCorrelation(x,z)+1)<1e-12);
  assert.equal(pearsonCorrelation(x.slice(0,10),y.slice(0,10)),null);
});

test("R2.2 robustness aligns by exact date and summarizes member coverage",()=>{
  const left=Array.from({length:25},(_,i)=>({date:`2026-02-${String(i+1).padStart(2,"0")}`,a:i,memberObservations:10+i%5,quartileSize:3+i%2}));
  const right=left.map((row,i)=>({date:row.date,b:i*2}));
  const corr=alignedCorrelation(left,"a",right,"b");
  assert.equal(corr.observations,25);
  assert.ok(Math.abs(corr.correlation-1)<1e-12);
  const coverage=summarizeMemberCoverage(left);
  assert.equal(coverage.observations,25);
  assert.equal(coverage.memberMin,10);
  assert.equal(coverage.memberMax,14);
  assert.equal(maxAbsCorrelation([{correlation:-0.2},{correlation:0.6}]),0.6);
});
