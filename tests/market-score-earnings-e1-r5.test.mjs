import test from "node:test";
import assert from "node:assert/strict";
import {E1_R5_BLOCK_WEIGHTS,E1_R5_FORWARD_SUBWEIGHTS,E1_R5_SCORE_KEYS,E1_R5_VERSION,E1_R5_WEIGHTS,buildEarningsE1R5,historicalPercentile,scoreEarningsE1R5Raw} from "../lib/market-score/earnings-e1-r5.mjs";
const near=(actual,expected,tolerance=1e-12)=>assert.ok(Math.abs(actual-expected)<=tolerance,`${actual} != ${expected}`);

test("E1-R5 locks approved weights and block shares",()=>{
 assert.equal(E1_R5_VERSION,"E1-R5");
 assert.deepEqual(E1_R5_WEIGHTS,{S1:.15,S2:.08,S3:.08,S4:.10,S5:.06,S6:.08,S7:.10,S8:.05,S9:.05,S10:.10,S11:.05,S12:.07,S13:.03});
 assert.deepEqual(E1_R5_BLOCK_WEIGHTS,{actual:.55,breadth:.20,costPressure:.15,forward:.10});
 assert.deepEqual(E1_R5_FORWARD_SUBWEIGHTS,{S12A:4,S12B:3});near(Object.values(E1_R5_WEIGHTS).reduce((a,b)=>a+b,0),1);
});

test("historical percentile uses midpoint rank and inverse pressure direction",()=>{assert.equal(historicalPercentile(2,[1,2,2,3]),50);assert.equal(historicalPercentile(4,[1,2,3]),100);assert.equal(historicalPercentile(4,[1,2,3],{inverse:true}),0);});

test("all 13 components are required and never reweighted",()=>{const scores=Object.fromEntries(E1_R5_SCORE_KEYS.map(key=>[key,50]));const ready=buildEarningsE1R5({scores});assert.equal(ready.status,"READY");assert.equal(ready.score,50);near(ready.blocks.actual,50);near(ready.blocks.breadth,50);near(ready.blocks.costPressure,50);near(ready.blocks.forward,50);scores.S10=null;const partial=buildEarningsE1R5({scores});assert.equal(partial.status,"PARTIAL");assert.equal(partial.score,null);assert.deepEqual(partial.missing,["S10"]);assert.equal(partial.noReweight,true);});

test("raw normalization applies inverse only to S10/S11 and 4:3 S12 mix",()=>{const raw={},histories={};for(let i=1;i<=11;i++){raw[`S${i}`]=2;histories[`S${i}`]=[1,2,3];}Object.assign(raw,{S12A:3,S12B:4,S13:2});Object.assign(histories,{S12A:[1,2,3,4],S12B:[1,2,3,4],S13:[1,2,3,4]});const result=scoreEarningsE1R5Raw({raw,histories});assert.equal(result.status,"READY");assert.equal(result.components.S10,50);assert.equal(result.components.S11,50);assert.equal(result.forwardScores.S12A,62.5);assert.equal(result.forwardScores.S12B,87.5);near(result.components.S12,(4*62.5+3*87.5)/7);assert.equal(result.components.S13,37.5);});
