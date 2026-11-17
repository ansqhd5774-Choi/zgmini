import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {createHash} from "node:crypto";
import {DatabaseSync} from "node:sqlite";
import {EMPLOYMENT_R6_TABLES,EMPLOYMENT_R6_BLS_SERIES} from "../lib/market-score/employment-r6-contract.mjs";
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

test("PIT-04-04 recorded_at and first_seen_at cannot backdate a read-only as-of report",t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"zgmini-r6-pit-recorded-"));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const core=path.join(dir,"core.sqlite"),candidate=path.join(dir,"candidate.sqlite");
  const al=observation("AL",100,"a".repeat(64));
  fixture(core,{current:[al],history:[al]});
  fixture(candidate,{current:[al],history:[al]});
  for(const file of [core,candidate]){
    const db=new DatabaseSync(file);
    try{
      db.exec(`ALTER TABLE ${T.observationHistory} ADD COLUMN recorded_at TEXT`);
      db.prepare(`UPDATE ${T.observationHistory} SET recorded_at=?`)
        .run("2026-11-03T01:00:00.000Z");
    }finally{db.close();}
  }
  const cdb=new DatabaseSync(candidate);
  try{
    cdb.exec(`ALTER TABLE ${T.observationCurrent} ADD COLUMN first_seen_at TEXT`);
    cdb.prepare(`UPDATE ${T.observationCurrent} SET first_seen_at=?`)
      .run("2026-11-03T01:00:00.000Z");
  }finally{cdb.close();}
  const before=[digest(core),digest(candidate)];
  const old=auditEmploymentR6PitCoverage({
    dbPath:core,candidateDbPath:candidate,asOfDate:"2026-11-02",
  });
  assert.equal(old.coreCurrentKeys,1);
  assert.equal(old.coreHistoryAsOfUniqueKeys,0);
  assert.equal(old.coreCurrentKeysMissingHistory,1);
  assert.equal(old.coreCurrentHistoryMatchingKeys,0);
  assert.equal(old.coreCurrentHistoryMissingKeys,1);
  assert.equal(old.candidateHistoryAsOfUniqueKeys,0);
  assert.equal(old.candidateCurrentKeys,0);
  assert.equal(old.missingKeysWithCandidateHistory,0);
  const newDate=auditEmploymentR6PitCoverage({
    dbPath:core,candidateDbPath:candidate,asOfDate:"2026-11-03",
  });
  assert.equal(newDate.coreHistoryAsOfUniqueKeys,1);
  assert.equal(newDate.coreCurrentKeysMissingHistory,0);
  assert.equal(newDate.coreCurrentHistoryMatchingKeys,1);
  assert.equal(newDate.coreCurrentHistoryMissingKeys,0);
  assert.equal(newDate.candidateHistoryAsOfUniqueKeys,1);
  assert.equal(newDate.candidateCurrentKeys,1);
  assert.equal(newDate.candidateOverlapMatchingKeys,1);
  assert.equal(newDate.promotionApproved,false);
  assert.deepEqual([digest(core),digest(candidate)],before);
  // The timestamp column exists: malformed evidence fails closed, not as null/zero.
  const hdb=new DatabaseSync(core);
  try{hdb.prepare(`UPDATE ${T.observationHistory} SET recorded_at=?`).run("invalid");}
  finally{hdb.close();}
  const invalid=auditEmploymentR6PitCoverage({dbPath:core,asOfDate:"2026-11-03"});
  assert.equal(invalid.coreHistoryAsOfUniqueKeys,0);
  assert.equal(invalid.coreCurrentKeysMissingHistory,1);
});


