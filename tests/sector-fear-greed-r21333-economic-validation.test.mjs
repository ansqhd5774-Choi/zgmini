import test from "node:test";
import assert from "node:assert/strict";
import {R21333_HORIZONS,R21333_MODELS,R21333_REFERENCE_OBSERVATIONS,spearmanR21333,buildR21333OutcomeRows,summarizeR21333NonOverlap,summarizeR21333CrossSectional,summarizeR21333Loso} from "../scripts/pc-writer/sector-fear-greed-r21333-economic-validation.mjs";

test("R2.13.33 preserves the approved validation contract",()=>{
  assert.deepEqual(R21333_HORIZONS,[5,20,60]);
  assert.deepEqual(R21333_MODELS,["fiveRaw","sixRaw","fiveSmoothed","sixSmoothed"]);
  assert.equal(R21333_REFERENCE_OBSERVATIONS,756);
});

test("R2.13.33 reuses the established forward return and drawdown definitions",()=>{
  const date=i=>new Date(Date.UTC(2026,0,1+i)).toISOString().slice(0,10);
  const prices=[];for(let i=0;i<70;i++)prices.push({date:date(i),close:100+i});
  const rows=buildR21333OutcomeRows([{date:date(0),score:50}],prices);
  assert.equal(rows.length,1);
  assert.equal(rows[0].priceIndex,0);
  assert.ok(Math.abs(rows[0].forwardReturn5-.05)<1e-12);
  assert.equal(rows[0].forwardDrawdown5,0);
  assert.ok(Math.abs(rows[0].forwardReturn20-.20)<1e-12);
  assert.ok(Math.abs(rows[0].forwardReturn60-.60)<1e-12);
});

test("R2.13.33 uses mid-rank Spearman IC and non-overlap price-index offsets",()=>{
  assert.equal(spearmanR21333([1,2,3,4],[10,20,30,40]),1);
  const rows=[];for(let i=0;i<30;i++)rows.push({date:`2026-02-${String(i+1).padStart(2,"0")}`,score:i,priceIndex:i,forwardReturn5:i/100});
  const x=summarizeR21333NonOverlap(rows,5,"forwardReturn5");
  assert.equal(x.totalOffsets,5);
  assert.equal(x.eligibleOffsets,5);
  assert.equal(x.medianIC,1);
  assert.ok(x.buckets.every(b=>b.n===6&&b.rho===1));
});

test("R2.13.33 cross-sectional IC and LOSO are descriptive and sector-robust",()=>{
  const sectors={A:[],B:[],C:[],D:[]};
  for(let d=1;d<=4;d++){
    const date=`2026-03-0${d}`;
    sectors.A.push({date,score:1,forwardReturn5:1});
    sectors.B.push({date,score:2,forwardReturn5:2});
    sectors.C.push({date,score:3,forwardReturn5:3});
    sectors.D.push({date,score:4,forwardReturn5:4});
  }
  const xs=summarizeR21333CrossSectional(sectors,5,"forwardReturn5");
  assert.equal(xs.eligibleDates,4);
  assert.equal(xs.medianIC,1);
  const loso=summarizeR21333Loso(sectors,5,"forwardReturn5");
  assert.equal(Object.keys(loso.omissions).length,4);
  assert.equal(loso.maxAbsDeltaMedianIC,0);
  assert.equal(loso.signFlipOmissions,0);
});
