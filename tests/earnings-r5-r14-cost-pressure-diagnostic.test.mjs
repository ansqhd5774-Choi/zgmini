import test from "node:test";
import assert from "node:assert/strict";
import {formatEarningsR5R14CostPressureDiagnosticText} from "../scripts/pc-writer/earnings-r5-r14-cost-pressure-diagnostic.mjs";

test("R14 cost-pressure diagnostic text preserves fail-closed and non-production evidence",()=>{
  const text=formatEarningsR5R14CostPressureDiagnosticText({
    status:"PARTIAL",
    at:"2026-10-12T00:00:00.000Z",
    asOf:"2026-10-12",
    frame:{frame:"CY2026Q2"},
    universe:{memberCount:500},
    sourceCoverage:{companyFactsFiles:500,submissionFiles:500},
    bls:{
      input:{status:"PASS",rootSeriesCount:69,annualized3mReadyCount:69},
      outputMeta:{naics3Count:60},
      output:{status:"PASS",readyCount:60},
    },
    mapping:{status:"PASS",approvedRows:800,ambiguousRows:120,noNaicsRows:30,reason:null},
    s10:{
      status:"PARTIAL",raw:null,issuerCoverage:null,revenueCoverage:null,
      classification:{classes:{EXACT:430,AMBIGUOUS:25,NO_NAICS:15,NO_PPI:30},total:500,complete:true},
    },
    s11:{status:"PASS",raw:1.4,transform:"DIRECT_YOY_PERCENT_NO_RECALCULATION"},
    networkCalls:0,
    dbWrites:0,
    policies:{productionActivation:false},
  });
  assert.match(text,/E1-R5 R14 COST PRESSURE DIAGNOSTIC: PARTIAL/);
  assert.match(text,/SIC_NAICS3_MAPPING: PASS exact=800 ambiguous=120 noNaics=30/);
  assert.match(text,/S10_CLASSES: EXACT=430 AMBIGUOUS=25 NO_NAICS=15 NO_PPI=30 total=500 complete=YES/);
  assert.match(text,/S10: PARTIAL raw=null/);
  assert.match(text,/S11: PASS raw=1\.4 transform=DIRECT_YOY_PERCENT_NO_RECALCULATION/);
  assert.match(text,/NETWORK_CALLS: 0/);
  assert.match(text,/DB_WRITES: 0/);
  assert.match(text,/PRODUCTION_ACTIVATION: NO/);
});
