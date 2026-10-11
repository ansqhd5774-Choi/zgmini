import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {DatabaseSync} from "node:sqlite";
import {
  inspectBeaFile,
  inspectBlsPrFile,
  inspectSecCompanyFactsDir,
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

function createCompanyFacts(directory){
  fs.mkdirSync(directory,{recursive:true});
  fs.writeFileSync(path.join(directory,"CIK0000001001.json"),JSON.stringify({
    cik:1001,
    entityName:"A",
    facts:{
      "us-gaap":{
        EarningsPerShareDiluted:{
          units:{
            "USD/shares":[
              {fy:2026,fp:"Q2",form:"10-Q",filed:"2026-08-01",frame:"CY2026Q2",val:2.5},
              {fy:2025,fp:"FY",form:"10-K",filed:"2026-02-01",frame:"CY2025Q4",val:1.8},
            ],
          },
        },
        Revenues:{
          units:{
            USD:[{fy:2026,fp:"Q2",form:"10-Q",filed:"2026-08-01",frame:"CY2026Q2",val:100}],
          },
        },
      },
    },
  }));
}

test("offline preflight scans primary Company Facts plus secondary FSDS/BLS/BEA and reads local universe without writes",async()=>{
  const dir=fixture();
  try{
    const companyfacts=path.join(dir,"companyfacts"),sub=path.join(dir,"sub.txt"),num=path.join(dir,"num.txt"),bls=path.join(dir,"pr.data.0.Current"),bea=path.join(dir,"bea-corporate-profits.csv"),core=path.join(dir,"core.sqlite");
    createUniverseDb(core);
    createCompanyFacts(companyfacts);
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

    const primary=await inspectSecCompanyFactsDir(companyfacts,{universeCiks:universe.ciks});
    assert.equal(primary.status,"PASS");
    assert.equal(primary.preferredBulkSource,"COMPANYFACTS_ZIP");
    assert.equal(primary.filesFound,1);
    assert.equal(primary.parsedFiles,1);
    assert.equal(primary.coverage.eps.matched,1);
    assert.equal(primary.coverage.eps.universeCount,2);
    assert.equal(primary.coverage.eps.coverage,0.5);
    assert.equal(primary.explicitQuarterCoverage.eps.coverage,0.5);
    assert.equal(primary.q4ExplicitIssuerCounts.eps,1);
    assert.equal(primary.q4EpsAnnualMinusNineMonths,"FORBIDDEN");
    assert.match(primary.aggregateSha256,/^[a-f0-9]{64}$/);

    const sec=await inspectSecFiles({subFile:sub,numFile:num,universeCiks:universe.ciks});
    const labor=await inspectBlsPrFile(bls);
    const profits=await inspectBeaFile(bea);
    assert.equal(sec.status,"PASS");
    assert.equal(sec.source,"SEC_FSDS_EXTRACTED_FILES_SECONDARY");
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

    const report=await runEarningsR5OfflinePreflight({incoming:dir,coreFile:core,secCompanyFactsDir:companyfacts,secSub:sub,secNum:num,blsPr:bls,bea});
    assert.equal(report.version,2);
    assert.equal(report.active,false);
    assert.equal(report.networkCalls,0);
    assert.equal(report.dbReads,1);
    assert.equal(report.dbWrites,0);
    assert.equal(report.universe.status,"PASS");
    assert.equal(report.universe.memberCount,2);
    assert.equal(report.inputs.sec.status,"PASS");
    assert.equal(report.inputs.secFsdsSecondary.status,"PASS");
    assert.equal(report.status,"PARTIAL");
    assert.equal(report.inputs.blsProducerInput.status,"MISSING");
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