function rawLineageFixture(file){
  const sha=text=>createHash("sha256").update(text).digest("hex");
  const body="PROVIDER_RESPONSE_PRIVATE_FIXTURE_ONLY",responseHash=sha(body);
  const hash=sha("CANONICAL_RECORD_AL"),group="DOL_UI_WEEKLY_CLAIMS";
  const requestKey="DOL_NATIONAL:2025-2026",provider="DOL_ETA";
  const snapshotId=sha([group,provider,requestKey,responseHash].join("|"));
  const provenance=(recordHash,hashOfResponse=responseHash)=>JSON.stringify({
    responseHash:hashOfResponse,rawRecordHash:recordHash,releaseGroup:group,
  });
  const al={...observation("AL",100,hash),provenanceJson:provenance(hash)};
  const ak={...observation("AK",101,sha("AK")),provenanceJson:provenance(sha("AK"),sha("MISSING"))};
  const az={...observation("AZ",102,sha("AZ")),provenanceJson:provenance(sha("OTHER"))};
  const ca={...observation("CA",103,sha("CA")),provenanceJson:"{invalid-json"};
  fixture(file,{current:[al,ak,az,ca],history:[al,ak,az,ca]});
  const db=new DatabaseSync(file);
  try{
    db.exec(`CREATE TABLE ${T.rawSnapshot} (
      snapshot_id TEXT,chunk_index INTEGER,chunk_count INTEGER,
      release_group TEXT,provider TEXT,request_key TEXT,
      retrieved_at TEXT,created_at TEXT,body_sha256 TEXT,
      detail_json TEXT,body_chunk TEXT
    )`);
    db.exec(`CREATE TABLE ${T.runs} (
      provider TEXT,status TEXT,completed_at TEXT,detail_json TEXT
    )`);
    const insert=db.prepare(`INSERT INTO ${T.rawSnapshot} VALUES(?,?,?,?,?,?,?,?,?,?,?)`);
    const rt="2026-10-25T09:00:00.000Z",created="2026-10-25T09:00:00.010Z";
    const details=JSON.stringify({responseHash});
    const chunks=[body.slice(0,12),body.slice(12)];
    for(let i=0;i<chunks.length;i++){
      insert.run(snapshotId,i,chunks.length,group,provider,requestKey,rt,created,responseHash,details,chunks[i]);
    }
    db.prepare(`INSERT INTO ${T.runs} VALUES(?,?,?,?)`).run(
      "EMPLOYMENT_R6_"+group,"SUCCESS","2026-10-25T09:00:02.000Z",
      JSON.stringify({rawSnapshots:[{snapshotId,bodySha256:responseHash,chunkCount:2}]}),
    );
  }finally{db.close();}
  return {body,responseHash,hash,snapshotId,sha};
}

test("PIT-04-05 Core response hash, stored body, collector run and record provenance remain disjoint",t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"zgmini-w04-pit0405-evidence-"));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const file=path.join(dir,"core.sqlite");
  rawLineageFixture(file);
  const before=digest(file);
  const report=auditEmploymentR6PitCoverage({dbPath:file,asOfDate:"2026-11-02"});
  assert.equal(report.rawSnapshotMetadataKeys,1);
  assert.equal(report.rawSnapshotCertifiedKeys,1);
  assert.deepEqual([
    report.coreCurrentRawLineageVerifiedKeys,
    report.coreCurrentRawLineageMissingSnapshotKeys,
    report.coreCurrentRawLineageConflictingKeys,
    report.coreCurrentRawLineageUnverifiedKeys,
  ],[1,1,1,1]);
  assert.deepEqual([
    report.coreHistoryRawLineageVerifiedRows,
    report.coreHistoryRawLineageMissingSnapshotRows,
    report.coreHistoryRawLineageConflictingRows,
    report.coreHistoryRawLineageUnverifiedRows,
  ],[1,1,1,1]);
  assert.equal(report.coreHistoryRawLineageTotalRows,4);
  assert.equal(report.rawLineageEvidenceStatus,"HOLD_INCOMPLETE_SOURCE_LINEAGE");
  assert.equal(report.coreCurrentHistoryMatchingKeys,4);
  assert.equal(report.coreCurrentKeys,4);
  assert.equal(report.providerCalls,0);
  assert.equal(report.coreWrites,0);
  assert.equal(report.promotionApproved,false);
  assert.equal(digest(file),before);
  assert.doesNotMatch(JSON.stringify(report),/PROVIDER_RESPONSE_PRIVATE_FIXTURE_ONLY|CANONICAL_RECORD_AL|responseHash|snapshotId/);
});

