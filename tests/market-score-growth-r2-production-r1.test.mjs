import test from "node:test";
import assert from "node:assert/strict";
import {createMarketScoreR1Handler} from "../worker/market-score-r1.mjs";
import {buildStoredGrowthR2Domain} from "../lib/market-score/growth-r2-worker-domain-r1.mjs";
import {GROWTH_R2_FEATURE_IDS} from "../lib/market-score/growth-r2-contract.mjs";

const rows=(n=84,start=100)=>Array.from({length:n},(_,i)=>({observationDate:`${2019+Math.floor(i/12)}-${String(i%12+1).padStart(2,"0")}-01`,value:start+i}));
const baseDiagnostics={inflationStability:{status:"READY",score:60,missing:[]},recessionDefense:{status:"READY",score:58,missing:[]},creditRiskDefense:{status:"READY",score:55,missing:[]}};
const collectInputs=async()=>({series:{UNRATE:rows(84,4),PAYEMS:rows(84,150000),DGS10:rows(320,3.5),DTWEXBGS:rows(320,100)},external:{registeredFundFlowRows:[]}});
const orchestrate=()=>({historyMode:"CURRENT_VINTAGE_ONLY",lookAheadSafe:false,snapshot:{diagnostics:baseDiagnostics},artifacts:{supply:{rows:[]}},limitations:{}});
const unavailable=async()=>({status:"UNAVAILABLE",score:null,missingFactors:["X"],indicators:[],trend:[]});

test("Growth R2 overrides D2 only when stored domain is READY",async()=>{
  for(const [growth,expected,useR2] of [
    [{status:"NOT_READY",score:null,missingFactors:["G010"],methodologyVersion:"GROWTH_R2_G16_CANDIDATE_R1"},58,false],
    [{status:"PARTIAL",score:null,missingFactors:["G010"],methodologyVersion:"GROWTH_R2_G16_CANDIDATE_R1"},58,false],
    [{status:"UNAVAILABLE",score:null,missingFactors:["G010"],methodologyVersion:"GROWTH_R2_G16_CANDIDATE_R1"},58,false],
    [{status:"READY",score:71.25,missingFactors:[],staleFactors:[],indicators:[],trend:[],methodologyVersion:"GROWTH_R2_G16_CANDIDATE_R1",updatedAt:"2026-08-01"},71.25,true],
  ]){
    const h=createMarketScoreR1Handler({env:{},collectInputs,orchestrate,loadGrowthDomain:async()=>growth,loadConsumptionDomain:unavailable,loadInflationDomain:unavailable,collectBreadthDomain:unavailable,loadLiquidityHistory:async()=>[],now:()=>new Date("2026-09-29T00:00:00Z")});
    const res=await h(new Request("https://zgmini.kr/api/market-score"));
    const body=await res.json();
    const g=body.domains.find(x=>x.id==="growth");
    assert.equal(g.score,expected);
    if(useR2)assert.equal(g.methodologyVersion,"GROWTH_R2_G16_CANDIDATE_R1");
    else assert.notEqual(g.methodologyVersion,"GROWTH_R2_G16_CANDIDATE_R1");
  }
});

test("stored Growth R2 requires exact 24 non-stale features and computes deterministically",async()=>{
  const feature=[];
  for(const [j,id] of GROWTH_R2_FEATURE_IDS.entries())for(let m=1;m<=4;m++)feature.push({candidateId:id,observationDate:`2026-0${m}-01`,availableAt:`2026-0${m+1}-05T00:00:00.000Z`,pitEligible:true,harmonizedValue:j*10+m,sourceHash:`${id}-${m}`,frequency:"MONTHLY"});
  const a=await buildStoredGrowthR2Domain(feature,{asOf:"2026-06-01"});const b=await buildStoredGrowthR2Domain(feature,{asOf:"2026-06-01"});assert.equal(a.status,"READY");assert.equal(a.coverage,24);assert.equal(a.score,b.score);assert.equal(a.inputSnapshotId,b.inputSnapshotId);
  const stale=await buildStoredGrowthR2Domain(feature,{asOf:"2026-09-29"});assert.equal(stale.status,"NOT_READY");assert.ok(stale.staleFactors.length>0);
});
