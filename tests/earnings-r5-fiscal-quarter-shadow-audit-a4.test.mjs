import test from "node:test";
import assert from "node:assert/strict";
import {normalizeInvalidFiscalRowA4,countNonFinancialA4} from "../scripts/pc-writer/earnings-r5-fiscal-quarter-shadow-audit-a4.mjs";

test("A4 removes invalid Companyfacts rows from nonfinancial denominator",()=>{
  const invalid={cik:"0000000001",isFinancial:false,sectorId:"D",current:{},priorYear:{},audit:{status:"INVALID_COMPANYFACTS"}};
  const fixed=normalizeInvalidFiscalRowA4(invalid);
  assert.equal(fixed.isFinancial,null);
  assert.equal(fixed.sectorId,null);
  assert.equal(countNonFinancialA4([fixed]),0);
});

test("A4 preserves valid nonfinancial issuer classification",()=>{
  const valid={cik:"0000000002",isFinancial:false,sectorId:"D",audit:{status:"PASS"}};
  assert.equal(normalizeInvalidFiscalRowA4(valid),valid);
  assert.equal(countNonFinancialA4([valid]),1);
});

test("A4 nonfinancial denominator counts only explicit valid false classifications",()=>{
  const rows=[
    {isFinancial:false,audit:{status:"PASS"}},
    {isFinancial:true,audit:{status:"PASS"}},
    {isFinancial:null,audit:{status:"INVALID_COMPANYFACTS"}},
  ];
  assert.equal(countNonFinancialA4(rows),1);
});
