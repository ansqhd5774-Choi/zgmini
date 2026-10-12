import test from "node:test";
import assert from "node:assert/strict";
import {compareEpsFsdsToCompanyfacts,summarizeCapexCoexistence,companyFactsEpsFacts} from "../scripts/pc-writer/earnings-r5-sec-semantic-parity-audit.mjs";

test("EPS FSDS USD rows can be parity-checked against Companyfacts per-share rows",()=>{
  const doc={facts:{"us-gaap":{EarningsPerShareDiluted:{units:{"USD/shares":[{val:1.25,accn:"0000000001-26-000001",end:"2026-06-30",filed:"2026-08-01",form:"10-Q"}]}}}}};
  const company=companyFactsEpsFacts(doc);
  const result=compareEpsFsdsToCompanyfacts([{val:1.25,adsh:"0000000001-26-000001",ddate:"2026-06-30"}],company);
  assert.equal(result.rows,1);
  assert.equal(result.exactAccnEndMatch,1);
  assert.equal(result.valueEqual,1);
  assert.equal(result.valueMismatch,0);
});

test("EPS parity audit detects mismatched as-filed values",()=>{
  const result=compareEpsFsdsToCompanyfacts([{val:1.30,adsh:"a",ddate:"2026-06-30"}],[{val:1.25,accn:"a",end:"2026-06-30",unit:"USD/shares"}]);
  assert.equal(result.exactAccnEndMatch,1);
  assert.equal(result.valueEqual,0);
  assert.equal(result.valueMismatch,1);
});

test("CAPEX coexistence audit distinguishes broader productive-assets values",()=>{
  const result=summarizeCapexCoexistence([
    {approved:[{val:100}],candidate:[{val:100}]},
    {approved:[{val:100}],candidate:[{val:130}]},
    {approved:[{val:120}],candidate:[{val:100}]},
  ]);
  assert.equal(result.comparableUnique,3);
  assert.equal(result.equal,1);
  assert.equal(result.candidateGreater,1);
  assert.equal(result.candidateLess,1);
});
