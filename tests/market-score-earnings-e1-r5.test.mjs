import test from "node:test";
import assert from "node:assert/strict";
import {
  E1_R5_BLOCK_WEIGHTS,
  E1_R5_FORWARD_SUBWEIGHTS,
  E1_R5_SCORE_KEYS,
  E1_R5_VERSION,
  E1_R5_WEIGHTS,
  buildEarningsE1R5,
  historicalPercentile,
  scoreEarningsE1R5Raw,
} from "../lib/market-score/earnings-e1-r5.mjs";

const near=(actual,expected,tolerance=1e-12)=>assert.ok(Math.abs(actual-expected)<=tolerance,`${actual} != ${expected}`);

test("E1-R5 locks approved 13-component weights and 55/20/15/10 blocks",()=>{
  assert.equal(E1_R5_VERSION,"E1-R5");
  assert.deepEqual(E1_R5_WEIGHTS,{
    S1:0.15,S2:0.08,S3:0.08,S4:0.10,S5:0.06,S6:0.08,
    S7:0.10,S8:0.05,S9:0.05,S10:0.10,S11:0.05,S12:0.07,S13:0.03,
  });
  assert.deepEqual(E1_R5_BLOCK_WEIGHTS,{actual:0.55,breadth:0.20,costPressure:0.15,forward:0.10});
  assert.deepEqual(E1_R5_FORWARD_SUBWEIGHTS,{S12A:4,S12B:3});
  near(Object.values(E1_R5_WEIGHTS).reduce((a,b)=>a+b,0),1);
  near(Object.values(E1_R5_BLOCK_WEIGHTS).reduce((a,b)=>a+b,0),1);
});

test("historical percentile uses mid-rank and supports inverse pressure scoring",()=>{
  assert.equal(historicalPercentile(2,[1,2,2,3]),50);
  assert.equal(historicalPercentile(2,[1,2,2,3],{inverse:true}),50);
  assert.equal(historicalPercentile(4,[1,2,3]),100);
  assert.equal(historicalPercentile(4,[1,2,3],{inverse:true}),0);
  assert.equal(historicalPercentile(1,[]),null);
});

test("E1-R5 composes all 13 scores without reweighting",()=>{
  const scores=Object.fromEntries(E1_R5_SCORE_KEYS.map(key=>[key,50]));
  const result=buildEarningsE1R5({scores,asOfDate:"2026-10-16",retrievedAt:"2026-10-16T00:00:00.000Z"});
  assert.equal(result.status,"READY");
  assert.equal(result.score,50);
  near(result.blocks.actual,50);
  near(result.blocks.breadth,50);
  near(result.blocks.costPressure,50);
  near(result.blocks.forward,50);
  assert.equal(result.noReweight,true);
  assert.deepEqual(result.missing,[]);
});

test("E1-R5 keeps score null when any required component is missing",()=>{
  const scores=Object.fromEntries(E1_R5_SCORE_KEYS.map(key=>[key,50]));
  scores.S12=null;
  const result=buildEarningsE1R5({scores});
  assert.equal(result.status,"PARTIAL");
  assert.equal(result.score,null);
  assert.deepEqual(result.missing,["S12"]);
  assert.equal(result.blocks,null);
  assert.equal(result.noReweight,true);
});

test("E1-R5 preserves exact weighted arithmetic",()=>{
  const scores={S1:100,S2:80,S3:70,S4:60,S5:50,S6:40,S7:30,S8:20,S9:10,S10:90,S11:80,S12:70,S13:60};
  const expected=0.15*100+0.08*80+0.08*70+0.10*60+0.06*50+0.08*40+0.10*30+0.05*20+0.05*10+0.10*90+0.05*80+0.07*70+0.03*60;
  const result=buildEarningsE1R5({scores});
  assert.equal(result.status,"READY");
  assert.equal(result.score,expected);
});

test("raw normalization applies inverse only to S10/S11 and approved 4:3 S12A/S12B mix",()=>{
  const raw={};
  const histories={};
  for(let i=1;i<=11;i++){
    const key=`S${i}`;
    raw[key]=2;
    histories[key]=[1,2,3];
  }
  raw.S12A=3; histories.S12A=[1,2,3,4];
  raw.S12B=4; histories.S12B=[1,2,3,4];
  raw.S13=2; histories.S13=[1,2,3,4];
  const result=scoreEarningsE1R5Raw({raw,histories,asOfDate:"2026-10-16"});
  assert.equal(result.status,"READY");
  for(let i=1;i<=9;i++)assert.equal(result.components[`S${i}`],50);
  assert.equal(result.components.S10,50);
  assert.equal(result.components.S11,50);
  assert.equal(result.forwardScores.S12A,62.5);
  assert.equal(result.forwardScores.S12B,87.5);
  assert.equal(result.forwardScores.S13,37.5);
  near(result.components.S12,(4*62.5+3*87.5)/7);
  assert.equal(result.components.S13,37.5);
  assert.equal(result.historyMode,"CURRENT_AVAILABLE_HISTORY");
  assert.equal(result.normalization,"HISTORICAL_PERCENTILE");
});

test("raw normalization preserves no-reweight when one history is absent",()=>{
  const raw={},histories={};
  for(let i=1;i<=11;i++){const key=`S${i}`;raw[key]=2;histories[key]=[1,2,3];}
  Object.assign(raw,{S12A:2,S12B:2,S13:2});
  Object.assign(histories,{S12A:[1,2,3],S12B:[],S13:[1,2,3]});
  const result=scoreEarningsE1R5Raw({raw,histories});
  assert.equal(result.status,"PARTIAL");
  assert.equal(result.score,null);
  assert.deepEqual(result.missing,["S12"]);
  assert.equal(result.noReweight,true);
});
