import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {extractLatestFundFlowRelease,evaluateFundFlowProspectiveLedger} from "../scripts/pc-writer/fund-flow-index-prospective-r1.mjs";

test("fund-flow prospective extraction uses official release date and latest raw index flow",()=>{
  const body={
    providerSummary:{secFundFlows:{sourceReleaseDate:"2026-08-20"}},
    external:{registeredFundFlowRows:[
      {observationDate:"2026-02-01",indexNetRatio:.22},
      {observationDate:"2026-03-01",indexNetRatio:.31},
    ]},
  };
  assert.deepEqual(extractLatestFundFlowRelease(body),{
    status:"READY",sourceReleaseDate:"2026-08-20",sourceObservationDate:"2026-03-01",rawIndexFlow:.31,sourceRows:2,
  });
});

test("fund-flow prospective ledger evaluates only returns that exist after first observation",()=>{
  const benchmark=Array.from({length:140},(_,i)=>({
    observationDate:new Date(Date.UTC(2026,0,1+i)).toISOString().slice(0,10),value:100+i,
  }));
  const signal={sourceReleaseDate:"2026-01-09",sourceObservationDate:"2025-12-01",signalDate:"2026-01-10",benchmarkDate:"2026-01-10",benchmarkPrice:109,rawIndexFlow:.4};
  const short=evaluateFundFlowProspectiveLedger([signal],benchmark.slice(0,20));
  assert.equal(short.maturity.eligible1m,0);
  assert.equal(short.maturity.eligible3m,0);
  const mature=evaluateFundFlowProspectiveLedger([signal],benchmark);
  assert.equal(mature.maturity.eligible1m,1);
  assert.equal(mature.maturity.eligible3m,1);
  assert.ok(mature.signals[0].return3m>mature.signals[0].return1m);
});

test("fund-flow prospective path forbids historical backfill, scoring and publication",()=>{
  const src=fs.readFileSync(new URL("../scripts/pc-writer/fund-flow-index-prospective-r1.mjs",import.meta.url),"utf8");
  assert.match(src,/PROSPECTIVE_RAW_INDEX_FLOW_ONLY/);
  assert.match(src,/historicalBackfillAllowed:false/);
  assert.match(src,/formulaSelected:false/);
  assert.match(src,/weightSelected:false/);
  assert.match(src,/providerCalls:0/);
  assert.match(src,/productionFormulaChanged:false/);
  assert.match(src,/already-known current SEC release; that release is not counted as a forward signal/);
  assert.doesNotMatch(src,/publishMarket|remote\.|--publish|INSERT INTO|UPDATE |DELETE FROM/);
});
