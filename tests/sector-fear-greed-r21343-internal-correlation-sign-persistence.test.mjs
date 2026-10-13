import test from "node:test";
import assert from "node:assert/strict";
import {
  R21343_FEATURE,
  R21343_HORIZONS,
  R21343_REFERENCE_OBSERVATIONS,
  R21343_WINDOW,
  R21343_BLOCK_SIZE,
  R21343_BLOCKS,
  splitR21343Blocks,
  summarizeR21343Series,
  referenceDatesR21343,
  analyzeR21343,
} from "../scripts/pc-writer/sector-fear-greed-r21343-internal-correlation-sign-persistence.mjs";

function dates(n){const out=[];const d=new Date("2025-01-01T00:00:00Z");for(let i=0;i<n;i++){out.push(d.toISOString().slice(0,10));d.setUTCDate(d.getUTCDate()+1);}return out;}

test("R2.13.43 preserves diagnostic constants",()=>{
  assert.equal(R21343_FEATURE,"internalCorrelationShock");
  assert.deepEqual(R21343_HORIZONS,[5,20,60]);
  assert.equal(R21343_REFERENCE_OBSERVATIONS,756);
  assert.equal(R21343_WINDOW,252);
  assert.equal(R21343_BLOCK_SIZE,21);
  assert.equal(R21343_BLOCKS,12);
});

test("R2.13.43 splits exactly 252 dates into twelve 21-session blocks",()=>{
  const b=splitR21343Blocks(dates(252));
  assert.equal(b.length,12);
  assert.ok(b.every(x=>x.dates.length===21));
  assert.equal(b[0].block,1);
  assert.equal(b.at(-1).block,12);
});

test("R2.13.43 sign summary tolerates forward-outcome tail gaps",()=>{
  const ds=dates(252),blocks=splitR21343Blocks(ds),rows=ds.slice(0,192).map((date,i)=>({date,partialIcVsFiveRaw:i%5===0?0.1:-0.2}));
  const x=summarizeR21343Series(rows,blocks);
  assert.equal(x.eligibleDates,192);
  assert.ok(x.blockSummary.unavailable>0);
  assert.equal(x.leaveOneBlockOut.runs,12);
  assert.ok(Number.isFinite(x.fullMedianPartialIc));
});

test("R2.13.43 reference dates require a 252-date common fiveRaw axis",()=>{
  const ds=dates(252),r21332={sectors:{a:{fiveRaw:ds.map(date=>({date,score:50}))},b:{fiveRaw:ds.map(date=>({date,score:51}))}}};
  assert.deepEqual(referenceDatesR21343(r21332),ds);
});

test("R2.13.43 analyzes stored cross-sectional, time-series and LOSO evidence without selecting",()=>{
  const ds=dates(252),detail={};for(const h of [5,20,60]){detail[h]={};for(const metric of ["return","drawdown"])detail[h][metric]=ds.slice(0,metric==="return"?232:247).map((date,i)=>({date,partialIcVsFiveRaw:metric==="drawdown"?-0.1:(i%2?0.05:0.02)}));}
  const ts={};for(let s=0;s<11;s++){ts[`s${s}`]={};for(const h of [5,20,60])ts[`s${s}`][h]={return:{partialIcVsFiveRaw:0.1},drawdown:{partialIcVsFiveRaw:-0.1}};}
  const loso={};for(const h of [5,20,60])loso[h]={return:{runs:11,negativeRuns:0,positiveRuns:11,full:0.05,losoMedian:0.05,min:0.03,max:0.07,maxAbsDelta:0.02},drawdown:{runs:11,negativeRuns:11,positiveRuns:0,full:-0.1,losoMedian:-0.1,min:-0.12,max:-0.08,maxAbsDelta:0.02}};
  const source={featureResults:{internalCorrelationShock:{status:"READY_252",commonDates:252,crossSectional:{detail},timeSeries:{detail:ts},loso:{summary:loso}}}};
  const r21332={sectors:{}};for(let s=0;s<11;s++)r21332.sectors[`s${s}`]={fiveRaw:ds.map(date=>({date,score:50}))};
  const a=analyzeR21343(source,r21332);
  assert.equal(a.synthesis.drawdownFullNegativeCells,3);
  assert.equal(a.synthesis.returnFullNegativeCells,0);
  assert.equal(a.synthesis.judgment,"NO_SELECTION_DIAGNOSTIC_ONLY");
  assert.equal(a.cells[5].drawdown.sectorTimeSeries.negative,11);
  assert.equal(a.cells[5].drawdown.storedLoso.negativeRuns,11);
});
