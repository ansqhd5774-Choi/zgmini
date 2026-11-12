import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {fileURLToPath} from "node:url";
import {mergeR21321BenchmarkRows,summarizeR21321MissingBenchmarkSessions,summarizeR21321TailBalance} from "../scripts/pc-writer/sector-fear-greed-r21321-tail-balance-756-readiness.mjs";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const SCRIPT=path.join(ROOT,"scripts","pc-writer","sector-fear-greed-r21321-tail-balance-756-readiness.mjs");

test("R2.13.21 merges the verified early shadow benchmark without overwriting primary rows",()=>{
  const result=mergeR21321BenchmarkRows(
    [{date:"2024-08-15",close:500,volume:1},{date:"2024-08-16",close:501,volume:1}],
    [{date:"2023-09-28",close:430,volume:1},{date:"2023-09-29",close:431,volume:1}],
  );
  assert.equal(result.addedRows,2);
  assert.deepEqual(result.rows.map(row=>row.date),["2023-09-28","2023-09-29","2024-08-15","2024-08-16"]);
  assert.throws(()=>mergeR21321BenchmarkRows([{date:"2024-08-15",close:500,volume:1}],[{date:"2024-08-15",close:499,volume:1}]),/R21321_BENCHMARK_CONFLICT/);
});

test("R2.13.21 reports exact stock-session benchmark gaps and 756 readiness",()=>{
  const stockRows=["2023-09-28","2023-09-29","2023-10-02","2023-10-03","2023-10-04"].flatMap(date=>[{ticker:"A",tradeDate:date,currentClose:1,currentVolume:1}]);
  const spyRows=[{date:"2023-09-28",close:1,volume:1},{date:"2023-09-29",close:1,volume:1},{date:"2023-10-04",close:1,volume:1}];
  const gap=summarizeR21321MissingBenchmarkSessions(stockRows,spyRows);
  assert.equal(gap.missingSessions,2);
  assert.equal(gap.firstMissing,"2023-10-02");
  assert.equal(gap.lastMissing,"2023-10-03");
  assert.equal(gap.longestMissingRunSessions,2);
  const ready=summarizeR21321TailBalance(Array.from({length:756},(_,i)=>({date:new Date(Date.UTC(2020,0,1+i)).toISOString().slice(0,10),tailBalance:i/1000})));
  assert.equal(ready.observations,756);
  assert.equal(ready.ready,true);
  assert.equal(ready.missing,0);
});

test("R2.13.21 is local read-only and cannot mutate Production/reference contracts",()=>{
  const source=fs.readFileSync(SCRIPT,"utf8");
  assert.match(source,/providerCalls:0/);
  assert.match(source,/publicMutation:false/);
  assert.match(source,/d1Mutation:false/);
  assert.match(source,/dbSchemaChanged:false/);
  assert.match(source,/productionFormulaChanged:false/);
  assert.match(source,/referenceRequirementChanged:false/);
  assert.match(source,/productionBenchmarkSourceChanged:false/);
  assert.match(source,/formulaChanged:false/);
  assert.match(source,/normalizationChanged:false/);
  assert.match(source,/weightsChanged:false/);
  assert.match(source,/fillForwardFill:false/);
  assert.match(source,/candidateSelected:false/);
  assert.doesNotMatch(source,/fetch\s*\(/);
  assert.doesNotMatch(source,/wrangler\s+d1/i);
  assert.doesNotMatch(source,/\b(?:INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\b\s+/i);
});
