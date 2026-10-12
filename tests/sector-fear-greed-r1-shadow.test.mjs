import test from "node:test";
import assert from "node:assert/strict";
import {
  SECTOR_FEAR_GREED_R1_GICS,
  SECTOR_FEAR_GREED_R1_WEIGHTS,
  SECTOR_FEAR_GREED_R1_REFERENCE_OBSERVATIONS,
  computeTrendComponent,
  computeBreadthComponent,
  computeDemandComponent,
  computeRelativeStrengthComponent,
  computeVolatilityComponent,
  buildSectorFearGreedR1Shadow,
} from "../lib/market-score/sector-fear-greed-r1-shadow.mjs";

function dateAt(index){return new Date(Date.UTC(2022,0,1)+index*86400000).toISOString().slice(0,10);}
function prices(count,{drift=0.0004,wave=0.01,start=100}={}){let value=start;const out=[];for(let i=0;i<count;i++){value*=1+drift+wave*Math.sin(i/19)/20+0.00015*Math.cos(i/7);out.push({date:dateAt(i),close:value});}return out;}
function breadth(count){return Array.from({length:count},(_,i)=>({date:dateAt(i),b50:0.45+0.25*(i/(count-1))+0.05*Math.sin(i/23),b200:0.40+0.20*(i/(count-1))+0.04*Math.cos(i/31),highLowNet:-0.10+0.35*(i/(count-1))+0.08*Math.sin(i/17)}));}
function demand(count){return Array.from({length:count},(_,i)=>({date:dateAt(i),value:0.15*Math.sin(i/13)+0.10*Math.cos(i/29)+0.0002*i}));}

test("R1 contract keeps approved six weights and GICS mapping",()=>{
  const total=Object.values(SECTOR_FEAR_GREED_R1_WEIGHTS).reduce((sum,value)=>sum+value,0);
  assert.ok(Math.abs(total-1)<1e-12);assert.equal(SECTOR_FEAR_GREED_R1_WEIGHTS.trend,0.20);assert.equal(SECTOR_FEAR_GREED_R1_WEIGHTS.breadth,0.20);assert.equal(SECTOR_FEAR_GREED_R1_WEIGHTS.options,0.15);assert.equal(SECTOR_FEAR_GREED_R1_GICS["Information Technology"],"technology");assert.equal(SECTOR_FEAR_GREED_R1_GICS["Real Estate"],"realEstate");assert.equal(SECTOR_FEAR_GREED_R1_REFERENCE_OBSERVATIONS,756);
});

test("five non-option components become READY with enough derived-history observations",()=>{
  const sector=prices(920,{drift:0.00055,wave:0.012}),spy=prices(920,{drift:0.00035,wave:0.009});
  for(const component of [computeTrendComponent(sector),computeBreadthComponent(breadth(920)),computeDemandComponent(demand(920)),computeRelativeStrengthComponent(sector,spy),computeVolatilityComponent(sector)]){assert.equal(component.status,"READY");assert.ok(Number.isFinite(component.score));assert.ok(component.score>=0&&component.score<=100);}
});

test("missing option data never renormalizes the remaining 85 percent",()=>{
  const sector=prices(920,{drift:0.00055,wave:0.012}),spy=prices(920,{drift:0.00035,wave:0.009});
  const out=buildSectorFearGreedR1Shadow({sectorId:"technology",etfSeries:sector,spySeries:spy,breadthSeries:breadth(920),volumeBreadthSeries:demand(920)});
  assert.equal(out.status,"PARTIAL");assert.equal(out.reason,"OPTIONS_BLOCKED_BY_DATA_LICENSE");assert.equal(out.score,null);assert.equal(out.availableWeight,0.85);assert.equal(out.renormalized,false);assert.ok(Number.isFinite(out.weightedContribution));assert.equal(out.components.options.status,"BLOCKED");
});

test("full score is produced only when the option input is explicitly READY",()=>{
  const sector=prices(920,{drift:0.00055,wave:0.012}),spy=prices(920,{drift:0.00035,wave:0.009});
  const out=buildSectorFearGreedR1Shadow({sectorId:"technology",etfSeries:sector,spySeries:spy,breadthSeries:breadth(920),volumeBreadthSeries:demand(920),optionsScore:70});
  assert.equal(out.status,"READY");assert.equal(out.reason,null);assert.ok(Number.isFinite(out.score));assert.ok(Math.abs(out.score-(out.weightedContribution+0.15*70))<1e-10);
});

test("insufficient reference history stays PARTIAL instead of fabricating a score",()=>{
  const sector=prices(500,{drift:0.0005}),spy=prices(500,{drift:0.0003});
  const out=buildSectorFearGreedR1Shadow({sectorId:"technology",etfSeries:sector,spySeries:spy,breadthSeries:breadth(500),volumeBreadthSeries:demand(500),optionsScore:70});
  assert.equal(out.status,"PARTIAL");assert.equal(out.reason,"REFERENCE_HISTORY_INCOMPLETE");assert.equal(out.score,null);assert.equal(out.availableWeight,0);assert.equal(out.weightedContribution,null);
});
