import test from "node:test";
import assert from "node:assert/strict";
import {Buffer} from "node:buffer";
import {createHash} from "node:crypto";
import {deflateSync} from "node:zlib";
import {DatabaseSync} from "node:sqlite";
import {createEmploymentR6Store} from "../lib/market-score/employment-r6-store.mjs";
import {EMPLOYMENT_R4_SHADOW_TABLES} from "../lib/market-score/employment-r4-shadow-contract.mjs";
import {buildDolAdvanceStoreCandidate} from "../lib/market-score/employment-r6-dol-advance-store-candidate.mjs";
import {verifyStoredDolAdvancePdfRawSnapshot} from "../lib/market-score/employment-r6-dol-pdf-raw-envelope.mjs";

const options={releaseDate:"2026-11-19",expectedInitialWeekEnd:"2026-11-14",
  releaseAt:"2026-11-19T13:30:00.000Z",
  now:()=>new Date("2026-11-24T14:14:40.919Z")};
const sha256=x=>createHash("sha256").update(x).digest("hex");
function fixturePdf(){
  const words=[
    "Thursday, November 19, 2026",
    "UNEMPLOYMENT INSURANCE WEEKLY CLAIMS",
    "SEASONALLY ADJUSTED DATA",
    "In the week ending November 14, the advance figure for seasonally adjusted ",
    "initial claims was 203,000, an increase of 1,000.",
    "The 4","-","week moving average was 197,750, an increase of 2,000.",
    "The advance seasonally adjusted insured unemployment rate was 1.1 percent for the week ending November 7.",
    "The advance number for seasonally adjusted insured unemployment during the week ending November 7 was 1,763,000.",
  ].map(s=>s.replace(/[()\\]/g,c=>"\\"+c));
  const text="BT\n"+words.map(s=>"[( "+s+" )] TJ").join("\n")+"\nET\n";
  return Buffer.concat([
    Buffer.from("%PDF-1.7\n1 0 obj\n<</Filter/FlateDecode>>\nstream\n"),
    deflateSync(Buffer.from(text)),
    Buffer.from("\nendstream\nendobj\n%%EOF\n"),
  ]);
}
function memoryDb(){
  const sqlite=new DatabaseSync(":memory:");
  const db={prepare(sql){
    const statement=sqlite.prepare(sql);
    const wrap=(values=[])=>({
      bind(...next){return wrap(next)},
      async run(){return statement.run(...values)},
      async first(){return statement.get(...values)},
      async all(){return {results:statement.all(...values)}},
    });
    return wrap();
  }};
  return {sqlite,db};
}
test("W04 real R6 SQLite links ETA538 PDF bytes -> Base64 text SHA -> four National source rows",async()=>{
  const original=fixturePdf();
  const candidate=buildDolAdvanceStoreCandidate(original,options);
  assert.equal(candidate.status,"CANDIDATE_ONLY",JSON.stringify(candidate));
  assert.equal(candidate.writeAuthorized,false);
  assert.equal(candidate.operationalWrites,0);
  assert.equal(candidate.providerCalls,0);
  assert.equal(candidate.d1Writes,0);
  assert.equal(candidate.snapshots.length,1);
  assert.equal(candidate.rows.length,4);
  assert.equal(candidate.originalPdfSha256,sha256(original));
  const {db,sqlite}=memoryDb();
  try{
    const store=createEmploymentR6Store(db);
    const saved=await store.writeRawSnapshot(candidate.snapshots[0]);
    assert.equal(saved.bodySha256,candidate.snapshots[0].detail.bodyTextSha256);
    assert.notEqual(saved.bodySha256,candidate.originalPdfSha256);
    const rawRows=(await db.prepare(
      "SELECT * FROM market_score_employment_r6_raw_snapshot_v1 WHERE snapshot_id=? ORDER BY chunk_index"
    ).bind(saved.snapshotId).all()).results;
    const exact=verifyStoredDolAdvancePdfRawSnapshot(rawRows,{
      releaseDate:options.releaseDate,expectedInitialWeekEnd:options.expectedInitialWeekEnd,
    });
    assert.equal(exact.status,"CANDIDATE_ONLY",JSON.stringify(exact));
    assert.equal(exact.evidence.originalBodySha256,sha256(original));
    assert.deepEqual(candidate.rows.map(r=>r.value),[203000,197750,1763000,1.1]);
    for(const row of candidate.rows){
      assert.equal(row.provenance.responseHash,saved.bodySha256);
      assert.equal(row.provenance.rawSnapshotId,saved.snapshotId);
      assert.equal(row.provenance.originalPdfSha256,candidate.originalPdfSha256);
      assert.equal(row.provenance.rawRecordHash,row.sourceHash);
      assert.equal(row.retrievedAt,"2026-11-24T14:14:40.919Z");
      assert.equal(row.availableAt,row.retrievedAt,
        "the candidate must not falsely assert availability at original release time");
      assert.equal(row.provenance.historicAvailabilityAttested,false);
    }
    const stored=await store.upsertObservationRows({
      rows:candidate.rows,retrievedAt:"2026-11-24T14:14:40.919Z",
    });
    assert.equal(stored.inserted,4);
    assert.equal(stored.rejected,0);
    const linked=(await db.prepare(
      "SELECT COUNT(*) n FROM "+EMPLOYMENT_R4_SHADOW_TABLES.current+" c "+
      "WHERE c.provider='DOL_ETA' AND c.geography_type='NATIONAL' AND EXISTS ("+
      "SELECT 1 FROM market_score_employment_r6_raw_snapshot_v1 s "+
      "WHERE s.body_sha256=json_extract(c.provenance_json,'$.responseHash') "+
      "AND s.snapshot_id=json_extract(c.provenance_json,'$.rawSnapshotId') "+
      "AND s.request_key LIKE 'DOL_ETA538_PDF:%')"
    ).first()).n;
    assert.equal(linked,4,"the existing text snapshot must support strict 4-row readback");
    const oldRoute=(await db.prepare(
      "SELECT COUNT(*) n FROM "+EMPLOYMENT_R4_SHADOW_TABLES.current+" c "+
      "WHERE EXISTS (SELECT 1 FROM market_score_employment_r6_raw_snapshot_v1 s "+
      "WHERE s.body_sha256=json_extract(c.provenance_json,'$.responseHash') "+
      "AND s.request_key LIKE 'DOL_NATIONAL:%')"
    ).first()).n;
    assert.equal(oldRoute,0,
      "previous B approval only accepts r539cy raw keys; new ETA538 mode needs exact approved scope");
    const repeated=await store.upsertObservationRows({
      rows:candidate.rows,retrievedAt:"2026-11-24T14:14:40.919Z",
    });
    assert.equal(repeated.revised,0);
    assert.equal(repeated.noop,4);
  }finally{sqlite.close()}
});
test("W04 candidate hashes remain distinct and historical PIT is not silently backdated",()=>{
  const original=fixturePdf();
  const a=buildDolAdvanceStoreCandidate(original,options);
  const b=buildDolAdvanceStoreCandidate(original,options);
  assert.equal(a.status,"CANDIDATE_ONLY");
  assert.deepEqual(a,b,"same original PDF and retrievedAt produce stable hashes");
  assert.equal(new Set(a.rows.map(r=>r.sourceHash)).size,4);
  for(const row of a.rows){
    assert.notEqual(row.sourceHash,a.originalPdfSha256);
    assert.notEqual(row.provenance.responseHash,a.originalPdfSha256);
    assert.match(row.provenance.rawSnapshotId,/^[0-9a-f]{64}$/);
    assert.equal(row.availableAt,"2026-11-24T14:14:40.919Z");
    assert.equal(row.provenance.historicAvailabilityAttested,false);
  }
  const invalid=buildDolAdvanceStoreCandidate(original,{
    ...options,releaseAt:"2026-11-26T13:30:00.000Z",
  });
  assert.equal(invalid.status,"HOLD");
  assert.equal(invalid.rows.length,0);
  assert.equal(invalid.operationalWrites,0);
});
