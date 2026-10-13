import test from "node:test";
import assert from "node:assert/strict";
import {
  R21337_HORIZONS,
  R21337_REFERENCE_OBSERVATIONS,
  R21337_WINDOW,
  R21337_FOLDS,
  R21337_FOLD_SIZE,
  R21337_EXPECTED_IC_DIRECTION,
  R21337_ORTHOGONALIZATION,
  midranksR21337,
  orthogonalizeR21337Date,
  partialSpearmanR21337,
  splitR21337Folds
} from "../scripts/pc-writer/sector-fear-greed-r21337-maxlottery-orthogonal-validation.mjs";

test("R2.13.37 preserves the diagnostic contract",()=>{
  assert.deepEqual(R21337_HORIZONS,[5,20,60]);
  assert.equal(R21337_REFERENCE_OBSERVATIONS,756);
  assert.equal(R21337_WINDOW,252);
  assert.equal(R21337_FOLDS,3);
  assert.equal(R21337_FOLD_SIZE,84);
  assert.equal(R21337_EXPECTED_IC_DIRECTION,"NEGATIVE");
  assert.equal(R21337_ORTHOGONALIZATION,"DATEWISE_CROSS_SECTIONAL_RANK_OLS_MAXLOTTERY_ON_TAILBALANCE");
});

test("R2.13.37 midranks preserve ties",()=>{
  assert.deepEqual(midranksR21337([10,20,20,40]),[1,2.5,2.5,4]);
});

test("R2.13.37 datewise rank OLS removes perfectly redundant maxLottery rank",()=>{
  const rows=[
    {sectorId:"A",date:"2026-01-01",tailScore:10,maxLotteryScore:20},
    {sectorId:"B",date:"2026-01-01",tailScore:20,maxLotteryScore:40},
    {sectorId:"C",date:"2026-01-01",tailScore:30,maxLotteryScore:60},
    {sectorId:"D",date:"2026-01-01",tailScore:40,maxLotteryScore:80}
  ];
  const out=orthogonalizeR21337Date(rows);
  assert.equal(out.length,4);
  assert.ok(out.every(x=>Math.abs(x.orthogonalScore)<1e-12));
});

test("R2.13.37 datewise residual is orthogonal to tail rank in OLS space",()=>{
  const rows=[
    {sectorId:"A",date:"2026-01-01",tailScore:10,maxLotteryScore:70},
    {sectorId:"B",date:"2026-01-01",tailScore:20,maxLotteryScore:10},
    {sectorId:"C",date:"2026-01-01",tailScore:30,maxLotteryScore:50},
    {sectorId:"D",date:"2026-01-01",tailScore:40,maxLotteryScore:20},
    {sectorId:"E",date:"2026-01-01",tailScore:50,maxLotteryScore:90}
  ];
  const out=orthogonalizeR21337Date(rows);
  const mx=out.reduce((s,x)=>s+x.tailRank,0)/out.length;
  const my=out.reduce((s,x)=>s+x.orthogonalScore,0)/out.length;
  const cov=out.reduce((s,x)=>s+(x.tailRank-mx)*(x.orthogonalScore-my),0);
  assert.ok(Math.abs(cov)<1e-10);
});

test("R2.13.37 partial Spearman retains negative information after control",()=>{
  const x=[1,2,3,4,5,6,7,8];
  const y=[8,7,6,5,4,3,2,1];
  const control=[1,3,2,5,4,7,6,8];
  const r=partialSpearmanR21337(x,y,control);
  assert.ok(r<-0.99);
});

test("R2.13.37 splits 252 sessions into three fixed 84-session folds",()=>{
  const dates=[];for(let i=0;i<252;i++)dates.push(new Date(Date.UTC(2025,0,1+i)).toISOString().slice(0,10));
  const folds=splitR21337Folds(dates);
  assert.equal(folds.length,3);
  assert.deepEqual(folds.map(x=>x.dates.length),[84,84,84]);
  assert.equal(folds[0].dates[0],dates[0]);
  assert.equal(folds[2].dates.at(-1),dates.at(-1));
});
