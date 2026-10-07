import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {stableDirection,buildDollarPitFeatureSeries} from "../scripts/pc-writer/analyze-dollar-r23-features.mjs";

test("R2.3 feature diagnostic classifies train/holdout sign stability without selecting weights",()=>{
  assert.equal(stableDirection(.2,.1),"POSITIVE");
  assert.equal(stableDirection(-.2,-.1),"INVERSE");
  assert.equal(stableDirection(.2,-.1),"UNSTABLE");
  assert.equal(stableDirection(null,.1),"UNRESOLVED");
});

test("R2.3 feature diagnostic does not fabricate features with insufficient PIT history",()=>{
  const revisions=[];
  for(let i=0;i<100;i++){
    const d=new Date(Date.UTC(2024,0,1+i)).toISOString().slice(0,10);
    revisions.push({observationDate:d,value:100+i/100,realtimeStart:d,realtimeEnd:"9999-12-31"});
  }
  const out=buildDollarPitFeatureSeries({revisions,signalVintagePairs:[{signalDate:"2024-04-09",vintageDate:"2024-04-08"}]});
  assert.equal(out.series.shortMomentum.length,0);
  assert.equal(out.diagnostics[0].ready,false);
});

test("R2.3 feature diagnostic is read-only research with no formula selection or publishing",()=>{
  const src=fs.readFileSync(new URL("../scripts/pc-writer/analyze-dollar-r23-features.mjs",import.meta.url),"utf8");
  assert.match(src,/DOLLAR_R23_FEATURE_DIAGNOSTIC_ONLY/);
  assert.match(src,/formulaSelected:false/);
  assert.match(src,/weightSelected:false/);
  assert.match(src,/productionFormulaChanged:false/);
  assert.match(src,/providerCalls:0/);
  assert.doesNotMatch(src,/publishMarket|remote\.|--publish|INSERT INTO|UPDATE |DELETE FROM/);
});
