import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {createHash} from "node:crypto";
import {DatabaseSync} from "node:sqlite";
import {EMPLOYMENT_R6_TABLES} from "../lib/market-score/employment-r6-contract.mjs";
import {auditEmploymentR6PitCoverage} from "../scripts/pc-writer/employment-r6-pit-coverage.mjs";

const T=EMPLOYMENT_R6_TABLES;
const digest=file=>createHash("sha256").update(fs.readFileSync(file)).digest("hex");
function fixture(file,{current=[],history=[]}={}){
  const db=new DatabaseSync(file);
  try{
    for(const table of [T.observationCurrent,T.observationHistory])db.exec(`CREATE TABLE ${table} (
      logical_series_id TEXT NOT NULL,geography_type TEXT NOT NULL,
      geography_code TEXT NOT NULL,observation_date TEXT NOT NULL,
      source_hash TEXT NOT NULL,value REAL NOT NULL,
      available_at TEXT,retrieved_at TEXT NOT NULL
    )`);
    for(const [table,rows] of [[T.observationCurrent,current],[T.observationHistory,history]]){
      const q=db.prepare(`INSERT INTO ${table} VALUES(?,?,?,?,?,?,?,?)`);
      for(const row of rows)q.run(row.id,"STATE",row.region,row.date,row.hash,row.value,
        row.available??null,row.retrieved??"2026-10-25T10:00:00.000Z");
    }
  }finally{db.close();}
}
const observation=(region,value,hash,{id="STATE_INITIAL_CLAIMS",date="2026-09-12",available=null}={})=>({
  id,region,date,value,hash,available,
});

test("read-only PIT gap report distinguishes matching candidate from conflicting revisions",()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"zgmini-r6-pit-readonly-"));
  const core=path.join(dir,"core.sqlite"),candidate=path.join(dir,"EMPLOYMENT_R6_CANDIDATE.sqlite");
  const u3=observation("US",4.0,"u3",{id:"U3_UNEMPLOYMENT_RATE"});
  const al=observation("AL",100,"h1"),ak=observation("AK",101,"h2");
  fixture(core,{current:[u3,al,ak],history:[u3]});
  fixture(candidate,{history:[al,observation("AK",102,"h3")]});
  const hashes=[digest(core),digest(candidate)];
  const report=auditEmploymentR6PitCoverage({dbPath:core,candidateDbPath:candidate,asOfDate:"2026-11-02"});
  assert.equal(report.coreCurrentRows,3);
  assert.equal(report.coreHistoryRevisions,1);
  assert.equal(report.coreCurrentKeysMissingHistory,2);
  assert.equal(report.missingKeysWithCandidateHistory,2);
  assert.equal(report.missingKeysWithMatchingCandidateValueAndHash,1);
  assert.equal(report.missingKeysWithDifferentCandidateRevision,1);
  assert.equal(report.missingBySeries.find(x=>x.id==="STATE_INITIAL_CLAIMS")?.missing,2);
  assert.equal(report.promotionApproved,false);
  assert.equal(report.coreWrites,0);
  assert.deepEqual([digest(core),digest(candidate)],hashes);
});

test("future candidate availability does not backfill past PIT evidence",()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"zgmini-r6-pit-future-"));
  const core=path.join(dir,"core.sqlite"),candidate=path.join(dir,"EMPLOYMENT_R6_CANDIDATE.sqlite");
  const al=observation("AL",100,"h1");
  fixture(core,{current:[al]});
  fixture(candidate,{history:[observation("AL",100,"h1",{available:"2026-11-03T00:00:00.000Z"})]});
  const before=auditEmploymentR6PitCoverage({dbPath:core,candidateDbPath:candidate,asOfDate:"2026-11-02"});
  assert.equal(before.missingKeysWithCandidateHistory,0);
  const after=auditEmploymentR6PitCoverage({dbPath:core,candidateDbPath:candidate,asOfDate:"2026-11-03"});
  assert.equal(after.missingKeysWithMatchingCandidateValueAndHash,1);
});

test("candidate cannot equal Core and absence of tables remains NO_EVIDENCE",()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"zgmini-r6-pit-missing-"));
  const core=path.join(dir,"core.sqlite");
  const db=new DatabaseSync(core);db.close();
  assert.throws(()=>auditEmploymentR6PitCoverage({dbPath:core,candidateDbPath:core,asOfDate:"2026-11-02"}),/PIT_AUDIT_CANDIDATE_IS_CORE/);
  const out=auditEmploymentR6PitCoverage({dbPath:core,asOfDate:"2026-11-02"});
  assert.equal(out.coreCurrentTableExists,false);
  assert.equal(out.coreCurrentKeysMissingHistory,null);
  assert.equal(out.missingKeysWithCandidateHistory,null);
});
