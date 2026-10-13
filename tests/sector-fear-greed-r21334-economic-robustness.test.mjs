import test from "node:test";
import assert from "node:assert/strict";
import {R21334_HORIZONS,R21334_MODELS,R21334_REFERENCE_OBSERVATIONS,analyzeR21334NonOverlap60,decomposeR21334SectorDeltas,analyzeR21334CrossSectionalSigns,analyzeR21334LosoStability} from "../scripts/pc-writer/sector-fear-greed-r21334-economic-robustness.mjs";

test("R2.13.34 preserves the approved diagnostic contract",()=>{
  assert.deepEqual(R21334_HORIZONS,[5,20,60]);
  assert.deepEqual(R21334_MODELS,["fiveRaw","sixRaw","fiveSmoothed","sixSmoothed"]);
  assert.equal(R21334_REFERENCE_OBSERVATIONS,756);
});

function noSummary(medianIC=-0.5){return {medianIC,buckets:[{offset:0,n:3,rho:-0.5},{offset:1,n:4,rho:-0.4},{offset:2,n:3,rho:-0.5}]};}
function sector(tsBase=0,no=-0.5){const timeSeries={},nonOverlap={};for(const h of [5,20,60]){timeSeries[h]={returnIC:tsBase+h/1000,drawdownIC:tsBase-h/1000};nonOverlap[h]={return:noSummary(no),drawdown:noSummary(no)};}return {timeSeries,nonOverlap};}
function model(tsBase=0,no=-0.5,losoBase=0.05){const sectors={A:sector(tsBase,no),B:sector(tsBase+.01,no)},crossSectional={},loso={},nonOverlap={};for(const h of [5,20,60]){crossSectional[h]={return:{medianIC:tsBase+.1},drawdown:{medianIC:tsBase-.1}};loso[h]={return:{maxAbsDeltaMedianIC:losoBase,signFlipOmissions:0},drawdown:{maxAbsDeltaMedianIC:losoBase+.01,signFlipOmissions:0}};nonOverlap[h]={return:{medianOffsetICAcrossSectors:no},drawdown:{medianOffsetICAcrossSectors:no}};}return {sectors,crossSectional,loso,nonOverlap};}

test("R2.13.34 diagnoses 60D non-overlap small-n discrete Spearman regime",()=>{
  const models=Object.fromEntries(R21334_MODELS.map(id=>[id,model()]));
  const x=analyzeR21334NonOverlap60(models);
  assert.equal(x.fiveRaw.return.smallSampleDiscreteRegime,true);
  assert.equal(x.fiveRaw.return.minPairs,3);
  assert.equal(x.fiveRaw.return.maxPairs,4);
  assert.equal(x.fiveRaw.return.threeOrFourShare,1);
  assert.equal(x.fiveRaw.return.classification,"SMALL_N_DISCRETE_SPEARMAN_60D");
});

test("R2.13.34 decomposes per-sector five-to-six deltas without selecting a direction",()=>{
  const models={fiveRaw:model(0),sixRaw:model(.02),fiveSmoothed:model(-.01),sixSmoothed:model(.01)};
  const x=decomposeR21334SectorDeltas(models);
  assert.equal(x.raw.sectors,2);
  assert.equal(x.raw.sectorDetail[0].horizons[20].return.timeSeriesDelta,0.02);
  assert.equal(x.raw.timeSeriesHigher,12);
});

test("R2.13.34 audits cross-sectional sign preservation",()=>{
  const models={fiveRaw:model(0),sixRaw:model(.02),fiveSmoothed:model(0),sixSmoothed:model(0)};
  models.fiveRaw.crossSectional[20].drawdown.medianIC=0.01;
  models.sixRaw.crossSectional[20].drawdown.medianIC=-0.02;
  const x=analyzeR21334CrossSectionalSigns(models);
  assert.equal(x.raw[20].drawdown.signPreserved,false);
  assert.equal(x.raw[20].drawdown.delta,-0.03);
});

test("R2.13.34 compares LOSO sector sensitivity without changing model selection",()=>{
  const models={fiveRaw:model(0,-.5,.06),sixRaw:model(0,-.5,.04),fiveSmoothed:model(0,-.5,.03),sixSmoothed:model(0,-.5,.05)};
  const x=analyzeR21334LosoStability(models);
  assert.equal(x.raw[5].return.sixLessSectorSensitive,true);
  assert.equal(x.raw[5].return.deltaMaxAbs,-0.02);
  assert.equal(x.smoothed[5].return.sixLessSectorSensitive,false);
  assert.equal(x.smoothed[5].return.deltaMaxAbs,0.02);
});
