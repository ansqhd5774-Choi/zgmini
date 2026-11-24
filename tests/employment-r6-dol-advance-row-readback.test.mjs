import test from "node:test";
import assert from "node:assert/strict";
import {Buffer} from "node:buffer";
import {createHash} from "node:crypto";
import {deflateSync} from "node:zlib";
import {DatabaseSync} from "node:sqlite";
import {createEmploymentR6Store} from "../lib/market-score/employment-r6-store.mjs";
import {EMPLOYMENT_R4_SHADOW_TABLES} from "../lib/market-score/employment-r4-shadow-contract.mjs";
import {buildDolAdvanceStoreCandidate} from "../lib/market-score/employment-r6-dol-advance-store-candidate.mjs";
import {verifyDolAdvanceStoredRowLineage} from "../lib/market-score/employment-r6-dol-advance-row-readback.mjs";

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

async function prepareStored(){
  const candidate=buildDolAdvanceStoreCandidate(fixturePdf(),options);
  assert.equal(candidate.status,"CANDIDATE_ONLY");
  const {db,sqlite}=memoryDb();
  const store=createEmploymentR6Store(db);
  const saved=await store.writeRawSnapshot(candidate.snapshots[0]);
  const written=await store.upsertObservationRows({rows:candidate.rows,
    retrievedAt:"2026-11-24T14:14:40.919Z"});
  assert.equal(written.inserted,4);
  const rawChunks=(await db.prepare(
    "SELECT * FROM market_score_employment_r6_raw_snapshot_v1 WHERE snapshot_id=? ORDER BY chunk_index"
  ).bind(saved.snapshotId).all()).results;
  const observationRows=(await db.prepare(
    "SELECT * FROM "+EMPLOYMENT_R4_SHADOW_TABLES.current+
    " WHERE provider='DOL_ETA' AND geography_type='NATIONAL' ORDER BY logical_series_id"
  ).all()).results;
  return {sqlite,db,rawChunks,observationRows,candidate,saved};
}
const verify=(data)=>verifyDolAdvanceStoredRowLineage({...data,
  releaseDate:options.releaseDate,expectedInitialWeekEnd:options.expectedInitialWeekEnd});

test("W04 existing R6 SQLite readback requires exact PDF->text->four National row lineage",async()=>{
  const data=await prepareStored();
  try{
    const result=verify(data);
    assert.equal(result.status,"LINEAGE_VERIFIED",JSON.stringify(result));
    assert.equal(result.verifiedRows,4);
    assert.equal(result.snapshotId,data.saved.snapshotId);
    assert.equal(result.originalPdfSha256,data.candidate.originalPdfSha256);
    assert.equal(result.storedTextSha256,data.saved.bodySha256);
    assert.equal(result.publication,"NOT_ATTESTED");
    assert.deepEqual(result.observationWeeks,{
      INITIAL_CLAIMS:"2026-11-14",
      INITIAL_CLAIMS_4W:"2026-11-14",
      CONTINUED_CLAIMS:"2026-11-07",
      INSURED_UNEMPLOYMENT_RATE:"2026-11-07",
    });
  }finally{data.sqlite.close()}
});

test("W04 rejects missing, duplicated, tampered or XML-masquerading National rows",async()=>{
  const data=await prepareStored();
  try{
    const original=data.observationRows;
    const alter=(i,extra)=>original.map((x,n)=>n===i?{...x,...extra}:x);
    const p=JSON.parse(original[0].provenance_json);
    const bad=[
      {observationRows:original.slice(1)},
      {observationRows:[original[0],...original.slice(0,3)]},
      {observationRows:alter(0,{value:999999})},
      {observationRows:alter(0,{observation_date:"2026-10-31"})},
      {observationRows:alter(0,{source_hash:"0".repeat(64)})},
      {observationRows:alter(0,{provider_series_id:"DOL:r539cy"})},
      {observationRows:alter(0,{available_at:"2026-11-18T00:00:00.000Z"})},
      {observationRows:alter(0,{provenance_json:JSON.stringify({...p,responseHash:"0".repeat(64)})})},
      {observationRows:alter(0,{provenance_json:JSON.stringify({...p,rawSnapshotId:"0".repeat(64)})})},
      {rawChunks:data.rawChunks.map((x,i)=>i===0?{...x,body_sha256:"0".repeat(64)}:x)},
    ];
    for(const change of bad){
      const checked=verify({...data,...change});
      assert.equal(checked.status,"HOLD",JSON.stringify(checked));
      assert.equal(checked.verifiedRows,0);
    }
    assert.equal(verify(data).status,"LINEAGE_VERIFIED");
  }finally{data.sqlite.close()}
});


test("W04 RELEASE accepts only exact-release PDF bytes and all four stored National row hashes",async()=>{
  const data=await prepareStored();
  try {
    const store=createEmploymentR6Store(data.db);
    const matched=await store.getVerifiedStoredDolNationalRelease(options.releaseAt);
    assert.equal(matched?.sourceReleaseDate,"2026-11-19");
    assert.equal(matched?.rawSnapshotId,data.saved.snapshotId);
    assert.equal(matched?.originalPdfSha256,sha256(fixturePdf()));
    assert.deepEqual(matched?.latestNationalSeriesObservationDates,{
      INITIAL_CLAIMS:"2026-11-14",
      INITIAL_CLAIMS_4W:"2026-11-14",
      CONTINUED_CLAIMS:"2026-11-07",
      INSURED_UNEMPLOYMENT_RATE:"2026-11-07",
    });
    // A verified 19 Nov source may not satisfy the next scheduled release.
    assert.equal(await store.getVerifiedStoredDolNationalRelease("2026-11-25T13:30:00.000Z"),null);
    assert.equal(await store.getVerifiedStoredDolNationalRelease("2026-11-19T14:00:00.000Z"),null);
    // A modified current row must not be accepted solely on its PDF metadata.
    await data.db.prepare("UPDATE "+EMPLOYMENT_R4_SHADOW_TABLES.current+
      " SET source_hash=? WHERE logical_series_id=? AND release_date=?")
      .bind("0".repeat(64),"INITIAL_CLAIMS",options.releaseAt).run();
    assert.equal(await store.getVerifiedStoredDolNationalRelease(options.releaseAt),null);
  } finally {
    data.sqlite.close();
  }
});
