import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {DatabaseSync} from "node:sqlite";
import {test} from "node:test";
import {stageEmploymentR6OneYear} from "../scripts/pc-writer/employment-r6-one-year-stage.mjs";

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
