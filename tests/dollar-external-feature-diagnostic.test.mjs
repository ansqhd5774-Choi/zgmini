import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {buildExternalFeatureSeries} from "../scripts/pc-writer/analyze-dollar-external-features.mjs";

test("external dollar feature diagnostic does not fabricate features from short history",()=>{
  const revisions=[];
  for(let i=0;i<100;i++){
    const d=new Date(Date.UTC(2024,0,1+i)).toISOString().slice(0,10);
    revisions.push({observationDate:d,value:100+i/100,realtimeStart:d,realtimeEnd:"9999-12-31"});
  }
  const out=buildExternalFeatureSeries({revisions,signalVintagePairs:[{signalDate:"2024-04-09",vintageDate:"2024-04-08"}]});
  assert.equal(out.series.absShortMomentum.length,0);
  assert.equal(out.diagnostics[0].ready,false);
});

test("external dollar feature diagnostic is read-only and does not select R2.4",()=>{
  const src=fs.readFileSync(new URL("../scripts/pc-writer/analyze-dollar-external-features.mjs",import.meta.url),"utf8");
  assert.match(src,/DOLLAR_EXTERNAL_FEATURE_DIAGNOSTIC_ONLY/);
  assert.match(src,/independentOfDesignSample:true/);
  assert.match(src,/formulaSelected:false/);
  assert.match(src,/weightSelected:false/);
  assert.match(src,/providerCalls:0/);
  assert.doesNotMatch(src,/publishMarket|remote\.|--publish|INSERT INTO|UPDATE |DELETE FROM/);
});
