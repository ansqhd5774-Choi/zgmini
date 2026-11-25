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

test("future-retrieved Core CURRENT cannot inflate an earlier PIT history gap",()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"zgmini-r6-pit-core-future-"));
  const core=path.join(dir,"core.sqlite");
  const future={...observation("AL",100,"h1",{available:"2026-10-26T00:00:00.000Z"}),
    retrieved:"2026-11-03T01:00:00.000Z"};
  fixture(core,{current:[future]});
  const beforeHash=digest(core);
  const before=auditEmploymentR6PitCoverage({dbPath:core,asOfDate:"2026-11-02"});
  assert.equal(before.coreCurrentRows,1);
  assert.equal(before.coreCurrentKeys,0);
  assert.equal(before.coreCurrentKeysMissingHistory,0);
  const after=auditEmploymentR6PitCoverage({dbPath:core,asOfDate:"2026-11-03"});
  assert.equal(after.coreCurrentKeys,1);
  assert.equal(after.coreCurrentKeysMissingHistory,1);
  assert.equal(digest(core),beforeHash);
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

test("WAL PIT audit ignores uncommitted writes and releases its read snapshot",()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"zgmini-r6-pit-wal-snapshot-"));
  const core=path.join(dir,"core.sqlite");
  const u3=observation("US",4.0,"a".repeat(64),{id:"U3_UNEMPLOYMENT_RATE"});
  const al=observation("AL",100,"b".repeat(64));
  fixture(core,{current:[u3],history:[u3]});
  const writer=new DatabaseSync(core,{timeout:2000});
  try{
    assert.equal(writer.prepare("PRAGMA journal_mode=WAL").get().journal_mode,"wal");
    writer.exec("BEGIN IMMEDIATE");
    const insert=table=>writer.prepare(`INSERT INTO ${table} VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .run(al.id,"STATE",al.region,al.date,al.hash,al.value,null,
        "2026-10-25T10:00:00.000Z","DOL_ETA","ETA539:C3","READY_CORE_51",
        "HISTORICAL_CURRENT_OR_REVISED_PROVIDER_HISTORY","{}");
    insert(T.observationCurrent);
    insert(T.observationHistory);
    const before=auditEmploymentR6PitCoverage({dbPath:core,asOfDate:"2026-11-02"});
    assert.equal(before.coreCurrentRows,1);
    assert.equal(before.coreHistoryRevisions,1);
    writer.exec("COMMIT");
    const after=auditEmploymentR6PitCoverage({dbPath:core,asOfDate:"2026-11-02"});
    assert.equal(after.coreCurrentRows,2);
    assert.equal(after.coreHistoryRevisions,2);
    assert.equal(after.coreCurrentKeysMissingHistory,0);
  }finally{
    if(writer.isTransaction)writer.exec("ROLLBACK");
    writer.close();
  }
});

test("WAL PIT audit keeps CURRENT and HISTORY on one snapshot across writer COMMIT",()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"zgmini-r6-pit-mid-commit-"));
  const core=path.join(dir,"core.sqlite");
  const beforeRow=observation("US",4.0,"a".repeat(64),{id:"U3_UNEMPLOYMENT_RATE"});
  const afterRow=observation("AL",100,"b".repeat(64));
  fixture(core,{current:[beforeRow],history:[beforeRow]});
  const writer=new DatabaseSync(core,{timeout:2000});
  const originalPrepare=DatabaseSync.prototype.prepare;
  let committedBetweenReads=false;
  try{
    assert.equal(writer.prepare("PRAGMA journal_mode=WAL").get().journal_mode,"wal");
    const insert=table=>writer.prepare(`INSERT INTO ${table} VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`);
    const insertCurrent=insert(T.observationCurrent),insertHistory=insert(T.observationHistory);
    DatabaseSync.prototype.prepare=function(sql){
      if(!committedBetweenReads&&sql.includes(`FROM ${T.observationHistory}`)){
        committedBetweenReads=true;
        writer.exec("BEGIN IMMEDIATE");
        for(const statement of [insertCurrent,insertHistory])statement.run(
          afterRow.id,"STATE",afterRow.region,afterRow.date,afterRow.hash,afterRow.value,null,
          "2026-10-25T10:00:00.000Z","DOL_ETA","ETA539:C3","READY_CORE_51",
          "HISTORICAL_CURRENT_OR_REVISED_PROVIDER_HISTORY","{}");
        writer.exec("COMMIT");
      }
      return originalPrepare.call(this,sql);
    };
    const atStart=auditEmploymentR6PitCoverage({dbPath:core,asOfDate:"2026-11-02"});
    assert.equal(committedBetweenReads,true);
    assert.equal(atStart.coreCurrentRows,1);
    assert.equal(atStart.coreHistoryRevisions,1);
    const after=auditEmploymentR6PitCoverage({dbPath:core,asOfDate:"2026-11-02"});
    assert.equal(after.coreCurrentRows,2);
    assert.equal(after.coreHistoryRevisions,2);
  }finally{
    DatabaseSync.prototype.prepare=originalPrepare;
    if(writer.isTransaction)writer.exec("ROLLBACK");
    writer.close();
  }
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

test("blank SQLite TEXT values are never accepted as PIT lineage evidence",()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"zgmini-r6-pit-blank-"));
  const core=path.join(dir,"core.sqlite"),candidate=path.join(dir,"EMPLOYMENT_R6_CANDIDATE.sqlite");
  const hash="f".repeat(64),blank=observation("AL","",hash);
  fixture(core,{});
  fixture(candidate,{current:[blank],history:[blank]});
  const before=[digest(core),digest(candidate)];
  const report=auditEmploymentR6PitCoverage({dbPath:core,candidateDbPath:candidate,asOfDate:"2026-11-02"});
  assert.equal(report.candidateNewKeys,1);
  assert.equal(report.candidateNewKeysWithConsistentPITMetadata,0);
  assert.equal(report.candidateNewKeysWithIncompletePITMetadata,1);
  assert.equal(report.candidateHistoryAmbiguousLatestKeys,0);
  assert.equal(report.candidateReconciliationPreviewStatus,"HOLD_UNVERIFIED_SOURCE_LINEAGE");
  assert.deepEqual([digest(core),digest(candidate)],before);
});

test("zero-valued Core claims do not match a blank candidate claim",()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"zgmini-r6-pit-blank-overlap-"));
  const core=path.join(dir,"core.sqlite"),candidate=path.join(dir,"EMPLOYMENT_R6_CANDIDATE.sqlite");
  const hash="e".repeat(64),zero=observation("AL",0,hash),blank=observation("AL","",hash);
  fixture(core,{current:[zero],history:[zero]});
  fixture(candidate,{current:[blank],history:[blank]});
  const before=[digest(core),digest(candidate)];
  const report=auditEmploymentR6PitCoverage({dbPath:core,candidateDbPath:candidate,asOfDate:"2026-11-02"});
  assert.equal(report.candidateOverlapMatchingKeys,0);
  assert.equal(report.candidateOverlapConflictingKeys,1);
  assert.equal(report.candidateHistoryAmbiguousLatestKeys,0);
  assert.equal(report.candidateReconciliationPreviewStatus,"HOLD_CONFLICTING_REVISIONS");
  assert.deepEqual([digest(core),digest(candidate)],before);
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

test("PIT-04-02 equal-time conflicting candidate revisions must HOLD instead of hash-order selection",()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"zgmini-r6-pit-same-time-"));
  const core=path.join(dir,"core.sqlite"),candidate=path.join(dir,"EMPLOYMENT_R6_CANDIDATE.sqlite");
  const incoming=observation("AL",100,"f".repeat(64));
  const competing=observation("AL",101,"a".repeat(64));
  fixture(core,{});
  fixture(candidate,{current:[incoming],history:[incoming,competing]});
  const before=[digest(core),digest(candidate)];
  const report=auditEmploymentR6PitCoverage({dbPath:core,candidateDbPath:candidate,asOfDate:"2026-11-02"});
  assert.equal(report.candidateHistoryAsOfUniqueKeys,1);
  assert.equal(report.candidateHistoryAmbiguousLatestKeys,1);
  assert.equal(report.candidateHistoryPriorRevisionKeys,0);
  assert.equal(report.candidateHistoryPriorRevisionRows,0);
  assert.equal(report.candidateHistorySameInstantAdditionalRows,1);
  assert.equal(report.candidateNewKeysWithConsistentPITMetadata,0);
  assert.equal(report.candidateNewKeysWithIncompletePITMetadata,1);
  assert.equal(report.candidateReconciliationPreviewStatus,"HOLD_AMBIGUOUS_LATEST_REVISIONS");
  assert.equal(report.promotionApproved,false);
  assert.equal(report.coreWrites,0);
  assert.deepEqual([digest(core),digest(candidate)],before);
});

test("PIT-04-02 earlier retrieved revision stays distinct from the latest retrieval",()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"zgmini-r6-pit-prior-revision-"));
  const core=path.join(dir,"core.sqlite"),candidate=path.join(dir,"EMPLOYMENT_R6_CANDIDATE.sqlite");
  const old={...observation("AL",100,"a".repeat(64)),retrieved:"2026-10-20T00:00:00.000Z"};
  const latest={...observation("AL",101,"b".repeat(64)),retrieved:"2026-10-26T00:00:00.000Z"};
  fixture(core,{});
  fixture(candidate,{current:[old],history:[old,latest]});
  const early=auditEmploymentR6PitCoverage({dbPath:core,candidateDbPath:candidate,asOfDate:"2026-10-25"});
  assert.equal(early.candidateHistoryPriorRevisionKeys,0);
  assert.equal(early.candidateHistoryPriorRevisionRows,0);
  const report=auditEmploymentR6PitCoverage({dbPath:core,candidateDbPath:candidate,asOfDate:"2026-11-02"});
  assert.equal(report.candidateHistoryAsOfUniqueKeys,1);
  assert.equal(report.candidateHistoryPriorRevisionKeys,1);
  assert.equal(report.candidateHistoryPriorRevisionRows,1);
  assert.equal(report.candidateHistoryAmbiguousLatestKeys,0);
  assert.equal(report.candidateHistorySameInstantAdditionalRows,0);
  assert.equal(report.candidateNewKeysWithConsistentPITMetadata,0);
  assert.equal(report.candidateReconciliationPreviewStatus,"HOLD_UNVERIFIED_SOURCE_LINEAGE");
});

test("PIT-04-02 identical same-time duplicate rows do not create a false latest conflict",()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"zgmini-r6-pit-duplicate-revision-"));
  const core=path.join(dir,"core.sqlite"),candidate=path.join(dir,"EMPLOYMENT_R6_CANDIDATE.sqlite");
  const same=observation("AL",100,"c".repeat(64));
  fixture(core,{});
  fixture(candidate,{current:[same],history:[same,same]});
  const report=auditEmploymentR6PitCoverage({dbPath:core,candidateDbPath:candidate,asOfDate:"2026-11-02"});
  assert.equal(report.candidateHistoryAsOfUniqueKeys,1);
  assert.equal(report.candidateHistoryPriorRevisionKeys,0);
  assert.equal(report.candidateHistoryPriorRevisionRows,0);
  assert.equal(report.candidateHistoryAmbiguousLatestKeys,0);
  assert.equal(report.candidateHistorySameInstantAdditionalRows,1);
  assert.equal(report.candidateNewKeysWithConsistentPITMetadata,1);
  assert.equal(report.candidateReconciliationPreviewStatus,"READ_ONLY_PREVIEW_NO_PUBLICATION_APPROVAL");
  assert.equal(report.promotionApproved,false);
});

test("PIT-04-02 Core history same-time conflicting payload cannot imply a valid reconciliation preview",()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"zgmini-r6-pit-core-ambiguous-"));
  const core=path.join(dir,"core.sqlite"),candidate=path.join(dir,"EMPLOYMENT_R6_CANDIDATE.sqlite");
  const one=observation("AL",100,"d".repeat(64)),other=observation("AL",101,"e".repeat(64));
  fixture(core,{current:[one],history:[one,other]});
  fixture(candidate,{});
  const report=auditEmploymentR6PitCoverage({dbPath:core,candidateDbPath:candidate,asOfDate:"2026-11-02"});
  assert.equal(report.coreHistoryAsOfUniqueKeys,1);
  assert.equal(report.coreHistoryAmbiguousLatestKeys,1);
  assert.equal(report.coreHistorySameInstantAdditionalRows,1);
  assert.equal(report.coreHistoryPriorRevisionKeys,0);
  assert.equal(report.candidateHistoryAmbiguousLatestKeys,0);
  assert.equal(report.candidateReconciliationPreviewStatus,"HOLD_AMBIGUOUS_LATEST_REVISIONS");
  assert.equal(report.coreWrites,0);
});

test("PIT-04-03 partitions Core CURRENT against latest as-of HISTORY without source disclosure",t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"zgmini-r6-pit-core-compare-"));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const core=path.join(dir,"core.sqlite");
  const al=observation("AL",100,"a".repeat(64));
  const ak=observation("AK",101,"b".repeat(64));
  const older={...ak,retrieved:"2026-10-20T00:00:00.000Z"};
  const newer={...ak,value:102,hash:"c".repeat(64),retrieved:"2026-10-26T00:00:00.000Z"};
  const az=observation("AZ",103,"d".repeat(64));
  const ca=observation("CA",104,"e".repeat(64));
  const co=observation("CO",0,"f".repeat(64));
  fixture(core,{current:[al,ak,az,ca,co],
    history:[al,older,newer,{...ca,hash:"not-a-sha256"},{...co,value:""}]});
  const before=digest(core);
  const report=auditEmploymentR6PitCoverage({dbPath:core,asOfDate:"2026-11-02"});
  assert.deepEqual([
    report.coreCurrentHistoryMatchingKeys,
    report.coreCurrentHistoryConflictingKeys,
    report.coreCurrentHistoryUnverifiedKeys,
    report.coreCurrentHistoryMissingKeys,
  ],[1,1,2,1]);
  assert.equal(report.coreCurrentHistoryMissingKeys,report.coreCurrentKeysMissingHistory);
  assert.equal(report.coreCurrentHistoryMatchingKeys+report.coreCurrentHistoryConflictingKeys
    +report.coreCurrentHistoryUnverifiedKeys+report.coreCurrentHistoryMissingKeys,report.coreCurrentKeys);
  assert.equal(report.coreHistoryPriorRevisionKeys,1);
  assert.equal(report.promotionApproved,false);
  assert.equal(report.coreWrites,0);
  assert.equal(digest(core),before);
});

test("PIT-04-03 ambiguous latest Core HISTORY stays unverified rather than matching",t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"zgmini-r6-pit-core-latest-"));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const core=path.join(dir,"core.sqlite");
  const current=observation("AL",100,"a".repeat(64));
  fixture(core,{current:[current],
    history:[current,{...current,value:101,hash:"b".repeat(64)}]});
  const report=auditEmploymentR6PitCoverage({dbPath:core,asOfDate:"2026-11-02"});
  assert.equal(report.coreHistoryAmbiguousLatestKeys,1);
  assert.equal(report.coreCurrentHistoryMatchingKeys,0);
  assert.equal(report.coreCurrentHistoryConflictingKeys,0);
  assert.equal(report.coreCurrentHistoryUnverifiedKeys,1);
  assert.equal(report.coreCurrentHistoryMissingKeys,0);
  assert.equal(report.promotionApproved,false);
});

test("PIT-04-03 same value/hash but different provider is a Core lineage conflict",t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"zgmini-r6-pit-core-provider-"));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const core=path.join(dir,"core.sqlite");
  const current=observation("AL",100,"a".repeat(64));
  fixture(core,{current:[current],history:[{...current,provider:"UNRELATED_PROVIDER"}]});
  const report=auditEmploymentR6PitCoverage({dbPath:core,asOfDate:"2026-11-02"});
  assert.equal(report.coreCurrentHistoryConflictingKeys,1);
  assert.equal(report.coreCurrentHistoryMatchingKeys,0);
  assert.equal(report.coreCurrentHistoryUnverifiedKeys,0);
  assert.equal(report.coreCurrentHistoryMissingKeys,0);
});

test("PIT-04-08 opt-in key review reuses read-only SQLite snapshot and does not leak raw body",()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"zgmini-r6-pit0408-snapshot-"));
 try{
  const core=path.join(dir,"core.sqlite"),candidate=path.join(dir,"EMPLOYMENT_R6_CANDIDATE.sqlite");
  const al=observation("AL",100,"a".repeat(64)),ak=observation("AK",200,"b".repeat(64));
  const az=observation("AZ",300,"c".repeat(64));
  fixture(core,{current:[al,ak,az],history:[az]});
  fixture(candidate,{current:[al,{...ak,value:201}],history:[al,{...ak,value:201}]});
  const before=[digest(core),digest(candidate)];
  const report=auditEmploymentR6PitCoverage({dbPath:core,candidateDbPath:candidate,
   asOfDate:"2026-11-18",keyReviewOffset:0});
  const review=report.pit04KeyReview;
  assert.equal(report.coreCurrentKeysMissingHistory,2);
  assert.equal(review.counts.coreHistoryMissing,2);
  assert.equal(review.counts.candidateOverlapConflicts,1);
  assert.equal(review.counts.missingCandidateInternalMatch,1);
  assert.equal(review.evidenceTotal,2);
  assert.equal(review.evidence[0].geographyCode,"AK");
  assert.equal(review.evidence[0].reason,"CANDIDATE_CURRENT_CONFLICT");
  assert.equal(review.promotionApproved,false);
  assert.equal(review.rawPitAttested,false);
  assert.equal(review.nextOffset,null);
  assert.doesNotMatch(JSON.stringify(review),/"source_hash"|"provenance_json"|"value"/);
  assert.ok(Buffer.byteLength(JSON.stringify(review),"utf8")<12000);
  const paged=auditEmploymentR6PitCoverage({dbPath:core,candidateDbPath:candidate,
   asOfDate:"2026-11-18",keyReviewOffset:1});
  assert.equal(paged.pit04KeyReview.evidence.length,1);
  assert.equal(paged.pit04KeyReview.evidenceTotal,2);
  assert.deepEqual([digest(core),digest(candidate)],before);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test("PIT-04-08 remains disabled by default; invalid offset and missing candidate stop",()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"zgmini-r6-pit0408-gate-"));
 try{
  const core=path.join(dir,"core.sqlite");
  fixture(core,{current:[observation("AL",100,"a".repeat(64))],history:[]});
  const report=auditEmploymentR6PitCoverage({dbPath:core,asOfDate:"2026-11-18"});
  assert.equal(Object.hasOwn(report,"pit04KeyReview"),false);
  assert.throws(()=>auditEmploymentR6PitCoverage({
   dbPath:core,asOfDate:"2026-11-18",keyReviewOffset:-1}),/PIT_AUDIT_KEY_OFFSET_INVALID/);
  assert.throws(()=>auditEmploymentR6PitCoverage({
   dbPath:core,asOfDate:"2026-11-18",keyReviewOffset:0}),/PIT_AUDIT_KEY_REVIEW_INPUT_MISSING/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test("PIT-04-08 optional NULL timestamp cannot erase an as-of Current key",()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"zgmini-r6-pit0408-null-time-"));
 try{
  const core=path.join(dir,"core.sqlite"),candidate=path.join(dir,"EMPLOYMENT_R6_CANDIDATE.sqlite");
  const al=observation("AL",100,"a".repeat(64));
  fixture(core,{current:[al],history:[]});
  fixture(candidate,{current:[al],history:[al]});
  const db=new DatabaseSync(core);
  try{db.exec(`ALTER TABLE ${T.observationCurrent} ADD COLUMN recorded_at TEXT`);}
  finally{db.close();}
  const before=[digest(core),digest(candidate)];
  const result=auditEmploymentR6PitCoverage({dbPath:core,candidateDbPath:candidate,
   asOfDate:"2026-11-18",keyReviewOffset:0});
  assert.equal(result.coreCurrentKeysMissingHistory,1);
  assert.equal(result.pit04KeyReview.counts.coreKeys,1);
  assert.equal(result.pit04KeyReview.counts.coreHistoryMissing,1);
  assert.equal(result.pit04KeyReview.counts.missingCandidateIncomplete,1);
  assert.equal(result.pit04KeyReview.counts.missingCandidateInternalMatch,0);
  assert.equal(result.pit04KeyReview.evidenceTotal,1);
  assert.deepEqual([digest(core),digest(candidate)],before);
  const update=new DatabaseSync(core);
  try{
   update.prepare(`UPDATE ${T.observationCurrent} SET recorded_at=?`)
     .run("2026-11-19T00:00:00Z");
  }finally{update.close();}
  assert.throws(()=>auditEmploymentR6PitCoverage({dbPath:core,candidateDbPath:candidate,
   asOfDate:"2026-11-18",keyReviewOffset:0}),/PIT_AUDIT_KEY_COVERAGE_MISMATCH/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test("PIT-04-08 private audit partitions hash-only, value-only and source-identity conflicts without leaking raw values",()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"zgmini-r6-pit-conflict-causes-"));
  try{
    const core=path.join(dir,"core.sqlite"),candidate=path.join(dir,"EMPLOYMENT_R6_CANDIDATE.sqlite");
    const a=observation("AL",100,"a".repeat(64)),b=observation("AK",200,"b".repeat(64));
    const c=observation("AZ",300,"c".repeat(64)),d=observation("AR",400,"d".repeat(64));
    const original=[a,b,c,d];
    const proposed=[
      {...a,hash:"e".repeat(64)},                 // hash-only
      {...b,value:201},                          // numeric-only
      {...c,value:301,hash:"f".repeat(64)},      // numeric and hash
      {...d,provider:"DIFFERENT_PROVIDER"},      // provider identity
    ];
    fixture(core,{current:original,history:original});
    fixture(candidate,{current:proposed,history:proposed});
    const protectedBytes=[digest(core),digest(candidate)];
    let saved=null;
    const result=auditEmploymentR6PitCoverage({dbPath:core,candidateDbPath:candidate,
      asOfDate:"2026-11-18",keyReviewOffset:0,
      onPrivateKeyLedger:(ledger,digestValue)=>{saved={ledger,digestValue};}});
    assert.equal(result.candidateOverlapConflictingKeys,4);
    const breakdown=result.candidateConflictBreakdown;
    assert.equal(breakdown.total,4);
    assert.deepEqual(breakdown.causes,{
      invalidNumericValue:0,providerOrSeriesDifferent:1,
      valueAndHashDifferent:1,valueOnlyDifferent:1,hashOnlyDifferent:1,
    });
    assert.deepEqual(breakdown.changedFields,{
      numericValue:2,sourceHash:2,provider:1,providerSeries:0,sourceRevision:0,
    });
    assert.equal(saved.ledger.allSeriesCandidateCurrentConflicts.length,4);
    assert.ok(saved.ledger.allSeriesCandidateCurrentConflicts.every(x=>
      Object.keys(x).length===5&&x.reason==="CANDIDATE_CURRENT_CONFLICT"));
    assert.deepEqual(saved.ledger.candidateConflictBreakdown,breakdown);
    assert.equal(saved.digestValue,result.pit04PrivateEvidenceDigest);
    assert.doesNotMatch(JSON.stringify(breakdown),/"source_hash"|"value"|"provenance"|"observationDate"/);
    assert.deepEqual([digest(core),digest(candidate)],protectedBytes);
    assert.equal(result.promotionApproved,false);
    const normal=auditEmploymentR6PitCoverage({dbPath:core,candidateDbPath:candidate,
      asOfDate:"2026-11-18"});
    assert.equal(Object.hasOwn(normal,"candidateConflictBreakdown"),false);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
