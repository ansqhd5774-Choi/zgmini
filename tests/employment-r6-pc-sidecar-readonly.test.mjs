import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {DatabaseSync} from "node:sqlite";
import {test} from "node:test";
import {optionsFrom,saveReport,stageEmploymentR6OneYear,stageEmploymentR6OneYearWithPitAudit} from "../scripts/pc-writer/employment-r6-one-year-stage.mjs";

const TABLE="market_score_employment_r4_shadow_history_v1";
function fixture(file,rows){
  const db=new DatabaseSync(file);
  try{
    db.exec(`CREATE TABLE ${TABLE}(
      history_id INTEGER PRIMARY KEY AUTOINCREMENT,
      logical_series_id TEXT,geography_type TEXT,geography_code TEXT,
      observation_date TEXT,retrieved_at TEXT,available_at TEXT,value REAL,source_hash TEXT
    )`);
    const sql=`INSERT INTO ${TABLE}(logical_series_id,geography_type,geography_code,observation_date,retrieved_at,value,source_hash) VALUES(?,?,?,?,?,?,?)`;
    for(const r of rows)db.prepare(sql).run(r.id,"NATIONAL","US",r.date,r.retrieved,r.value,r.id+"-"+r.date);
  }finally{db.close();}
}

test("one-year display combines approved Core + isolated candidate read-only, selecting newest PIT revision",async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"zgmini-r6-sidecar-test-"));
  const core=path.join(dir,"core.sqlite"),candidate=path.join(dir,"EMPLOYMENT_R6_CANDIDATE.sqlite");
  const coreRows=[
    {id:"U3_UNEMPLOYMENT_RATE",date:"2026-09-30",value:4.9,retrieved:"2026-10-01T00:00:00.000Z"},
    {id:"STATE_EMP_DIFFUSION_3M",date:"2025-10-31",value:50,retrieved:"2026-01-01T00:00:00.000Z"},
    {id:"STATE_EMP_DIFFUSION_3M",date:"2025-11-30",value:51,retrieved:"2026-01-01T00:00:00.000Z"},
    {id:"STATE_EMP_DIFFUSION_3M",date:"2026-09-30",value:52,retrieved:"2026-10-01T00:00:00.000Z"},
  ];
  const recent="2026-10-05T00:00:00.000Z";
  const candidateRows=[
    {id:"U3_UNEMPLOYMENT_RATE",date:"2025-10-31",value:4.7,retrieved:recent},
    {id:"U3_UNEMPLOYMENT_RATE",date:"2025-11-30",value:4.6,retrieved:recent},
    {id:"U3_UNEMPLOYMENT_RATE",date:"2026-09-30",value:4.2,retrieved:recent},
  ];
  fixture(core,coreRows);fixture(candidate,candidateRows);
  const before=[fs.statSync(core).size,fs.statSync(candidate).size];
  const combined=await stageEmploymentR6OneYear({dbPath:core,candidateDbPath:candidate,asOfDate:"2026-11-01"});
  const coreOnly=await stageEmploymentR6OneYear({dbPath:core,asOfDate:"2026-11-01"});
  assert.equal(combined.indicators[0].value,4.2);
  assert.equal(combined.indicators[0].chartStatus,"READY");
  assert.equal(combined.indicators[21].value,52);
  assert.equal(combined.summary.sourceFeatures,2);
  assert.equal(coreOnly.indicators[0].value,4.9);
  assert.equal(coreOnly.summary.sourceFeatures,2);
  assert.deepEqual([fs.statSync(core).size,fs.statSync(candidate).size],before);
});

