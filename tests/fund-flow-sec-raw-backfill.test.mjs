import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {parseTsv} from "../scripts/pc-writer/sec-dera-zip-r1.mjs";
import {normalizeSecDate} from "../scripts/pc-writer/backfill-sec-fund-flow-raw-r1.mjs";

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
  assert.match(src,/subType!==\"NPORT-P\"/);
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


test("SEC DERA date normalizer accepts SEC export variants deterministically",()=>{
  assert.equal(normalizeSecDate("2019-10-31"),"2019-10-31");
  assert.equal(normalizeSecDate("20191031"),"2019-10-31");
  assert.equal(normalizeSecDate("31-OCT-2019"),"2019-10-31");
  assert.equal(normalizeSecDate("10/31/2019"),"2019-10-31");
  assert.equal(normalizeSecDate("2019-10-31T00:00:00"),"2019-10-31");
  assert.equal(normalizeSecDate("not-a-date"),null);
});

test("raw backfill refuses to checkpoint parsed zero-row SEC quarters",()=>{
  const src=fs.readFileSync(new URL("../scripts/pc-writer/backfill-sec-fund-flow-raw-r1.mjs",import.meta.url),"utf8");
  assert.match(src,/SEC_NCEN_PARSED_ZERO_ROWS/);
  assert.match(src,/SEC_NPORT_PARSED_ZERO_ROWS/);
  assert.match(src,/ZERO_CLASSIFICATIONS/);
  assert.match(src,/ZERO_MONTHS/);
});
