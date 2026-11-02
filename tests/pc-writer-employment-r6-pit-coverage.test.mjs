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
      available_at TEXT,retrieved_at TEXT NOT NULL,
      provider TEXT,provider_series_id TEXT,quality_status TEXT,pit_class TEXT,provenance_json TEXT
    )`);
    for(const [table,rows] of [[T.observationCurrent,current],[T.observationHistory,history]]){
      const q=db.prepare(`INSERT INTO ${table} VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`);
      for(const row of rows)q.run(row.id,"STATE",row.region,row.date,row.hash,row.value,
        row.available??null,row.retrieved??"2026-10-25T10:00:00.000Z",
        row.provider??"DOL_ETA",row.providerSeriesId??"ETA539:C3",row.qualityStatus??"READY_CORE_51",
        row.pitClass??"HISTORICAL_CURRENT_OR_REVISED_PROVIDER_HISTORY",row.provenanceJson??"{}");
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

test("candidate open failure still leaves the Core reader usable for later audits",()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"zgmini-r6-pit-open-error-"));
  const core=path.join(dir,"core.sqlite"),candidate=path.join(dir,"EMPLOYMENT_R6_CANDIDATE.sqlite");
  fixture(core,{});
  // An existing directory passes the path-exists check but cannot open as SQLite.
  fs.mkdirSync(candidate);
  const before=digest(core);
  assert.throws(()=>auditEmploymentR6PitCoverage({dbPath:core,candidateDbPath:candidate,asOfDate:"2026-11-02"}));
  const recovered=auditEmploymentR6PitCoverage({dbPath:core,asOfDate:"2026-11-02"});
  assert.equal(recovered.coreCurrentRows,0);
  assert.equal(digest(core),before);
});

test("candidate reconciliation preview classifies new, matching, and conflicting source keys without writes",()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"zgmini-r6-pit-reconcile-"));
  const core=path.join(dir,"core.sqlite"),candidate=path.join(dir,"EMPLOYMENT_R6_CANDIDATE.sqlite");
  const h1="a".repeat(64),h2="b".repeat(64),h3="c".repeat(64),h4="d".repeat(64);
  const existing=observation("AL",100,h1),conflict=observation("AK",101,h2);
  const incoming=observation("AZ",102,h3),candidateConflict=observation("AK",103,h4);
  fixture(core,{current:[existing,conflict]});
  fixture(candidate,{current:[existing,incoming,candidateConflict],history:[existing,incoming,candidateConflict]});
  const before=[digest(core),digest(candidate)];
  const report=auditEmploymentR6PitCoverage({dbPath:core,candidateDbPath:candidate,asOfDate:"2026-11-02"});
  assert.equal(report.candidateCurrentKeys,3);
  assert.equal(report.candidateOverlapMatchingKeys,1);
  assert.equal(report.candidateOverlapConflictingKeys,1);
  assert.equal(report.candidateNewKeys,1);
  assert.equal(report.candidateNewKeysWithConsistentPITMetadata,1);
  assert.equal(report.coreMissingHistoryKeysWithConsistentCandidateMetadata,1);
  assert.equal(report.candidateReconciliationPreviewStatus,"HOLD_CONFLICTING_REVISIONS");
  assert.equal(report.promotionApproved,false);
  assert.deepEqual([digest(core),digest(candidate)],before);
});

test("candidate missing history or source metadata remains held for verification",()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"zgmini-r6-pit-hold-"));
  const core=path.join(dir,"core.sqlite"),candidate=path.join(dir,"EMPLOYMENT_R6_CANDIDATE.sqlite");
  fixture(core,{});
  fixture(candidate,{current:[observation("AL",100,"not-a-sha256")]});
  const report=auditEmploymentR6PitCoverage({dbPath:core,candidateDbPath:candidate,asOfDate:"2026-11-02"});
  assert.equal(report.candidateNewKeys,1);
  assert.equal(report.candidateNewKeysWithConsistentPITMetadata,0);
  assert.equal(report.candidateNewKeysWithIncompletePITMetadata,1);
  assert.equal(report.candidateReconciliationPreviewStatus,"HOLD_UNVERIFIED_SOURCE_LINEAGE");
});

test("consistent candidate-only row is a preview, never automatic Core publication",()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"zgmini-r6-pit-preview-"));
  const core=path.join(dir,"core.sqlite"),candidate=path.join(dir,"EMPLOYMENT_R6_CANDIDATE.sqlite");
  const incoming=observation("AZ",102,"e".repeat(64));
  fixture(core,{});
  fixture(candidate,{current:[incoming],history:[incoming]});
  const report=auditEmploymentR6PitCoverage({dbPath:core,candidateDbPath:candidate,asOfDate:"2026-11-02"});
  assert.equal(report.candidateNewKeysWithConsistentPITMetadata,1);
  assert.equal(report.coreMissingHistoryKeysWithoutConsistentCandidateMetadata,0);
  assert.equal(report.candidateReconciliationPreviewStatus,"READ_ONLY_PREVIEW_NO_PUBLICATION_APPROVAL");
  assert.equal(report.promotionApproved,false);
});

test("same raw value and hash with a different provider is a conflict",()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"zgmini-r6-pit-provider-"));
  const core=path.join(dir,"core.sqlite"),candidate=path.join(dir,"EMPLOYMENT_R6_CANDIDATE.sqlite");
  const current=observation("AZ",102,"a".repeat(64));
  const incoming={...current,provider:"UNRELATED_PROVIDER"};
  fixture(core,{current:[current],history:[current]});
  fixture(candidate,{current:[incoming],history:[incoming]});
  const report=auditEmploymentR6PitCoverage({dbPath:core,candidateDbPath:candidate,asOfDate:"2026-11-02"});
  assert.equal(report.candidateOverlapConflictingKeys,1);
  assert.equal(report.candidateReconciliationPreviewStatus,"HOLD_CONFLICTING_REVISIONS");
});

test("an older matching revision cannot disguise a newer candidate HISTORY mismatch",()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"zgmini-r6-pit-latest-"));
  const core=path.join(dir,"core.sqlite"),candidate=path.join(dir,"EMPLOYMENT_R6_CANDIDATE.sqlite");
  const old={...observation("AL",100,"a".repeat(64)),retrieved:"2026-10-20T00:00:00.000Z"};
  const newer={...observation("AL",101,"b".repeat(64)),retrieved:"2026-10-26T00:00:00.000Z"};
  fixture(core,{});
  fixture(candidate,{current:[old],history:[old,newer]});
  const report=auditEmploymentR6PitCoverage({dbPath:core,candidateDbPath:candidate,asOfDate:"2026-11-02"});
  assert.equal(report.candidateNewKeysWithConsistentPITMetadata,0);
  assert.equal(report.candidateNewKeysWithIncompletePITMetadata,1);
  assert.equal(report.candidateReconciliationPreviewStatus,"HOLD_UNVERIFIED_SOURCE_LINEAGE");
});

test("release dates cannot backdate a candidate retrieved after the audit as-of",()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"zgmini-r6-pit-retrieved-"));
  const core=path.join(dir,"core.sqlite"),candidate=path.join(dir,"EMPLOYMENT_R6_CANDIDATE.sqlite");
  const future={...observation("AL",100,"a".repeat(64),{available:"2026-10-01T00:00:00.000Z"}),
    retrieved:"2026-11-03T01:00:00.000Z"};
  fixture(core,{});
  fixture(candidate,{current:[future],history:[future]});
  const before=auditEmploymentR6PitCoverage({dbPath:core,candidateDbPath:candidate,asOfDate:"2026-11-02"});
  assert.equal(before.candidateCurrentKeys,0);
  assert.equal(before.candidateHistoryAsOfUniqueKeys,0);
  const after=auditEmploymentR6PitCoverage({dbPath:core,candidateDbPath:candidate,asOfDate:"2026-11-03"});
  assert.equal(after.candidateNewKeysWithConsistentPITMetadata,1);
});

test("matching Core values cannot conceal an incomplete candidate HISTORY or provenance",()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"zgmini-r6-pit-overlap-meta-"));
  const core=path.join(dir,"core.sqlite"),candidate=path.join(dir,"EMPLOYMENT_R6_CANDIDATE.sqlite");
  const same=observation("AL",100,"a".repeat(64));
  fixture(core,{current:[same],history:[same]});
  fixture(candidate,{current:[{...same,provenanceJson:"null"}],history:[same]});
  const report=auditEmploymentR6PitCoverage({dbPath:core,candidateDbPath:candidate,asOfDate:"2026-11-02"});
  assert.equal(report.candidateOverlapMatchingKeys,1);
  assert.equal(report.candidateOverlapUnverifiedKeys,1);
  assert.equal(report.candidateReconciliationPreviewStatus,"HOLD_UNVERIFIED_SOURCE_LINEAGE");
});

test("newer retrieval wins over an older provider release timestamp",()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"zgmini-r6-pit-revision-order-"));
  const core=path.join(dir,"core.sqlite"),candidate=path.join(dir,"EMPLOYMENT_R6_CANDIDATE.sqlite");
  const old={...observation("AL",100,"a".repeat(64),{available:"2026-10-28T00:00:00.000Z"}),
    retrieved:"2026-10-29T00:00:00.000Z"};
  const newer={...observation("AL",101,"b".repeat(64),{available:"2026-10-27T00:00:00.000Z"}),
    retrieved:"2026-11-01T00:00:00.000Z"};
  fixture(core,{});
  fixture(candidate,{current:[old],history:[old,newer]});
  const report=auditEmploymentR6PitCoverage({dbPath:core,candidateDbPath:candidate,asOfDate:"2026-11-02"});
  assert.equal(report.candidateNewKeysWithIncompletePITMetadata,1);
  assert.equal(report.candidateReconciliationPreviewStatus,"HOLD_UNVERIFIED_SOURCE_LINEAGE");
});
