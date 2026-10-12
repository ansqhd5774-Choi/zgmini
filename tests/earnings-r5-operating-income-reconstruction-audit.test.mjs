import test from "node:test";
import assert from "node:assert/strict";
import {buildOperatingIdentity,buildOperatingIncomeReconstructionAudit} from "../scripts/pc-writer/earnings-r5-operating-income-reconstruction-audit.mjs";

const fact=({val,start,end,filed="2026-08-10",form="10-Q",frame})=>({val,start,end,filed,form,frame,accn:`${end}-${val}`});
const metric=rows=>({units:{USD:rows}});
function doc(){return {cik:"0000000001",facts:{"us-gaap":{
  RevenueFromContractWithCustomerExcludingAssessedTax:metric([
    fact({val:100,start:"2026-04-01",end:"2026-06-30",frame:"CY2026Q2"}),
    fact({val:90,start:"2025-04-01",end:"2025-06-30",filed:"2025-08-10",frame:"CY2025Q2"}),
  ]),
  GrossProfit:metric([
    fact({val:40,start:"2026-04-01",end:"2026-06-30",frame:"CY2026Q2"}),
    fact({val:36,start:"2025-04-01",end:"2025-06-30",filed:"2025-08-10",frame:"CY2025Q2"}),
  ]),
  OperatingExpenses:metric([
    fact({val:25,start:"2026-04-01",end:"2026-06-30",frame:"CY2026Q2"}),
    fact({val:24,start:"2025-04-01",end:"2025-06-30",filed:"2025-08-10",frame:"CY2025Q2"}),
  ]),
  CostOfRevenue:metric([
    fact({val:60,start:"2026-04-01",end:"2026-06-30",frame:"CY2026Q2"}),
    fact({val:54,start:"2025-04-01",end:"2025-06-30",filed:"2025-08-10",frame:"CY2025Q2"}),
  ]),
  CostsAndExpenses:metric([
    fact({val:85,start:"2026-04-01",end:"2026-06-30",frame:"CY2026Q2"}),
    fact({val:78,start:"2025-04-01",end:"2025-06-30",filed:"2025-08-10",frame:"CY2025Q2"}),
  ]),
}}};}

test("operating identities produce expected arithmetic",()=>{
  const out=buildOperatingIdentity({grossProfit:40,operatingExpenses:25,revenue:100,costOfRevenue:60,costsAndExpenses:85});
  assert.equal(out.GP_MINUS_OPEX,15);
  assert.equal(out.REV_MINUS_COSTREV_OPEX,15);
  assert.equal(out.REV_MINUS_COSTS_AND_EXPENSES,15);
});

test("research audit recovers S3 and S4 without changing production contract",()=>{
  const report=buildOperatingIncomeReconstructionAudit({members:[{cik:"1"}],factsByCik:new Map([["0000000001",doc()]]),submissionsByCik:new Map([["0000000001",{sic:"3571"}]]),frame:{frame:"CY2026Q2",priorFrame:"CY2025Q2",end:"2026-06-30",priorEnd:"2025-06-30"},asOf:"2026-10-12"});
  assert.equal(report.status,"PASS");
  assert.equal(report.baseline.S3,0);
  assert.equal(report.baseline.S4,0);
  assert.equal(report.candidates.GP_MINUS_OPEX.S3,1);
  assert.equal(report.candidates.GP_MINUS_OPEX.S4,1);
  assert.equal(report.candidates.REV_MINUS_COSTREV_OPEX.S3,1);
  assert.equal(report.candidates.REV_MINUS_COSTS_AND_EXPENSES.S4,1);
  assert.equal(report.policies.inputContractChanged,false);
  assert.equal(report.policies.productionActivation,false);
});
