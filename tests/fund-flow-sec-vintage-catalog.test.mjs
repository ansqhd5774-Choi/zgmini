import test from "node:test";
import assert from "node:assert/strict";
import {
  SEC_FUND_FLOW_VINTAGE_CATALOG_R1,
  SEC_FUND_FLOW_VINTAGE_CONTRACT_R1,
  validateSecFundFlowVintageCatalogR1,
  latestSecFundFlowVintageAt,
} from "../lib/market-score/sec-fund-flow-vintage-catalog-r1.mjs";

test("SEC fund-flow vintage catalog is strictly release-ordered and official-host only",()=>{
  const out=validateSecFundFlowVintageCatalogR1();
  assert.equal(out.status,"PASS");
  assert.equal(out.releases,10);
  assert.equal(out.first.periodEnd,"2023-09-30");
  assert.equal(out.last.periodEnd,"2025-12-31");
  assert.ok(SEC_FUND_FLOW_VINTAGE_CATALOG_R1.every(item=>item.supportingDataUrl.startsWith("https://www.sec.gov/")&&item.supportingDataUrl.endsWith(".xlsx")));
});

test("SEC fund-flow PIT selector never uses a release published after the requested date",()=>{
  assert.equal(latestSecFundFlowVintageAt("2024-04-17"),null);
  assert.equal(latestSecFundFlowVintageAt("2024-04-18")?.periodEnd,"2023-09-30");
  assert.equal(latestSecFundFlowVintageAt("2024-05-16")?.periodEnd,"2023-09-30");
  assert.equal(latestSecFundFlowVintageAt("2024-05-17")?.periodEnd,"2023-12-31");
  assert.equal(latestSecFundFlowVintageAt("2026-05-25")?.periodEnd,"2025-09-30");
  assert.equal(latestSecFundFlowVintageAt("2026-05-26")?.periodEnd,"2025-12-31");
});

test("SEC fund-flow vintage catalog is research-only and cannot change production",()=>{
  assert.equal(SEC_FUND_FLOW_VINTAGE_CONTRACT_R1.role,"PIT_RESEARCH_SOURCE_CATALOG_ONLY");
  assert.equal(SEC_FUND_FLOW_VINTAGE_CONTRACT_R1.providerCalls,0);
  assert.equal(SEC_FUND_FLOW_VINTAGE_CONTRACT_R1.productionFormulaChanged,false);
  assert.equal(SEC_FUND_FLOW_VINTAGE_CONTRACT_R1.publicationAllowed,false);
  assert.equal(SEC_FUND_FLOW_VINTAGE_CONTRACT_R1.historicalRevisionAware,true);
});
