import test from "node:test";
import assert from "node:assert/strict";
import {evaluateAgeWindow,findMinimumPassingAge,SAFE_CAPEX_CANDIDATE} from "../scripts/pc-writer/earnings-r5-minimum-safe-age-window-diagnostic.mjs";

function documentFocus({eps=.8,revenue=.8,margin=.8,net=.8,fcf=.69}={}){
  return {coverage:{
    geometryComparableEps:{coverage:eps},
    geometryComparableRevenue:{coverage:revenue},
    geometryComparableMargin:{coverage:margin},
    geometryComparableNetIncome:{coverage:net},
    geometryAlignedFcfInput:{coverage:fcf},
  }};
}
function capexWindow({combined=.7,add=4}={}){
  return {candidates:{[SAFE_CAPEX_CANDIDATE]:{combinedCoverage:combined,candidateOnlyAdds:add,ready:add,overlap:0,identical:0,different:0}}};
}

test("minimum safe age diagnostic requires every SEC coverage gate including S5",()=>{
  const fail=evaluateAgeWindow({ageDays:240,documentFocus:documentFocus({fcf:.691}),capexWindow:capexWindow({combined:.698,add:3})});
  assert.equal(fail.allSecGatesPass,false);
  assert.equal(fail.gates.S5,false);
  const pass=evaluateAgeWindow({ageDays:241,documentFocus:documentFocus({fcf:.693}),capexWindow:capexWindow({combined:.701,add:3})});
  assert.equal(pass.allSecGatesPass,true);
  assert.equal(pass.safeCandidateAccepted,false);
});

test("minimum passing age chooses the first passing window and does not approve the candidate",()=>{
  const rows=[
    {ageDays:242,allSecGatesPass:true},
    {ageDays:240,allSecGatesPass:false},
    {ageDays:241,allSecGatesPass:true},
  ];
  assert.equal(findMinimumPassingAge(rows)?.ageDays,241);
});
