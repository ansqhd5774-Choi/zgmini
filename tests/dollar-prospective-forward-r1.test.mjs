import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {evaluateProspectiveLedger} from "../scripts/pc-writer/dollar-prospective-forward-r1.mjs";

function benchmark(count=140){
  return Array.from({length:count},(_,i)=>({
    observationDate:new Date(Date.UTC(2026,0,1+i)).toISOString().slice(0,10),
    value:100+i,
  }));
}

test("prospective ledger evaluates returns only after future benchmark dates exist",()=>{
  const signals=[{
    signalDate:"2026-01-10",benchmarkDate:"2026-01-10",benchmarkPrice:109,baselineScore:50,
    features:{absShortMomentum:2,absAcceleration20:1,level:100,levelScore:50,shortMomentum:2,mediumMomentum:3,acceleration20:1,volatility20:.5,absMediumMomentum:3},
  }];
  const short=evaluateProspectiveLedger(signals,benchmark(20));
  assert.equal(short.maturity.eligible1m,0);
  assert.equal(short.maturity.eligible3m,0);
  const mature=evaluateProspectiveLedger(signals,benchmark(140));
  assert.equal(mature.maturity.eligible1m,1);
  assert.equal(mature.maturity.eligible3m,1);
  assert.ok(mature.signals[0].return1m>0);
  assert.ok(mature.signals[0].return3m>mature.signals[0].return1m);
});

test("prospective research path forbids historical retuning and production publishing",()=>{
  const src=fs.readFileSync(new URL("../scripts/pc-writer/dollar-prospective-forward-r1.mjs",import.meta.url),"utf8");
  assert.match(src,/PROSPECTIVE_FORWARD_ONLY/);
  assert.match(src,/historicalRetuningAllowed:false/);
  assert.match(src,/formulaSelected:false/);
  assert.match(src,/weightSelected:false/);
  assert.match(src,/providerCalls:0/);
  assert.match(src,/productionFormulaChanged:false/);
  assert.doesNotMatch(src,/publishMarket|remote\.|--publish/);
});
