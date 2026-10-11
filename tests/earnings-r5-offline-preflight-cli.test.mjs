import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {DatabaseSync} from "node:sqlite";
import {
  inspectBeaFile,
  inspectBlsPrFile,
  inspectSecFiles,
  readLatestEarningsUniverse,
  runEarningsR5OfflinePreflight,
} from "../scripts/pc-writer/earnings-r5-offline-preflight.mjs";

function fixture(){return fs.mkdtempSync(path.join(os.tmpdir(),"zgmini-e1-r5-preflight-"));}

function createUniverseDb(file){
  const db=new DatabaseSync(file);
  db.exec(`CREATE TABLE market_score_earnings_e1_r3_universe_v1 (
    period_end TEXT PRIMARY KEY,
    body_json TEXT NOT NULL,
    security_count INTEGER NOT NULL,
    issuer_count INTEGER NOT NULL,
    wikipedia_revision_id TEXT,
    retrieved_at TEXT NOT NULL
  )`);
  db.prepare(`INSERT INTO market_score_earnings_e1_r3_universe_v1
    (period_end,body_json,security_count,issuer_count,wikipedia_revision_id,retrieved_at)
    VALUES(?,?,?,?,?,?)`).run(
      "2026-06-30",
      JSON.stringify({members:[{cik:"1001",ticker:"AAA",name:"A"},{cik:"1002",ticker:"BBB",name:"B"}]}),
      2,2,"fixture","2026-08-15T00:00:00Z",
    );
  db.close();
}

test("offline preflight scans SEC/BLS/BEA and reads local universe without DB or network writes",async()=>{
  const dir=fixture();
  try{
    const sub=path.join(dir,"sub.txt"),num=path.join(dir,"num.txt"),bls=path.join(dir,"pr.data.0.Current"),bea=path.join(dir,"bea-corporate-profits.csv"),core=path.join(dir,"core.sqlite");
    createUniverseDb(core);
    fs.writeFileSync(sub,[
      "adsh\tcik\tform\tperiod\tfiled\tfy\tfp\tsic",
      "0001\t1001\t10-Q\t20260630\t20260801\t2026\tQ2\t3571",
    ].join("\n"));
    fs.writeFileSync(num,[
      "adsh\ttag\tversion\tddate\tqtrs\tuom\tvalue\tcoreg",
      "0001\tEarningsPerShareDiluted\tus-gaap/2026\t20260630\t1\tUSD-per-shares\t2.5\t",
      "0001\tRevenues\tus-gaap/2026\t20260630\t1\tUSD\t100\t",
    ].join("\n"));
    fs.writeFileSync(bls,[
      "series_id\tyear\tperiod\tvalue\tfootnote_codes",
      "PRS85006111\t2026\tQ01\t0.4\t",
      "PRS85006111\t2026\tQ02\t1.4\tR",
      "PRS85006111\t2026\tQ05\t1.0\t",
    ].join("\n"));
    fs.writeFileSync(bea,"SeriesCode,Value\nA051RC,4709.5\n");

    const universe=readLatestEarningsUniverse(core);
    assert.equal(universe.status,"PASS");
    assert.equal(universe.readOnly,true);
    assert.equal(universe.memberCount,2);
    assert.ok(universe.ciks.has("0000001001"));

    const sec=await inspectSecFiles({subFile:sub,numFile:num,universeCiks:universe.ciks});
    const labor=await inspectBlsPrFile(bls);
    const profits=await inspectBeaFile(bea);
    assert.equal(sec.status,"PASS");
    assert.equal(sec.acceptedFacts.eps,1);
    assert.equal(sec.acceptedFacts.revenue,1);
    assert.equal(sec.submissionUniverseCount,1);
    assert.equal(sec.universeCoverage.eps.matched,1);
    assert.equal(sec.universeCoverage.eps.universeCount,2);
    assert.equal(sec.universeCoverage.eps.coverage,0.5);
    assert.equal(labor.status,"PASS");
    assert.equal(labor.latest.value,1.4);
    assert.equal(labor.annualAverageRowsSkipped,1);
    assert.equal(profits.status,"PASS");
    assert.match(sec.files.sub.sha256,/^[a-f0-9]{64}$/);

    const report=await runEarningsR5OfflinePreflight({incoming:dir,coreFile:core,secSub:sub,secNum:num,blsPr:bls,bea});
    assert.equal(report.active,false);
    assert.equal(report.networkCalls,0);
    assert.equal(report.dbReads,1);
    assert.equal(report.dbWrites,0);
    assert.equal(report.universe.status,"PASS");
    assert.equal(report.universe.memberCount,2);
    assert.equal(report.status,"PARTIAL");
    assert.equal(report.inputs.blsProducerInput.status,"MISSING");
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
