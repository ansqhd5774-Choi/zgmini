import test from "node:test";
import assert from "node:assert/strict";
import {Buffer} from "node:buffer";
import {deflateSync} from "node:zlib";
import {createHash} from "node:crypto";
import {DatabaseSync} from "node:sqlite";
import {createEmploymentR6Store} from "../lib/market-score/employment-r6-store.mjs";
import {
  prepareDolAdvancePdfRawSnapshot,verifyStoredDolAdvancePdfRawSnapshot,
} from "../lib/market-score/employment-r6-dol-pdf-raw-envelope.mjs";

const opts={releaseDate:"2026-11-19",expectedInitialWeekEnd:"2026-11-14",
  retrievedAt:"2026-11-24T14:14:40.919Z"};
const hex=bytes=>createHash("sha256").update(bytes).digest("hex");
function syntheticPdf(extraBytes=0){
  const words=[
    "Thursday, November 19, 2026",
    "UNEMPLOYMENT INSURANCE WEEKLY CLAIMS",
    "SEASONALLY ADJUSTED DATA",
    "In the week ending November 14, the advance figure for seasonally adjusted ",
    "initial claims was 203,000, an increase of 1,000. ",
    "The 4", "-", "week moving average was 197,750, an increase of 2,000.",
    "The advance seasonally adjusted insured unemployment rate was 1.1 percent for the week ending November 7.",
    "The advance number for seasonally adjusted insured unemployment during the week ending November 7 was 1,763,000.",
  ].map(s=>s.replace(/[()\\]/g,c=>"\\"+c));
  const content="BT\n"+words.map(s=>"[( "+s+" )] TJ").join("\n")+"\nET\n";
  return Buffer.concat([Buffer.from("%PDF-1.7\n1 0 obj\n<</Filter/FlateDecode>>\nstream\n"),
    deflateSync(Buffer.from(content)),
    Buffer.from("\nendstream\nendobj\n"),
    Buffer.alloc(extraBytes,0x78),Buffer.from("\n%%EOF\n")]);
}
function isolatedSqlite(){
  const sqlite=new DatabaseSync(":memory:");
  const db={prepare(sql){
    const stmt=sqlite.prepare(sql);
    const api=(values=[])=>({
      bind(...xs){return api(xs)},
      async run(){return stmt.run(...values)},
      async first(){return stmt.get(...values)},
      async all(){return {results:stmt.all(...values)}},
    });
    return api();
  }};
  return {db,sqlite};
}
async function selectSnapshotRows(db,key){
  return (await db.prepare(
    "SELECT * FROM market_score_employment_r6_raw_snapshot_v1 WHERE request_key=? ORDER BY chunk_index"
  ).bind(key).all()).results;
}
test("W04 existing R6 SQLite raw snapshots preserve exact PDF bytes across six text chunks and two distinct SHA256 types",async()=>{
  const pdf=syntheticPdf(300_000),rawHash=hex(pdf);
  const prepared=prepareDolAdvancePdfRawSnapshot(pdf,opts);
  assert.equal(prepared.status,"CANDIDATE_ONLY",JSON.stringify(prepared));
  assert.equal(prepared.evidence.originalBodySha256,rawHash);
  assert.notEqual(prepared.evidence.bodyTextSha256,rawHash);
  assert.equal(prepared.snapshot.detail.bodyEncoding,"BASE64_PDF_BYTES");
  assert.ok(prepared.snapshot.body.length>120_000);
  assert.equal(prepared.snapshot.releaseAt,null);
  assert.equal(Object.hasOwn(prepared.snapshot.detail,"availableAt"),false);
  const {db,sqlite}=isolatedSqlite();
  try{
    const store=createEmploymentR6Store(db);
    const saved=await store.writeRawSnapshot(prepared.snapshot);
    assert.ok(saved.chunkCount>1);
    assert.equal(saved.insertedChunks,saved.chunkCount);
    assert.equal(saved.bodySha256,prepared.evidence.bodyTextSha256);
    const raw=await selectSnapshotRows(db,prepared.snapshot.requestKey);
    assert.equal(raw.length,saved.chunkCount);
    const verified=verifyStoredDolAdvancePdfRawSnapshot(raw,opts);
    assert.equal(verified.status,"CANDIDATE_ONLY",JSON.stringify(verified));
    assert.equal(verified.evidence.originalBodySha256,rawHash);
    assert.equal(verified.snapshotId,saved.snapshotId);
    assert.equal(verified.chunkCount,saved.chunkCount);
    assert.deepEqual(verified.candidateRows.map(x=>x.value),[203000,197750,1763000,1.1]);
    assert.deepEqual(verified.candidateRows.map(x=>x.observationDate),
      ["2026-11-14","2026-11-14","2026-11-07","2026-11-07"]);
    const second=await store.writeRawSnapshot(prepared.snapshot);
    assert.equal(second.noop,true);
    assert.equal(second.insertedChunks,0);
    assert.equal(await store.countRawSnapshots(),1);
    const n=(await db.prepare(
      "SELECT COUNT(*) n FROM market_score_employment_r4_shadow_current_v1"
    ).first()).n;
    assert.equal(n,0,"snapshot certification cannot insert operational observation rows");
  }finally{sqlite.close()}
});
test("W04 exact readback rejects a byte-flipped PDF, chunk reorder, lost chunk, and a forged body hash",async()=>{
  const prepared=prepareDolAdvancePdfRawSnapshot(syntheticPdf(200_000),opts);
  assert.equal(prepared.status,"CANDIDATE_ONLY");
  const {db,sqlite}=isolatedSqlite();
  try{
    await createEmploymentR6Store(db).writeRawSnapshot(prepared.snapshot);
    const rows=await selectSnapshotRows(db,prepared.snapshot.requestKey);
    const change=(idx,data)=>rows.map((r,i)=>i===idx?{...r,...data}:r);
    assert.equal(verifyStoredDolAdvancePdfRawSnapshot(rows,opts).status,"CANDIDATE_ONLY");
    assert.equal(verifyStoredDolAdvancePdfRawSnapshot(change(0,{
      body_chunk:"A"+rows[0].body_chunk.slice(1),
    }),opts).status,"HOLD");
    assert.equal(verifyStoredDolAdvancePdfRawSnapshot(rows.slice(1),opts).status,"HOLD");
    assert.equal(verifyStoredDolAdvancePdfRawSnapshot([...rows].reverse(),opts).status,"HOLD");
    assert.equal(verifyStoredDolAdvancePdfRawSnapshot(change(0,{
      body_sha256:"0".repeat(64),
    }),opts).status,"HOLD");
    assert.equal(verifyStoredDolAdvancePdfRawSnapshot(change(0,{
      detail_json:"{\"bodyEncoding\":\"HEX\"}",
    }),opts).status,"HOLD");
    assert.equal(verifyStoredDolAdvancePdfRawSnapshot(rows,{
      ...opts,releaseDate:"2026-11-25",
    }).status,"HOLD");
    const corrupted=JSON.parse(rows[0].detail_json);
    corrupted.sourceObservationWeeks.INITIAL_CLAIMS="2026-11-07";
    const mutated=rows.map(row=>({...row,detail_json:JSON.stringify(corrupted)}));
    assert.equal(verifyStoredDolAdvancePdfRawSnapshot(mutated,opts).status,"HOLD",
      "incorrect claimed observation week must never pass with valid PDF bytes");
  }finally{sqlite.close()}
});
test("W04 malformed date, tampered source and binary-only payload cannot be silently promoted",()=>{
  const pdf=syntheticPdf();
  for(const bad of [
    {retrievedAt:"not a date"},
    {retrievedAt:"2026-10-01T00:00:00.000Z"},
    {releaseDate:"2026-11-25"},
    {expectedInitialWeekEnd:"2026-11-07"},
  ]){
    const r=prepareDolAdvancePdfRawSnapshot(pdf,{...opts,...bad});
    assert.equal(r.status,"HOLD",JSON.stringify(r));
  }
  assert.equal(prepareDolAdvancePdfRawSnapshot(Buffer.from("bad PDF"),opts).status,"HOLD");
  const out=prepareDolAdvancePdfRawSnapshot(pdf,opts);
  assert.equal(out.status,"CANDIDATE_ONLY");
  assert.ok(out.snapshot.requestKey.startsWith("DOL_ETA538_PDF:"));
  assert.ok(!out.snapshot.requestKey.startsWith("DOL_NATIONAL:"),
    "ETA538 candidate must not masquerade as a current r539cy response");
  assert.equal(Object.hasOwn(out,"operationalRows"),false);
});
