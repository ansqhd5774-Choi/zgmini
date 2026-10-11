import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  formatEarningsR5OfficialPreflightText,
} from "../scripts/pc-writer/earnings-r5-official-preflight.mjs";

test("official E1-R5 preflight emits copyable TXT summary without changing active state",()=>{
  const text=formatEarningsR5OfficialPreflightText({
    status:"PARTIAL",
    at:"2026-10-11T00:00:00.000Z",
    active:false,
    networkCalls:0,
    dbReads:1,
    dbWrites:0,
    universe:{status:"PASS",periodEnd:"2026-06-30",memberCount:500},
    inputs:{
      secCompanyFacts:{
        status:"PASS",filesFound:490,universeCount:500,parsedFiles:490,
        explicitQuarterCoverage:{eps:{coverage:0.9,matched:450,universeCount:500}},
        q4ExplicitIssuerCounts:{eps:420},
        q4EpsAnnualMinusNineMonths:"FORBIDDEN",
      },
      secFsdsSecondary:{status:"MISSING"},
      blsUnitLaborCost:{status:"PASS",observationCount:120,latest:{year:2026,quarter:2,value:1.4}},
      blsProducerInput:{status:"PASS",sheets:["Input"]},
      beaCorporateProfits:{status:"PARTIAL",quarterlyMatchCount:0},
    },
  });
  assert.match(text,/E1-R5 OFFICIAL PREFLIGHT: PARTIAL/);
  assert.match(text,/ACTIVE: false/);
  assert.match(text,/NETWORK_CALLS: 0/);
  assert.match(text,/DB_WRITES: 0/);
  assert.match(text,/SEC_EPS_EXPLICIT_QUARTER_COVERAGE: 90\.0% \(450\/500\)/);
  assert.match(text,/SEC_Q4_EPS_ANNUAL_MINUS_9M: FORBIDDEN/);
  assert.match(text,/BLS_UNIT_LABOR_COST: PASS observations=120 latest=2026Q2 1\.4/);
  assert.match(text,/MISSING_OR_PARTIAL: BEA/);
});

test("official E1-R5 preflight script remains offline and provider-free",()=>{
  const source=fs.readFileSync(new URL("../scripts/pc-writer/earnings-r5-official-preflight.mjs",import.meta.url),"utf8");
  assert.equal(/\bfetch\s*\(/.test(source),false);
  assert.equal(/https?:\/\//.test(source),false);
  assert.equal(/INSERT\s|UPDATE\s|DELETE\s|CREATE\s+TABLE/i.test(source),false);
});