test("PIT-04-05 missing run cannot certify otherwise valid raw snapshot; later run cannot backdate as-of",t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"zgmini-w04-pit0405-run-"));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const file=path.join(dir,"core.sqlite");
  rawLineageFixture(file);
  const db=new DatabaseSync(file);
  try{db.prepare(`UPDATE ${T.runs} SET completed_at=?`).run("2026-11-03T09:00:00.000Z");}
  finally{db.close();}
  const before=digest(file);
  const report=auditEmploymentR6PitCoverage({dbPath:file,asOfDate:"2026-11-02"});
  assert.equal(report.rawSnapshotCertifiedKeys,0);
  assert.equal(report.coreCurrentRawLineageVerifiedKeys,0);
  assert.equal(report.coreCurrentRawLineageUnverifiedKeys,2);
  assert.equal(report.coreCurrentRawLineageMissingSnapshotKeys,1);
  assert.equal(report.coreCurrentRawLineageConflictingKeys,1);
  assert.equal(digest(file),before);
  const later=auditEmploymentR6PitCoverage({dbPath:file,asOfDate:"2026-11-03"});
  assert.equal(later.rawSnapshotCertifiedKeys,1);
  assert.equal(later.coreCurrentRawLineageVerifiedKeys,1);
});

test("PIT-04-05 tampered private raw body fails SHA-256 without leaking or modifying its bytes",t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"zgmini-w04-pit0405-tamper-"));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const file=path.join(dir,"core.sqlite");
  const {snapshotId}=rawLineageFixture(file);
  const db=new DatabaseSync(file);
  try{db.prepare(`UPDATE ${T.rawSnapshot} SET body_chunk=? WHERE snapshot_id=? AND chunk_index=1`)
    .run("CORRUPTED_RESPONSE_DO_NOT_PUBLISH",snapshotId);}
  finally{db.close();}
  const before=digest(file);
  const report=auditEmploymentR6PitCoverage({dbPath:file,asOfDate:"2026-11-02"});
  assert.equal(report.rawSnapshotMetadataKeys,1);
  assert.equal(report.rawSnapshotCertifiedKeys,0);
  assert.equal(report.coreCurrentRawLineageConflictingKeys,2);
  assert.equal(report.coreCurrentRawLineageMissingSnapshotKeys,1);
  assert.equal(report.coreCurrentRawLineageUnverifiedKeys,1);
  assert.equal(report.promotionApproved,false);
  assert.equal(digest(file),before);
  assert.doesNotMatch(JSON.stringify(report),/CORRUPTED_RESPONSE|PROVIDER_RESPONSE_PRIVATE_FIXTURE_ONLY/);
});

test("PIT-04-05 absent raw snapshot/run tables yield NO_RUNTIME_EVIDENCE, never a false zero",t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"zgmini-w04-pit0405-legacy-"));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const file=path.join(dir,"core.sqlite");
  fixture(file,{current:[observation("AL",100,"a".repeat(64))]});
  const report=auditEmploymentR6PitCoverage({dbPath:file,asOfDate:"2026-11-02"});
  assert.equal(report.rawSnapshotMetadataKeys,null);
  assert.equal(report.rawSnapshotCertifiedKeys,null);
  assert.equal(report.coreCurrentRawLineageVerifiedKeys,null);
  assert.equal(report.coreHistoryRawLineageTotalRows,null);
  assert.equal(report.rawLineageEvidenceStatus,"NO_RUNTIME_EVIDENCE");
});

