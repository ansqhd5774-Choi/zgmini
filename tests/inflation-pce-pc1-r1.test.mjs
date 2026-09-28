import test from "node:test";
import assert from "node:assert/strict";
import {
  approvedPcePc1Exception,
  pcePc1VintageField,
  INFLATION_PCE_PC1_CONTRACT,
} from "../worker/inflation-pce-pc1-store.mjs";

test("PCE pc1 contract preserves exact approved exception and field name",()=>{
  assert.equal(pcePc1VintageField("PCEPILFE","2003-12-23"),"PCEPILFE_PC1_20031223");
  assert.equal(approvedPcePc1Exception("PCEPILFE","2003-11-01","2003-12-23"),0.8);
  assert.equal(approvedPcePc1Exception("PCEPI","2003-11-01","2003-12-23"),1.3);
  assert.equal(approvedPcePc1Exception("PCEPI","2003-10-01","2003-12-23"),null);
  assert.equal(INFLATION_PCE_PC1_CONTRACT.providerRequests,2);
  assert.equal(INFLATION_PCE_PC1_CONTRACT.automaticRetries,0);
  assert.equal(INFLATION_PCE_PC1_CONTRACT.scoringReadsProvider,false);
});
