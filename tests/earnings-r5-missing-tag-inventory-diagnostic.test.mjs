import test from "node:test";
import assert from "node:assert/strict";
import {tagLooksOperating,tagLooksCapex,rankInventory} from "../scripts/pc-writer/earnings-r5-missing-tag-inventory-diagnostic.mjs";

test("operating tag inventory filters relevant standard concepts",()=>{
  assert.equal(tagLooksOperating("IncomeLossFromContinuingOperationsBeforeIncomeTaxesExtraordinaryItemsNoncontrollingInterest"),true);
  assert.equal(tagLooksOperating("GrossProfit"),true);
  assert.equal(tagLooksOperating("Assets"),false);
});

test("capex tag inventory filters acquisition and productive asset concepts",()=>{
  assert.equal(tagLooksCapex("PaymentsToAcquireProductiveAssets"),true);
  assert.equal(tagLooksCapex("PaymentsToAcquireBusinessesNetOfCashAcquired"),true);
  assert.equal(tagLooksCapex("RevenueFromContractWithCustomerExcludingAssessedTax"),false);
});

test("inventory ranking prioritizes pair coverage then current coverage",()=>{
  const map=new Map([["A",{current:4,prior:4,pair:2}],["B",{current:3,prior:3,pair:3}],["C",{current:7,prior:1,pair:1}]]);
  assert.deepEqual(rankInventory(map,"pair",3).map(x=>x.tag),["B","A","C"]);
});
