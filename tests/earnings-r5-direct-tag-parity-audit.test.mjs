import test from "node:test";
import assert from "node:assert/strict";
import {looksDirectOperating,NARROW_CAPEX_TAGS,rankDirectOperating} from "../scripts/pc-writer/earnings-r5-direct-tag-parity-audit.mjs";

test("direct operating tag filter keeps direct income/profit concepts and rejects expenses",()=>{
  assert.equal(looksDirectOperating("OperatingProfitLoss"),true);
  assert.equal(looksDirectOperating("OperatingIncome"),true);
  assert.equal(looksDirectOperating("OperatingExpenses"),false);
  assert.equal(looksDirectOperating("NetCashProvidedByUsedInOperatingActivities"),false);
});

test("narrow capex candidates exclude broad productive-assets concept",()=>{
  assert.equal(NARROW_CAPEX_TAGS.includes("PaymentsToAcquireProductiveAssets"),false);
  assert.equal(NARROW_CAPEX_TAGS.includes("PaymentsToAcquireOtherPropertyPlantAndEquipment"),true);
  assert.equal(NARROW_CAPEX_TAGS.includes("PaymentsToAcquireOilAndGasPropertyAndEquipment"),true);
});

test("direct operating ranking prioritizes missing pair coverage",()=>{
  const map=new Map([
    ["OperatingProfitLoss",{missingCurrent:new Set(["1","2"]),missingPair:new Set(["1"]),overlap:3,exact:3,within01pct:3,within1pct:3,greater:0,less:0}],
    ["OperatingIncomeAlternative",{missingCurrent:new Set(["1"]),missingPair:new Set(["1","2"]),overlap:1,exact:1,within01pct:1,within1pct:1,greater:0,less:0}],
  ]);
  const ranked=rankDirectOperating(map);
  assert.equal(ranked[0].tag,"OperatingIncomeAlternative");
  assert.equal(ranked[0].missingPair,2);
});
