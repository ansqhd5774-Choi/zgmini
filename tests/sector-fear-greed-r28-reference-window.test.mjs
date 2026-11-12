import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {SECTOR_FEAR_GREED_R28_WINDOWS,percentileWindow,scoreRawAxis,scoreRawAxisFullAvailable,buildCompositeSeries,currentComposite,correlation,summarizeScoreSeries,rankCorrelationByKey} from "../lib/market-score/sector-fear-greed-r28-reference-window.mjs";
import {deriveR28RawAxes} from "../scripts/pc-writer/sector-fear-greed-r28-reference-window-diagnostic.mjs";

const dateAt=i=>new Date(Date.UTC(2020,0,1)+i*86400000).toISOString().slice(0,10);
function rows(count){return Array.from({length:count},(_,i)=>({date:dateAt(i),a:Math.sin(i/11)+i/1000,b:Math.cos(i/17)-i/2000}));}
function prices(count,drift){let value=100;return Array.from({length:count},(_,i)=>{value*=1+drift+0.0008*Math.sin(i/13);return {date:dateAt(i),close:value};});}

const spec={metrics:[{key:"a",weight:.6},{key:"b",weight:.4,invert:true}]};

test("R2.8 window set is bounded and does not alter approved 756 contract",()=>{
  assert.deepEqual([...SECTOR_FEAR_GREED_R28_WINDOWS],[126,189,252]);
  const r1=fs.readFileSync(path.join(process.cwd(),"lib/market-score/sector-fear-greed-r1-shadow.mjs"),"utf8");
  assert.match(r1,/SECTOR_FEAR_GREED_R1_REFERENCE_OBSERVATIONS=756/);
});

test("R2.8 percentile uses midpoint ties and requires exact window",()=>{
  assert.equal(percentileWindow([1,2,2,4],2,4),50);
  assert.equal(percentileWindow([1,2,3],3,4),null);
  assert.equal(percentileWindow([1,2,3,4],4,4),87.5);
});

test("R2.8 rolling score is prefix-stable and emits n-window+1 observations",()=>{
  const base=rows(300),first=scoreRawAxis(base.slice(0,260),spec,126),full=scoreRawAxis(base,spec,126);
  assert.equal(full.length,175);
  assert.deepEqual(full.slice(0,first.length),first);
  assert.ok(full.every(row=>row.score>=0&&row.score<=100));
});

test("R2.8 full-available endpoint and correlations are deterministic",()=>{
  const source=rows(300),a=scoreRawAxis(source,spec,126),b=scoreRawAxis(source,spec,189),full=scoreRawAxisFullAvailable(source,spec);
  assert.ok(Number.isFinite(full));
  assert.ok(Number.isFinite(correlation(a,b,{method:"pearson"})));
  assert.ok(Number.isFinite(correlation(a,b,{method:"spearman"})));
  const stats=summarizeScoreSeries(a);assert.equal(stats.n,a.length);assert.ok(Number.isFinite(stats.current));
});

test("R2.8 raw derivation reproduces expected warmup counts without future leakage",()=>{
  const sector=prices(539,.0005),spy=prices(539,.0003),breadth=Array.from({length:272},(_,i)=>({date:dateAt(267+i),b50:.5+i/2000,b200:.4+i/2500,highLowNet:-.1+i/1500})),demand=Array.from({length:522},(_,i)=>({date:dateAt(17+i),volumeBreadth:.2*Math.sin(i/15)}));
  const raw=deriveR28RawAxes({etfRows:sector,spyRows:spy,breadthRows:breadth,demandRows:demand});
  assert.deepEqual({T:raw.trend.length,B:raw.breadth.length,D:raw.demand.length,R:raw.relativeStrength.length,V:raw.volatility.length},{T:415,B:272,D:503,R:414,V:477});
  const prefix=deriveR28RawAxes({etfRows:sector.slice(0,400),spyRows:spy.slice(0,400),breadthRows:breadth.slice(0,200),demandRows:demand.slice(0,400)});
  assert.deepEqual(raw.trend.slice(0,prefix.trend.length),prefix.trend);
  assert.deepEqual(raw.relativeStrength.slice(0,prefix.relativeStrength.length),prefix.relativeStrength);
});

test("R2.8 composite keeps approved five-axis raw contribution without 85-percent renormalization",()=>{
  const weights={trend:.20,breadth:.20,demand:.15,relativeStrength:.15,volatility:.15},axisScores={trend:50,breadth:60,demand:40,relativeStrength:70,volatility:30};
  const score=currentComposite(axisScores,weights);
  assert.equal(score,43);
  const series=Object.fromEntries(Object.keys(weights).map((name,index)=>[name,[{date:"2026-01-01",score:axisScores[name]},{date:"2026-01-02",score:axisScores[name]+index}]]));
  const composite=buildCompositeSeries(series,weights);assert.equal(composite.length,2);assert.equal(composite[0].score,43);
});

test("R2.8 cross-sector rank correlation handles monotonic ranks",()=>{
  assert.equal(rankCorrelationByKey({a:1,b:2,c:3,d:4},{a:10,b:20,c:30,d:40}),1);
  assert.equal(rankCorrelationByKey({a:1,b:2,c:3,d:4},{a:40,b:30,c:20,d:10}),-1);
});

test("R2.8 diagnostic is read-only shadow research with no provider or production mutation path",()=>{
  const source=fs.readFileSync(path.join(process.cwd(),"scripts/pc-writer/sector-fear-greed-r28-reference-window-diagnostic.mjs"),"utf8");
  assert.doesNotMatch(source,/fetch\(|https?:\/\/|wrangler\s+d1|publication-ledger|INSERT INTO|UPDATE\s+\w+\s+SET/i);
  assert.match(source,/providerCalls:0/);
  assert.match(source,/productionFormulaChanged:false/);
  assert.match(source,/referenceRequirementChanged:false/);
  assert.match(source,/no85PercentRenormalization:true/);
});