function blsFamilyLineageFixture(file,{releaseGroup,seriesId,provenanceGroup=releaseGroup,
  provenanceSeriesId=seriesId,rowProvider=null,withRun=true}={}){
  const sha=value=>createHash("sha256").update(value).digest("hex");
  const descriptor=EMPLOYMENT_R6_BLS_SERIES[seriesId];
  assert.ok(descriptor);
  const hash=sha("BLS_RECORD_"+seriesId),body="PRIVATE_BLS_HTTP_RESPONSE_"+releaseGroup;
  const responseHash=sha(body),requestKey="BLS:"+releaseGroup+":fixture",provider="BLS";
  const snapshotId=sha([releaseGroup,provider,requestKey,responseHash].join("|"));
  const obs={...observation("US",100,hash,{id:descriptor.logicalSeriesId}),
    provider:rowProvider??descriptor.provider,providerSeriesId:seriesId,
    provenanceJson:JSON.stringify({
      rawRecordHash:hash,responseHash,releaseGroup:provenanceGroup,seriesID:provenanceSeriesId,
    })};
  fixture(file,{current:[obs],history:[obs]});
  const db=new DatabaseSync(file);
  try{
    db.exec(`CREATE TABLE ${T.rawSnapshot} (
      snapshot_id TEXT,chunk_index INTEGER,chunk_count INTEGER,
      release_group TEXT,provider TEXT,request_key TEXT,
      retrieved_at TEXT,created_at TEXT,body_sha256 TEXT,
      detail_json TEXT,body_chunk TEXT
    )`);
    db.exec(`CREATE TABLE ${T.runs} (
      provider TEXT,status TEXT,completed_at TEXT,detail_json TEXT
    )`);
    const storedAt="2026-10-25T09:00:00.000Z";
    db.prepare(`INSERT INTO ${T.rawSnapshot} VALUES(?,?,?,?,?,?,?,?,?,?,?)`).run(
      snapshotId,0,1,releaseGroup,provider,requestKey,storedAt,
      "2026-10-25T09:00:00.010Z",responseHash,JSON.stringify({responseHash}),body);
    if(withRun)db.prepare(`INSERT INTO ${T.runs} VALUES(?,?,?,?)`).run(
      "EMPLOYMENT_R6_"+releaseGroup,"SUCCESS","2026-10-25T09:00:02.000Z",
      JSON.stringify({rawSnapshots:[{snapshotId,bodySha256:responseHash,chunkCount:1}]}));
  }finally{db.close();}
  return {responseHash,snapshotId};
}

test("PIT-04-05 BLS snapshot provider family aliases only exact R6 series and release groups",t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"zgmini-w04-bls-raw-family-"));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const valid=[
    ["BLS_EMPLOYMENT_SITUATION","LNS14000000"],
    ["BLS_EMPLOYMENT_SITUATION","CES0000000001"],
    ["BLS_JOLTS","JTS000000000000000JOL"],
    ["BLS_ECI","CIU1010000000000A"],
    ["BLS_STATE_MSA","SMS00000000000000022"],
  ];
  for(const [releaseGroup,seriesId] of valid){
    const file=path.join(dir,seriesId+".sqlite");
    blsFamilyLineageFixture(file,{releaseGroup,seriesId});
    const before=digest(file);
    const result=auditEmploymentR6PitCoverage({dbPath:file,asOfDate:"2026-11-02"});
    assert.equal(result.coreCurrentRawLineageVerifiedKeys,1,releaseGroup+":"+seriesId);
    assert.equal(result.coreHistoryRawLineageVerifiedRows,1,releaseGroup+":"+seriesId);
    assert.equal(result.coreCurrentRawLineageMissingSnapshotKeys,0);
    assert.equal(result.rawSnapshotCertifiedKeys,1);
    assert.equal(result.promotionApproved,false);
    assert.equal(digest(file),before);
    assert.doesNotMatch(JSON.stringify(result),/PRIVATE_BLS_HTTP_RESPONSE|responseHash|snapshotId/);
  }
});

test("PIT-04-05 BLS alias cannot bridge unrelated group, series, forged provider or missing run",t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"zgmini-w04-bls-raw-reject-"));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const invalid=[
    {releaseGroup:"BLS_EMPLOYMENT_SITUATION",seriesId:"LNS14000000",
      provenanceGroup:"BLS_JOLTS"},
    {releaseGroup:"BLS_EMPLOYMENT_SITUATION",seriesId:"LNS14000000",
      provenanceSeriesId:"CES0000000001"},
    {releaseGroup:"BLS_EMPLOYMENT_SITUATION",seriesId:"LNS14000000",
      rowProvider:"BLS_JOLTS"},
    {releaseGroup:"BLS_EMPLOYMENT_SITUATION",seriesId:"LNS14000000",
      withRun:false},
  ];
  for(let i=0;i<invalid.length;i++){
    const file=path.join(dir,"invalid-"+i+".sqlite");
    blsFamilyLineageFixture(file,invalid[i]);
    const result=auditEmploymentR6PitCoverage({dbPath:file,asOfDate:"2026-11-02"});
    assert.equal(result.coreCurrentRawLineageVerifiedKeys,0,i);
    assert.equal(result.coreHistoryRawLineageVerifiedRows,0,i);
    assert.equal(result.coreCurrentRawLineageUnverifiedKeys,1,i);
    assert.equal(result.promotionApproved,false,i);
  }
});
