import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {parseTsv} from "../scripts/pc-writer/sec-dera-zip-r1.mjs";

test("SEC DERA TSV parser preserves header names and missing values",()=>{
  const rows=parseTsv("ACCESSION_NUMBER\tSERIES_ID\tNET_ASSETS\r\nA\tS1\t100\r\nB\tS2\t\r\n");
  assert.deepEqual(rows,[{ACCESSION_NUMBER:"A",SERIES_ID:"S1",NET_ASSETS:"100"},{ACCESSION_NUMBER:"B",SERIES_ID:"S2",NET_ASSETS:""}]);
});

test("raw N-PORT/N-CEN backfill is bounded, checkpointed and research-only",()=>{
  const src=fs.readFileSync(new URL("../scripts/pc-writer/backfill-sec-fund-flow-raw-r1.mjs",import.meta.url),"utf8");
  assert.match(src,/NPORT_QUARTERS/);
  assert.match(src,/2019q4/);
  assert.match(src,/2023q2/);
  assert.match(src,/PARTIAL_HISTORY/);
  assert.match(src,/local-sec-fund-flow-raw-backfill-r1\.json/);
  assert.match(src,/SUBMISSION\.tsv/);
  assert.match(src,/FUND_REPORTED_INFO\.tsv/);
  assert.match(src,/MASTER_FUNDS\.tsv/);
  assert.match(src,/SUB_TYPE!==\"NPORT-P\"/);
  assert.match(src,/noPublish:true/);
  assert.match(src,/dbSchemaChanged:false/);
  assert.doesNotMatch(src,/publishMarket|remote\.|--publish|CREATE TABLE|ALTER TABLE/);
});

test("raw backtest remains formula- and weight-neutral",()=>{
  const src=fs.readFileSync(new URL("../scripts/pc-writer/backtest-sec-fund-flow-raw-r1.mjs",import.meta.url),"utf8");
  assert.match(src,/SEC_RAW_NPORT_NCEN_PIT_BACKTEST_ONLY/);
  assert.match(src,/lookAheadSafe:true/);
  assert.match(src,/formulaSelected:false/);
  assert.match(src,/weightSelected:false/);
  assert.match(src,/productionFormulaChanged:false/);
});
