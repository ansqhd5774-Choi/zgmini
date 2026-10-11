import test from "node:test";
import assert from "node:assert/strict";
import {
  E1_R5_BEA_CONTRACT,
  E1_R5_BLS_CONTRACT,
  E1_R5_FORWARD_CONTRACT,
  classifySecFact,
  isConsolidatedSecFact,
  secDurationAllowed,
  secMetricForTag,
  secUnitAllowed,
  validateSecFsdsHeaders,
} from "../lib/market-score/earnings-e1-r5-input-contract.mjs";

test("SEC FSDS contract requires submission identity and numeric fact timing fields",()=>{
  const pass=validateSecFsdsHeaders({
    submissionHeaders:["adsh","cik","form","period","filed","fy","fp","sic"],
    numberHeaders:["adsh","tag","version","ddate","qtrs","uom","value","coreg"],
  });
  assert.equal(pass.status,"PASS");
  const fail=validateSecFsdsHeaders({submissionHeaders:["adsh","cik"],numberHeaders:["adsh","tag"]});
  assert.equal(fail.status,"FAIL");
  assert.ok(fail.missingSubmission.includes("filed"));
  assert.ok(fail.missingNumber.includes("qtrs"));
});

test("SEC tag mapping preserves existing E1 revenue semantics and adds R5 cash-flow inputs",()=>{
  assert.equal(secMetricForTag("EarningsPerShareDiluted"),"eps");
  assert.equal(secMetricForTag("RevenueFromContractWithCustomerExcludingAssessedTax"),"revenue");
  assert.equal(secMetricForTag("Revenues"),"revenue");
  assert.equal(secMetricForTag("SalesRevenueNet"),"revenue");
  assert.equal(secMetricForTag("OperatingIncomeLoss"),"operatingIncome");
  assert.equal(secMetricForTag("NetIncomeLoss"),"netIncome");
  assert.equal(secMetricForTag("NetCashProvidedByUsedInOperatingActivities"),"operatingCashFlow");
  assert.equal(secMetricForTag("PaymentsToAcquirePropertyPlantAndEquipment"),"capex");
  assert.equal(secMetricForTag("CustomRegistrantMetric"),null);
});

test("income statement facts must be single-quarter while cash-flow facts may be cumulative",()=>{
  assert.equal(secDurationAllowed("eps",1),true);
  assert.equal(secDurationAllowed("eps",2),false);
  assert.equal(secDurationAllowed("revenue",1),true);
  assert.equal(secDurationAllowed("operatingIncome",1),true);
  assert.equal(secDurationAllowed("netIncome",1),true);
  for(const qtrs of [1,2,3,4]){
    assert.equal(secDurationAllowed("operatingCashFlow",qtrs),true);
    assert.equal(secDurationAllowed("capex",qtrs),true);
  }
});

test("SEC fact classifier rejects co-registrants, wrong duration and wrong units",()=>{
  assert.equal(isConsolidatedSecFact(null),true);
  assert.equal(isConsolidatedSecFact(""),true);
  assert.equal(isConsolidatedSecFact("0000123456"),false);
  assert.equal(secUnitAllowed("eps","USD-per-shares"),true);
  assert.equal(secUnitAllowed("revenue","USD"),true);
  assert.equal(secUnitAllowed("revenue","shares"),false);

  assert.deepEqual(classifySecFact({tag:"Revenues",qtrs:1,uom:"USD",coreg:null}),{status:"ACCEPT",reason:null,metric:"revenue"});
  assert.equal(classifySecFact({tag:"Revenues",qtrs:2,uom:"USD",coreg:null}).reason,"INVALID_DURATION");
  assert.equal(classifySecFact({tag:"Revenues",qtrs:1,uom:"shares",coreg:null}).reason,"INVALID_UNIT");
  assert.equal(classifySecFact({tag:"Revenues",qtrs:1,uom:"USD",coreg:"1"}).reason,"COREGISTRANT_FACT");
});

test("BEA and BLS contracts remain direct-download and API-key free",()=>{
  assert.equal(E1_R5_BEA_CONTRACT.seriesCode,"A051RC");
  assert.equal(E1_R5_BEA_CONTRACT.apiRequired,false);
  assert.equal(E1_R5_BLS_CONTRACT.producerInput.apiRequired,false);
  assert.equal(E1_R5_BLS_CONTRACT.producerInput.includesImports,true);
  assert.equal(E1_R5_BLS_CONTRACT.producerInput.excludesLabor,true);
  assert.equal(E1_R5_BLS_CONTRACT.producerInput.excludesCapitalInvestment,true);
  assert.equal(E1_R5_BLS_CONTRACT.unitLaborCost.seriesId,"PRS85006111");
  assert.equal(E1_R5_BLS_CONTRACT.unitLaborCost.recalculateGrowth,false);
});

test("unresolved forward EPS source cannot silently become an active input",()=>{
  assert.equal(E1_R5_FORWARD_CONTRACT.forwardEpsRevision.status,"SOURCE_UNRESOLVED");
  assert.equal(E1_R5_FORWARD_CONTRACT.forwardEpsRevision.requirement,"FREE_COMMERCIAL_USE_PIT_CONSENSUS_HISTORY");
  assert.equal(E1_R5_FORWARD_CONTRACT.guidance.noGuidancePolicy,"MISSING_NOT_NEUTRAL");
});
