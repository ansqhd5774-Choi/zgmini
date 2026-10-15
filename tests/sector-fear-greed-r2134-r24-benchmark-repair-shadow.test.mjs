import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {fileURLToPath} from "node:url";
import {buildR2134RepairedBenchmarks} from "../scripts/pc-writer/sector-fear-greed-r2134-r24-benchmark-repair-shadow.mjs";

const here=path.dirname(fileURLToPath(import.meta.url));
const scriptPath=path.join(here,"..","scripts","pc-writer","sector-fear-greed-r2134-r24-benchmark-repair-shadow.mjs");
const tickers=["SPY","XLK","XLC","XLY","XLP","XLF","XLV","XLI","XLE","XLB","XLRE","XLU"];

function inventory(overrides={}){
  const selected={};
  tickers.forEach((ticker,index)=>{selected[ticker]={ticker,date:"2026-08-27",close:100+index,volume:1000+index,file:"local-sector-fear-greed-r1-price-history.json",source:"MarketParquet etf_daily",marketParquetEvidence:true};});
  return {status:"SHADOW_R2133_LOCAL_BENCHMARK_INVENTORY_COMPLETE",targetDate:"2026-08-27",summary:{complete:true,conflicts:0},selection:{selected},...overrides};
}

test("R2.13.4 injects only the verified missing benchmark date in memory",()=>{
  const series={};
  for(const ticker of tickers)series[ticker]=[{date:"2026-08-26",close:90},{date:"2026-08-28",close:110}];
  const repaired=buildR2134RepairedBenchmarks(series,inventory());
  assert.equal(repaired.complete,true);
  assert.equal(repaired.injected.length,12);
  assert.equal(repaired.alreadyPresent.length,0);
  assert.deepEqual(repaired.series.SPY.map(row=>row.date),["2026-08-26","2026-08-27","2026-08-28"]);
  assert.equal(repaired.series.XLK.find(row=>row.date==="2026-08-27").close,101);
  assert.deepEqual(series.SPY,[{date:"2026-08-26",close:90},{date:"2026-08-28",close:110}]);
});

test("R2.13.4 fails closed on incomplete inventory or conflicting existing close",()=>{
  const incomplete=inventory({summary:{complete:false,conflicts:0}});
  assert.throws(()=>buildR2134RepairedBenchmarks({},incomplete),/R2134_R2133_INVENTORY_INCOMPLETE_OR_CONFLICTED/);
  const series={};for(const ticker of tickers)series[ticker]=[];
  series.SPY=[{date:"2026-08-27",close:999}];
  assert.throws(()=>buildR2134RepairedBenchmarks(series,inventory()),/R2134_EXISTING_BENCHMARK_CONFLICT:SPY/);
});

test("R2.13.4 remains local Shadow research with no provider or production mutation",()=>{
  const source=fs.readFileSync(scriptPath,"utf8");
  assert.equal(/\bfetch\s*\(/.test(source),false);
  assert.equal(/wrangler\s+d1|publication-ledger|INSERT\s+INTO|UPDATE\s+|DELETE\s+FROM/i.test(source),false);
  assert.match(source,/providerCalls:0/);
  assert.match(source,/publicMutation:false/);
  assert.match(source,/productionFormulaChanged:false/);
  assert.match(source,/referenceRequirementChanged:false/);
  assert.match(source,/approvedR1ReferenceRequirement:756/);
  assert.match(source,/fillForwardFill:false/);
  assert.match(source,/sourceFilesMutated:false/);
});
