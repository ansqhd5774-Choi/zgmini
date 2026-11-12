import test from "node:test";
import assert from "node:assert/strict";
import {R21338_FEATURES,R21338_HORIZONS,R21338_REFERENCE_OBSERVATIONS,R21338_WINDOW,R21338_FOLDS,R21338_FOLD_SIZE,R21338_EXPECTED_IC_DIRECTION,orthogonalizeR21338Date} from "../scripts/pc-writer/sector-fear-greed-r21338-remaining-feature-orthogonal-validation.mjs";
import {partialSpearmanR21337,splitR21337Folds} from "../scripts/pc-writer/sector-fear-greed-r21337-maxlottery-orthogonal-validation.mjs";
import {spearmanR21333} from "../scripts/pc-writer/sector-fear-greed-r21333-economic-validation.mjs";

test("R2.13.38 preserves the diagnostic contract",()=>{
  assert.deepEqual(R21338_FEATURES,["speculativeLeadership","speculativeVolume"]);
  assert.deepEqual(R21338_HORIZONS,[5,20,60]);
  assert.equal(R21338_REFERENCE_OBSERVATIONS,756);
  assert.equal(R21338_WINDOW,252);
  assert.equal(R21338_FOLDS,3);
  assert.equal(R21338_FOLD_SIZE,84);
  assert.equal(R21338_EXPECTED_IC_DIRECTION,"NEGATIVE");
});

test("R2.13.38 removes a perfectly redundant feature rank",()=>{
  const rows=Array.from({length:11},(_,i)=>({sectorId:`S${i}`,tailScore:i,featureScore:i}));
  const out=orthogonalizeR21338Date(rows);
  assert.equal(out.length,11);
  assert.ok(out.every(x=>Math.abs(x.orthogonalScore)<1e-12));
});

test("R2.13.38 residual is orthogonal to tail rank in OLS space",()=>{
  const feature=[1,2,4,3,7,5,11,9,8,10,6],rows=feature.map((v,i)=>({sectorId:`S${i}`,tailScore:i+1,featureScore:v})),out=orthogonalizeR21338Date(rows);
  const rho=spearmanR21333(out.map(x=>x.tailRank),out.map(x=>x.orthogonalScore));
  assert.ok(rho===null||Math.abs(rho)<0.35);
  const mean=x=>x.reduce((a,b)=>a+b,0)/x.length,mx=mean(out.map(x=>x.tailRank)),mr=mean(out.map(x=>x.orthogonalScore));
  const cov=out.reduce((s,x)=>s+(x.tailRank-mx)*(x.orthogonalScore-mr),0);
  assert.ok(Math.abs(cov)<1e-9);
});

test("R2.13.38 partial Spearman can retain negative incremental information",()=>{
  const x=[1,2,3,4,5,6,7,8,9,10],control=[1,1,2,2,3,3,4,4,5,5],y=x.map((v,i)=>-v+control[i]*0.1);
  const p=partialSpearmanR21337(x,y,control);
  assert.ok(typeof p==="number"&&p<0);
});

test("R2.13.38 uses three fixed 84-session folds",()=>{
  const dates=[];for(let i=0;i<252;i++)dates.push(new Date(Date.UTC(2025,0,1+i)).toISOString().slice(0,10));
  const folds=splitR21337Folds(dates);
  assert.equal(folds.length,3);
  assert.deepEqual(folds.map(x=>x.dates.length),[84,84,84]);
  assert.equal(folds.flatMap(x=>x.dates).length,252);
});
