import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {buildSliceQuery,queryRead,MAX_PROVIDER_CALLS,BENCHMARKS} from "../scripts/pc-writer/sector-fear-greed-r272-dolthub-slice-probe.mjs";

test("R2.7.2 uses bounded date-slice read-only query",()=>{
  const sql=buildSliceQuery("2026-09-01","2026-10-01",["SPY","MSFT","AAPL"]);
  assert.equal(MAX_PROVIDER_CALLS,4);
  assert.match(sql,/^SELECT /);
  assert.match(sql,/date >= '2026-09-01'/);
  assert.match(sql,/date <= '2026-10-01'/);
  assert.match(sql,/act_symbol IN \('AAPL','MSFT','SPY'\)/);
  assert.doesNotMatch(sql,/\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|REPLACE|TRUNCATE)\b/i);
});

test("R2.7.2 v2 response parser accepts columns plus array rows",async()=>{
  const fetchImpl=async()=>({ok:true,status:200,json:async()=>({status:"success",columns:[{name:"date"}],rows:[["2026-10-12"]]})});
  const result=await queryRead("SELECT date FROM ohlcv ORDER BY date DESC LIMIT 1",{fetchImpl,clientTimeoutMs:100});
  assert.deepEqual(result.rows,[{date:"2026-10-12"}]);
  assert.equal(typeof result.durationMs,"number");
});

test("R2.7.2 keeps benchmark set unchanged",()=>{
  assert.deepEqual(BENCHMARKS,["SPY","XLC","XLY","XLP","XLE","XLF","XLV","XLI","XLB","XLRE","XLK","XLU"]);
});

test("R2.7.2 implementation has no publication or D1 mutation path",()=>{
  const source=fs.readFileSync(path.join(process.cwd(),"scripts/pc-writer/sector-fear-greed-r272-dolthub-slice-probe.mjs"),"utf8");
  assert.doesNotMatch(source,/wrangler\s+d1|publication-ledger|local-writer|INSERT INTO|UPDATE\s+\w+\s+SET/i);
  assert.match(source,/commercialProductionEligible:false/);
  assert.match(source,/rawRowsStored:false/);
});
