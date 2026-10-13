import test from "node:test";
import assert from "node:assert/strict";
import {R21339_FEATURE,R21339_HORIZONS,R21339_REFERENCE_OBSERVATIONS,R21339_WINDOW,R21339_BLOCK_SIZE,R21339_BLOCKS,splitR21339Blocks,summarizeR21339Series,analyzeR21339Leadership} from "../scripts/pc-writer/sector-fear-greed-r21339-leadership-sign-persistence.mjs";

function dates252(){return Array.from({length:252},(_,i)=>new Date(Date.UTC(2025,0,1+i)).toISOString().slice(0,10));}
function makeRows(dates,sign=-1){return dates.map((date,i)=>({date,partialIcVsFiveRaw:sign*(0.01+(i%7)/1000)}));}

test("R2.13.39 preserves the diagnostic contract",()=>{assert.equal(R21339_FEATURE,"speculativeLeadership");assert.deepEqual(R21339_HORIZONS,[5,20,60]);assert.equal(R21339_REFERENCE_OBSERVATIONS,756);assert.equal(R21339_WINDOW,252);assert.equal(R21339_BLOCK_SIZE,21);assert.equal(R21339_BLOCKS,12);});

test("R2.13.39 splits 252 dates into twelve 21-session blocks",()=>{const dates=dates252(),blocks=splitR21339Blocks(dates);assert.equal(blocks.length,12);assert.ok(blocks.every(x=>x.dates.length===21));assert.equal(blocks[0].dates[0],dates[0]);assert.equal(blocks.at(-1).dates.at(-1),dates.at(-1));});

test("R2.13.39 summarizes persistent negative series",()=>{const dates=dates252(),blocks=splitR21339Blocks(dates),x=summarizeR21339Series(makeRows(dates,-1),blocks);assert.equal(x.fullSign,"NEGATIVE");assert.equal(x.blockSummary.negative,12);assert.equal(x.leaveOneBlockOut.negative,12);assert.equal(x.blockSummary.longestNegativeRun,12);});

test("R2.13.39 detects block sign instability",()=>{const dates=dates252(),blocks=splitR21339Blocks(dates),rows=[];for(const b of blocks){const s=b.block%2===0?1:-1;rows.push(...makeRows(b.dates,s));}const x=summarizeR21339Series(rows,blocks);assert.equal(x.blockSummary.negative,6);assert.equal(x.blockSummary.positive,6);assert.equal(x.blockSummary.longestNegativeRun,1);});

test("R2.13.39 analyzes six leadership cells without selecting a candidate",()=>{const dates=dates252(),detail={};for(const h of [5,20,60]){detail[h]={return:makeRows(dates,-1),drawdown:makeRows(dates,-1)};}const source={featureResults:{speculativeLeadership:{crossSectional:{detail}}}};const x=analyzeR21339Leadership(source);assert.equal(x.synthesis.fullNegativeCells,6);assert.equal(x.synthesis.fullPositiveCells,0);assert.equal(x.synthesis.blockMajorityNegativeCells,6);assert.equal(x.synthesis.leaveOneBlockOutAllNegativeCells,6);assert.equal(x.synthesis.judgment,"NO_SELECTION_DIAGNOSTIC_ONLY");});