test("candidate DB and PUBLISH cannot be combined, even if the candidate exists",()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"zgmini-r6-no-candidate-publish-"));
  const core=path.join(dir,"core.sqlite");
  const candidate=path.join(dir,"EMPLOYMENT_R6_CANDIDATE.sqlite");
  fixture(core,[]);
  fixture(candidate,[]);
  const before=[fs.statSync(core).size,fs.statSync(candidate).size];
  assert.throws(
    ()=>optionsFrom(["--db",core,"--candidate-db",candidate,"--output-dir",dir,"--publish"]),
    /CANDIDATE_PUBLICATION_NOT_APPROVED/,
  );
  assert.throws(
    ()=>optionsFrom(["--publish","--output-dir",dir,"--candidate-db",candidate,"--db",core]),
    /CANDIDATE_PUBLICATION_NOT_APPROVED/,
  );
  // Research staging remains available; the Core-only publication path is parsed normally.
  assert.equal(optionsFrom(["--db",core,"--candidate-db",candidate,"--output-dir",dir]).publish,false);
  assert.equal(optionsFrom(["--db",core,"--output-dir",dir,"--publish"]).publish,true);
  assert.equal(optionsFrom(["--db",core,"--output-dir",dir,"--discover-approved-candidate"]).discoverApprovedCandidate,true);
  assert.throws(
    ()=>optionsFrom(["--db",core,"--output-dir",dir,"--discover-approved-candidate","--publish"]),
    /CANDIDATE_PUBLICATION_NOT_APPROVED/,
  );
  assert.throws(
    ()=>optionsFrom(["--db",core,"--candidate-db",candidate,"--output-dir",dir,"--discover-approved-candidate"]),
    /CANDIDATE_DISCOVERY_ARGUMENT_CONFLICT/,
  );
  assert.deepEqual([fs.statSync(core).size,fs.statSync(candidate).size],before);
});

test("Windows PUBLISH CMD fails closed when an isolated candidate is present",()=>{
  const cmd=fs.readFileSync(new URL("../scripts/pc-writer/employment-r6-one-year-display.cmd",import.meta.url),"utf8");
  const publish=cmd.split(/^:publish\r?$/m)[1];
  assert.ok(publish,"PUBLISH CMD branch is present");
  assert.match(publish,/if exist "%~dp0EMPLOYMENT_R6_CANDIDATE\.sqlite"/);
  assert.match(publish,/CANDIDATE_PUBLICATION_NOT_APPROVED/);
  assert.doesNotMatch(publish,/--candidate-db/);
  assert.match(publish,/--db "%EMP_R6_CORE%" --output-dir "%~dp0\." --publish/);
  assert.doesNotMatch(publish,/--discover-approved-candidate/);
  const stage=cmd.split(/^:stage\r?$/m)[1].split(/^:publish\r?$/m)[0];
  assert.match(stage,/--discover-approved-candidate/);
});

test("failed 1Y stage can still write read-only PIT missing-history counts to TXT and JSON",async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"zgmini-r6-stage-missing-history-"));
  const core=path.join(dir,"core.sqlite");
  fixture(core,[]);
  const db=new DatabaseSync(core);
  try{
    db.exec(`CREATE TABLE market_score_employment_r4_shadow_current_v1(
      logical_series_id TEXT,geography_type TEXT,geography_code TEXT,
      observation_date TEXT,retrieved_at TEXT,available_at TEXT,value REAL,source_hash TEXT
    )`);
    db.prepare(`INSERT INTO market_score_employment_r4_shadow_current_v1
      VALUES(?,?,?,?,?,?,?,?)`).run("STATE_INITIAL_CLAIMS","STATE","AL",
      "2026-10-24","2026-10-29T10:00:00.000Z",null,100,"a".repeat(64));
  }finally{db.close();}
  const original=fs.readFileSync(core);
  const diagnostic=await stageEmploymentR6OneYearWithPitAudit({dbPath:core,asOfDate:"2026-11-02"});
  assert.equal(diagnostic.error?.message,"NO_VERIFIED_PIT_OBSERVATIONS");
  const paths=saveReport(dir,diagnostic.body,null,diagnostic.error,{...diagnostic,asOfDate:"2026-11-02"});
  const {report}=JSON.parse(fs.readFileSync(paths.jsonPath,"utf8"));
  assert.equal(report.stageStatus,"FAILED");
  assert.equal(report.asOfDate,"2026-11-02");
  assert.equal(report.pitCoverage.coreCurrentKeysMissingHistory,1);
  assert.equal(report.pitCoverage.coreCurrentRows,1);
  assert.equal(report.pitCoverageError,null);
  const txt=fs.readFileSync(paths.txtPath,"utf8");
  assert.match(txt,/CORE_CURRENT_WITHOUT_PIT_HISTORY: 1/);
  assert.match(txt,/PIT_AUDIT_ERROR: NONE/);
  assert.deepEqual(fs.readFileSync(core),original);
});
