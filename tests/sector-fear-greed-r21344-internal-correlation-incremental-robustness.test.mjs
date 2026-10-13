import test from "node:test";
import assert from "node:assert/strict";
import {
  R21344_FEATURE,
  R21344_REFERENCE_OBSERVATIONS,
  R21344_WINDOW,
  R21344_HORIZONS,
  R21344_BOOTSTRAP_BLOCK,
  R21344_BOOTSTRAP_ITERATIONS,
  movingBlockBootstrapR21344,
  summarizeVolatilityControlledR21344,
  summarizeRedundancyR21344,
} from "../scripts/pc-writer/sector-fear-greed-r21344-internal-correlation-incremental-robustness.mjs";

test("R2.13.44 preserves diagnostic constants",()=>{
  assert.equal(R21344_FEATURE,"internalCorrelationShock");
  assert.equal(R21344_REFERENCE_OBSERVATIONS,756);
  assert.equal(R21344_WINDOW,252);
  assert.deepEqual(R21344_HORIZONS,[5,20,60]);
  assert.equal(R21344_BOOTSTRAP_BLOCK,21);
  assert.equal(R21344_BOOTSTRAP_ITERATIONS,2000);
});

test("R2.13.44 moving-block bootstrap is deterministic",()=>{
  const values=Array.from({length:80},(_,i)=>Math.sin(i/7)-0.2);
  const a=movingBlockBootstrapR21344(values,{block:7,iterations:100,seed:42});
  const b=movingBlockBootstrapR21344(values,{block:7,iterations:100,seed:42});
  assert.deepEqual(a,b);
  assert.equal(a.iterations,100);
});

test("R2.13.44 all-negative bootstrap remains negative",()=>{
  const x=movingBlockBootstrapR21344(Array(100).fill(-0.1),{block:10,iterations:100,seed:7});
  assert.equal(x.ci025,-0.1);
  assert.equal(x.ci975,-0.1);
  assert.equal(x.probNegative,1);
});

test("R2.13.44 redundancy summary captures low correlation",()=>{
  const feature={a:[{date:"2026-01-01",score:1},{date:"2026-01-02",score:2},{date:"2026-01-03",score:3}],b:[{date:"2026-01-01",score:1},{date:"2026-01-02",score:2},{date:"2026-01-03",score:3}]};
  const vol={a:[{date:"2026-01-01",score:3},{date:"2026-01-02",score:1},{date:"2026-01-03",score:2}],b:[{date:"2026-01-01",score:2},{date:"2026-01-02",score:3},{date:"2026-01-03",score:1}]};
  const r=summarizeRedundancyR21344(feature,vol);
  assert.equal(r.sectors.length,2);
  assert.ok(Number.isFinite(r.median));
});

test("R2.13.44 volatility-controlled summary keeps all horizons",()=>{
  const rows={},vol={};
  for(let s=0;s<5;s++){
    const id=`s${s}`;rows[id]=[];vol[id]=[];
    for(let i=0;i<12;i++){
      const date=`2026-01-${String(i+1).padStart(2,"0")}`;
      rows[id].push({date,score:i+s*.2,forwardDrawdown5:-(i+s*.1),forwardDrawdown20:-(i*.7+s),forwardDrawdown60:-(i*.3+s*.5)});
      vol[id].push({date,score:(i%4)+s*.1});
    }
  }
  const r=summarizeVolatilityControlledR21344(rows,vol);
  for(const h of [5,20,60]){
    assert.ok(r.timeSeries[h]);
    assert.ok(r.crossSectional[h]);
  }
});
