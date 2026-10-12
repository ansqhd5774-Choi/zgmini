import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {fileURLToPath} from "node:url";
import {R2139_CANDIDATES,buildR2139CandidateSeries,summarizeR2139EmpiricalExtremes} from "../scripts/pc-writer/sector-fear-greed-r2139-alternative-economic-screen.mjs";

const here=path.dirname(fileURLToPath(import.meta.url));
const scriptPath=path.join(here,"..","scripts","pc-writer","sector-fear-greed-r2139-alternative-economic-screen.mjs");

test("R2.13.9 screens the existing-local alternative set without auto-selection",()=>{
  assert.deepEqual(R2139_CANDIDATES,["R24_L50_V50","R24_L60_V40","R24_LOTTERY_ONLY","R24_VOLUME_ONLY","R21_LOTTERY_DEMAND_RAW","R2_SPEC_LEADERSHIP_RAW","R2_SPEC_VOLUME_RAW","R2_TAIL_BALANCE_RAW","R2_MAX_LOTTERY_RAW"]);
});

test("R2.13.9 candidate construction preserves raw components and 60/40 research mix",()=>{
  const raw=[{date:"2026-01-02",lotteryDemand:2,speculativeLeadership:3,speculativeVolume:4,tailBalance:5,maxLottery:6}],r24=[{date:"2026-01-02",score:20,lotterySuperiority:10,volumeSuperiority:30}],out=buildR2139CandidateSeries(raw,r24);
  assert.equal(out.R24_L50_V50[0].score,20);assert.equal(out.R24_L60_V40[0].score,18);assert.equal(out.R24_LOTTERY_ONLY[0].score,10);assert.equal(out.R24_VOLUME_ONLY[0].score,30);assert.equal(out.R21_LOTTERY_DEMAND_RAW[0].score,2);assert.equal(out.R2_SPEC_LEADERSHIP_RAW[0].score,3);assert.equal(out.R2_SPEC_VOLUME_RAW[0].score,4);assert.equal(out.R2_TAIL_BALANCE_RAW[0].score,5);assert.equal(out.R2_MAX_LOTTERY_RAW[0].score,6);
});

test("R2.13.9 empirical extremes use within-series quartiles instead of absolute score bands",()=>{
  const rows=[];for(let i=1;i<=20;i++)rows.push({date:`2026-01-${String(i).padStart(2,"0")}`,score:i,forwardReturn20:-i,forwardReturn60:-2*i,forwardDrawdown20:-i/10,forwardDrawdown60:-i/5});
  const out=summarizeR2139EmpiricalExtremes(rows);assert.ok(out.q25<out.q75);assert.ok(out.metrics.forwardReturn20.top.n>0);assert.ok(out.metrics.forwardReturn20.bottom.n>0);assert.ok(out.metrics.forwardReturn20.topMinusBottom<0);
});

test("R2.13.9 remains local read-only and cannot select or claim options equivalence",()=>{
  const source=fs.readFileSync(scriptPath,"utf8");assert.equal(/\bfetch\s*\(/.test(source),false);assert.equal(/wrangler\s+d1|publication-ledger|INSERT\s+INTO|UPDATE\s+|DELETE\s+FROM/i.test(source),false);assert.match(source,/providerCalls:0/);assert.match(source,/productionFormulaChanged:false/);assert.match(source,/referenceRequirementChanged:false/);assert.match(source,/approvedR1ReferenceRequirement:756/);assert.match(source,/candidateSelected:false/);assert.match(source,/selectionThresholdIntroduced:false/);assert.match(source,/optionsEquivalenceClaimed:false/);assert.match(source,/r24ApprovedForProduction:false/);assert.match(source,/currentR24WeightsChanged:false/);
});
