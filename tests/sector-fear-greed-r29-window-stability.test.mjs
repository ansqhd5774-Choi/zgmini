import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {analyzeR29WindowStability} from "../scripts/pc-writer/sector-fear-greed-r29-window-stability-diagnostic.mjs";

function fixture(){
  const windows=[126,189,252],sectors={};
  for(const [i,id] of ["a","b","c"].entries()){
    const full={trend:20+20*i,breadth:30+10*i,demand:40+5*i,relativeStrength:25+15*i,volatility:35+8*i};
    const fullComp=.20*full.trend+.20*full.breadth+.15*full.demand+.15*full.relativeStrength+.15*full.volatility;
    const byWindow={};
    for(const [j,w] of windows.entries()){
      const shift=(2-j)*(i+1),current=Object.fromEntries(Object.entries(full).map(([k,v])=>[k,v+shift]));
      const comp=.20*current.trend+.20*current.breadth+.15*current.demand+.15*current.relativeStrength+.15*current.volatility;
      byWindow[String(w)]={currentAxes:current,axisDeltasVsFull:Object.fromEntries(Object.keys(full).map(k=>[k,Math.abs(shift)])),compositeCurrent:comp,compositeDeltaVsFull:Math.abs(comp-fullComp)};
    }
    sectors[id]={fullAvailable:{currentAxes:full,compositeCurrent:fullComp},byWindow};
  }
  return {status:"SHADOW_R28_REFERENCE_WINDOW_COMPLETE",version:"R2.8-REFERENCE-WINDOW-SENSITIVITY",testedWindows:windows,summaryByWindow:{"126":{currentReady:3},"189":{currentReady:3},"252":{currentReady:3}},sectors};
}

test("R2.9 aggregates R2.8 without selecting a window",()=>{
  const out=analyzeR29WindowStability(fixture());
  assert.deepEqual(out.windows,[126,189,252]);
  assert.equal(out.sectorCount,3);
  assert.equal(out.compositeSummary.closestToFullCounts["252"],3);
  assert.equal(out.axisSummary.trend.closestToFullCounts["252"],3);
  assert.equal(out.axisSummary.trend.byWindow["252"].meanAbsDeltaVsFull,0);
  assert.equal(out.compositeSummary.currentWindowSpread.worstSector,"c");
});

test("R2.9 requires completed R2.8 input and multiple windows",()=>{
  assert.throws(()=>analyzeR29WindowStability({}),/R29_R28_INPUT_NOT_READY/);
  const one=fixture();one.testedWindows=[252];
  assert.throws(()=>analyzeR29WindowStability(one),/R29_WINDOWS_INSUFFICIENT/);
});

test("R2.9 implementation remains read-only shadow research",()=>{
  const source=fs.readFileSync(path.join(process.cwd(),"scripts/pc-writer/sector-fear-greed-r29-window-stability-diagnostic.mjs"),"utf8");
  assert.doesNotMatch(source,/fetch\(|https?:\/\/|wrangler\s+d1|INSERT INTO|UPDATE\s+\w+\s+SET|publication-ledger/i);
  assert.match(source,/providerCalls:0/);
  assert.match(source,/productionFormulaChanged:false/);
  assert.match(source,/referenceRequirementChanged:false/);
  assert.match(source,/candidateSelected:false/);
});
