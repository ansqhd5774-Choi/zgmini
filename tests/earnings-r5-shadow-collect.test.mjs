import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {formatEarningsR5ShadowCollectionText} from "../scripts/pc-writer/earnings-r5-shadow-collect.mjs";

test("one-command R5 shadow collection emits copyable bounded evidence",()=>{
  const text=formatEarningsR5ShadowCollectionText({
    status:"PARTIAL",
    at:"2026-10-11T00:00:00.000Z",
    dbWrites:0,
    collection:{networkCalls:4,download:{requestCount:4},extraction:{status:"PASS",selected:500,extracted:500}},
    preflight:{
      status:"PARTIAL",at:"2026-10-11T00:00:00.000Z",active:false,networkCalls:0,dbReads:1,dbWrites:0,
      universe:{status:"PASS",periodEnd:"2026-06-30",memberCount:500},
      inputs:{
        secCompanyFacts:{status:"PASS",filesFound:500,universeCount:500,parsedFiles:500,explicitQuarterCoverage:{eps:{coverage:0.9,matched:450,universeCount:500}},q4ExplicitIssuerCounts:{eps:420},q4EpsAnnualMinusNineMonths:"FORBIDDEN"},
        secFsdsSecondary:{status:"MISSING"},
        blsUnitLaborCost:{status:"PASS",observationCount:100,latest:{year:2026,quarter:2,value:1.4}},
        blsProducerInput:{status:"PASS",sheets:["Input"]},
        beaCorporateProfits:{status:"PARTIAL",quarterlyMatchCount:0},
      },
    },
  });
  assert.match(text,/E1-R5 SHADOW COLLECTION: PARTIAL/);
  assert.match(text,/NETWORK_CALLS: 4/);
  assert.match(text,/DB_WRITES: 0/);
  assert.match(text,/SEC_EXTRACTION: PASS selected=500 extracted=500/);
  assert.match(text,/SEC_Q4_EPS_ANNUAL_MINUS_9M: FORBIDDEN/);
});

test("one-command R5 shadow collector has no D1 publication or schema mutation path",()=>{
  const source=fs.readFileSync(new URL("../scripts/pc-writer/earnings-r5-shadow-collect.mjs",import.meta.url),"utf8");
  assert.equal(/D1|publish|INSERT\s|UPDATE\s|DELETE\s|CREATE\s+TABLE/i.test(source),false);
  assert.equal(/dbWrites:0/.test(source),true);
});
