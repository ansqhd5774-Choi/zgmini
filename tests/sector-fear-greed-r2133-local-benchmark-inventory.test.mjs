import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {fileURLToPath} from "node:url";
import {extractTargetRowsR2133,selectR2133MarketParquetRows,shouldScanR2133Path} from "../scripts/pc-writer/sector-fear-greed-r2133-local-benchmark-inventory.mjs";

const here=path.dirname(fileURLToPath(import.meta.url));
const scriptPath=path.join(here,"..","scripts","pc-writer","sector-fear-greed-r2133-local-benchmark-inventory.mjs");

test("R2.13.3 extracts target-date rows from ticker-keyed MarketParquet payloads",()=>{
  const payload={provider:"MarketParquet Free Sample",series:{SPY:[{date:"2026-08-27",close:100,volume:10}],XLK:[{date:"2026-08-27",close:200,volume:20}]}};
  const hits=extractTargetRowsR2133(payload,{file:"local-marketparquet.json",targetTickers:["SPY","XLK"]});
  assert.equal(hits.length,2);
  assert.equal(hits.every(hit=>hit.marketParquetEvidence),true);
  const selected=selectR2133MarketParquetRows(hits,["SPY","XLK"]);
  assert.equal(selected.complete,true);
  assert.equal(selected.selected.XLK.close,200);
});

test("R2.13.3 rejects conflicting MarketParquet closes instead of inventing a repair",()=>{
  const hits=[
    {ticker:"SPY",close:100,marketParquetEvidence:true,file:"a.json"},
    {ticker:"SPY",close:101,marketParquetEvidence:true,file:"b.json"},
  ];
  const selected=selectR2133MarketParquetRows(hits,["SPY"]);
  assert.equal(selected.complete,false);
  assert.equal(selected.conflicts.length,1);
  assert.equal(selected.selected.SPY,undefined);
});

test("R2.13.3 excludes secret stores and remains local read-only Shadow research",()=>{
  assert.equal(shouldScanR2133Path("providers.env",100),false);
  assert.equal(shouldScanR2133Path("storage/core.sqlite",100),false);
  assert.equal(shouldScanR2133Path("local-marketparquet-history.json",100),true);
  const source=fs.readFileSync(scriptPath,"utf8");
  assert.equal(/\bfetch\s*\(/.test(source),false);
  assert.equal(/wrangler\s+d1|publication-ledger|INSERT\s+INTO|UPDATE\s+|DELETE\s+FROM/i.test(source),false);
  assert.match(source,/providerCalls:0/);
  assert.match(source,/productionFormulaChanged:false/);
  assert.match(source,/referenceRequirementChanged:false/);
  assert.match(source,/approvedR1ReferenceRequirement:756/);
});
