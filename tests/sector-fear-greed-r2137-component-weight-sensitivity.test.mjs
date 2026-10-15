import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {fileURLToPath} from "node:url";
import {R2137_MIXES,mixR2137History,summarizeR2137Redundancy} from "../scripts/pc-writer/sector-fear-greed-r2137-component-weight-sensitivity.mjs";

const here=path.dirname(fileURLToPath(import.meta.url));
const scriptPath=path.join(here,"..","scripts","pc-writer","sector-fear-greed-r2137-component-weight-sensitivity.mjs");

test("R2.13.7 tests only the approved research grid and keeps current 50/50 present",()=>{
  assert.deepEqual(R2137_MIXES.map(x=>[x.lottery,x.volume]),[[.5,.5],[.6,.4],[.7,.3],[.8,.2]]);
});

test("R2.13.7 component mix preserves exact lottery-volume arithmetic",()=>{
  const history=[{date:"2026-01-02",lotterySuperiority:80,volumeSuperiority:20}];
  assert.equal(mixR2137History(history,.5,.5)[0].score,50);
  assert.equal(mixR2137History(history,.7,.3)[0].score,62);
  assert.equal(mixR2137History(history,.8,.2)[0].score,68);
  assert.equal(mixR2137History(history,.7,.4).length,0);
});

test("R2.13.7 redundancy summary measures Spearman against existing axes without selection",()=>{
  const dates=["2026-01-02","2026-01-05","2026-01-06","2026-01-07"];
  const spec=dates.map((date,i)=>({date,score:i+1}));
  const same=dates.map((date,i)=>({date,score:10*(i+1)}));
  const inverse=dates.map((date,i)=>({date,score:40-10*i}));
  const axisSeries={trend:same,breadth:inverse,demand:same,relativeStrength:same,volatility:inverse};
  const out=summarizeR2137Redundancy(spec,axisSeries,same);
  assert.equal(out.axes.trend,1);
  assert.equal(out.axes.breadth,-1);
  assert.equal(out.fiveAxis,1);
  assert.equal(out.maxAbs,1);
});

test("R2.13.7 remains local read-only Shadow research with no formula selection gate",()=>{
  const source=fs.readFileSync(scriptPath,"utf8");
  assert.equal(/\bfetch\s*\(/.test(source),false);
  assert.equal(/wrangler\s+d1|publication-ledger|INSERT\s+INTO|UPDATE\s+|DELETE\s+FROM/i.test(source),false);
  assert.match(source,/providerCalls:0/);
  assert.match(source,/productionFormulaChanged:false/);
  assert.match(source,/referenceRequirementChanged:false/);
  assert.match(source,/approvedR1ReferenceRequirement:756/);
  assert.match(source,/fillForwardFill:false/);
  assert.match(source,/candidateSelected:false/);
  assert.match(source,/r24ApprovedForProduction:false/);
  assert.match(source,/selectionThresholdIntroduced:false/);
  assert.match(source,/currentR24WeightsUnchanged:\{lottery:\.50,volume:\.50\}/);
});
