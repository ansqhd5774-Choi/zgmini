import test from "node:test";
import assert from "node:assert/strict";
import {classifyTotalCapexLabel,isPhysicalCashCapexCandidate,strictPresentationDecision} from "../scripts/pc-writer/earnings-r5-fiscal-s5-total-capex-presentation-audit.mjs";

test("physical cash capex candidate rejects broad productive and mineral tags",()=>{
  assert.equal(isPhysicalCashCapexCandidate("PaymentsToAcquireOtherPropertyPlantAndEquipment",{description:"Amount of cash outflow from the acquisition of long-lived physical assets"}),true);
  assert.equal(isPhysicalCashCapexCandidate("PaymentsToAcquireMachineryAndEquipment",{description:"The cash outflow for acquisition of machinery and equipment"}),true);
  assert.equal(isPhysicalCashCapexCandidate("PaymentsToAcquireOilAndGasEquipment",{description:"The cash outflow to purchase long lived physical asset used for normal oil and gas operations"}),true);
  assert.equal(isPhysicalCashCapexCandidate("PaymentsToAcquireProductiveAssets",{description:"cash outflow for property plant equipment software and other intangible assets"}),false);
  assert.equal(isPhysicalCashCapexCandidate("PaymentsToAcquireOilAndGasPropertyAndEquipment",{description:"cash outflow to purchase long lived physical asset and mineral interests"}),false);
});

test("presentation classifier requires total capex wording and rejects partial lines",()=>{
  assert.equal(classifyTotalCapexLabel("Capital expenditures"),"TOTAL_CAPEX");
  assert.equal(classifyTotalCapexLabel("Purchases of property and equipment"),"TOTAL_CAPEX");
  assert.equal(classifyTotalCapexLabel("Additions to Other Property, Plant and Equipment"),"PARTIAL_OR_BROAD");
  assert.equal(classifyTotalCapexLabel("Flight equipment, including advance payments"),"PARTIAL_OR_BROAD");
  assert.equal(classifyTotalCapexLabel("Property acquisitions"),"PARTIAL_OR_BROAD");
});

test("strict presentation accepts current total label when prior presentation is unavailable",()=>{
  const decision=strictPresentationDecision({currentRows:[{stmt:"CF",plabel:"Capital expenditures"}],priorRows:[]});
  assert.equal(decision.accepted,true);
});

test("strict presentation rejects conflicting prior partial label",()=>{
  const decision=strictPresentationDecision({currentRows:[{stmt:"CF",plabel:"Capital expenditures"}],priorRows:[{stmt:"CF",plabel:"Additions to Other Property, Plant and Equipment"}]});
  assert.equal(decision.accepted,false);
});
