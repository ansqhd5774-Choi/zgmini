import test from "node:test";
import assert from "node:assert/strict";
import {R21335_HORIZONS,R21335_REFERENCE_OBSERVATIONS,R21335_EXPECTED_IC_DIRECTION,classifyR21335DirectionalChange,analyzeR21335CrossSectional,analyzeR21335SectorTimeSeries,analyzeR21335JointRobustness} from "../scripts/pc-writer/sector-fear-greed-r21335-directional-validation.mjs";

test("R2.13.35 preserves the diagnostic contract",()=>{
  assert.deepEqual(R21335_HORIZONS,[5,20,60]);
  assert.equal(R21335_REFERENCE_OBSERVATIONS,756);
  assert.equal(R21335_EXPECTED_IC_DIRECTION,"NEGATIVE");
});

test("R2.13.35 classifies stronger and weaker negative IC without thresholds",()=>{
  assert.equal(classifyR21335DirectionalChange(-0.10,-0.20).class,"STRONGER_NEGATIVE");
  assert.equal(classifyR21335DirectionalChange(-0.20,-0.10).class,"WEAKER_NEGATIVE");
  assert.equal(classifyR21335DirectionalChange(-0.10,-0.10).class,"EQUAL");
});

function fixture(){
  const crossSectionalSigns={raw:{},smoothed:{}};
  const losoStability={raw:{},smoothed:{}};
  for(const type of ["raw","smoothed"]){for(const h of [5,20,60]){
    crossSectionalSigns[type][h]={return:{fiveMedianIC:-0.1,sixMedianIC:-0.2},drawdown:{fiveMedianIC:-0.2,sixMedianIC:-0.1}};
    losoStability[type][h]={return:{sixLessSectorSensitive:true},drawdown:{sixLessSectorSensitive:false}};
  }}
  const sectorDeltas={raw:{sectorDetail:[]},smoothed:{sectorDetail:[]}};
  for(const type of ["raw","smoothed"]){
    const horizons={};for(const h of [5,20,60])horizons[h]={return:{fiveTimeSeriesIC:-0.1,sixTimeSeriesIC:-0.2},drawdown:{fiveTimeSeriesIC:-0.2,sixTimeSeriesIC:-0.1}};
    sectorDeltas[type].sectorDetail.push({sectorId:"technology",horizons});
  }
  return {crossSectionalSigns,losoStability,sectorDeltas};
}

test("R2.13.35 summarizes cross-sectional directional changes",()=>{
  const x=analyzeR21335CrossSectional(fixture());
  assert.equal(x.summary.cells,12);
  assert.equal(x.summary.strongerNegative,6);
  assert.equal(x.summary.weakerNegative,6);
});

test("R2.13.35 decomposes sector time-series directional changes",()=>{
  const x=analyzeR21335SectorTimeSeries(fixture());
  assert.equal(x.summary.cells,12);
  assert.equal(x.summary.strongerNegative,6);
  assert.equal(x.summary.weakerNegative,6);
  assert.equal(x.types.raw.sectors,undefined);
});

test("R2.13.35 joins directional evidence with LOSO stability descriptively",()=>{
  const f=fixture(),cross=analyzeR21335CrossSectional(f),x=analyzeR21335JointRobustness(f,cross);
  assert.equal(x.summary.bothImproved,6);
  assert.equal(x.summary.bothWorsened,6);
  assert.equal(x.summary.directionOnly,0);
  assert.equal(x.summary.stabilityOnly,0);
});
