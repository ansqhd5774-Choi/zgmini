import test from "node:test";
import assert from "node:assert/strict";
import {Buffer} from "node:buffer";
import {createHash} from "node:crypto";
import {deflateSync} from "node:zlib";
import {DatabaseSync} from "node:sqlite";
import {createEmploymentR6Store} from "../lib/market-score/employment-r6-store.mjs";
import {EMPLOYMENT_R4_SHADOW_TABLES} from "../lib/market-score/employment-r4-shadow-contract.mjs";
import {prepareDolAdvancePdfRawSnapshot,
  projectDolAdvanceVerifiedCandidates,
} from "../lib/market-score/employment-r6-dol-pdf-raw-envelope.mjs";
const opts={releaseDate:"2026-11-19",expectedInitialWeekEnd:"2026-11-14",
  retrievedAt:"2026-11-24T14:14:40.919Z"};
const digest=x=>createHash("sha256").update(x).digest("hex");
function fixturePdf(){
  const parts=[
    "Thursday, November 19, 2026",
    "UNEMPLOYMENT INSURANCE WEEKLY CLAIMS",
    "SEASONALLY ADJUSTED DATA",
    "In the week ending November 14, the advance figure for seasonally adjusted ",
    "initial claims was 203,000, an increase of 1,000.",
    "The 4","-","week moving average was 197,750, an increase of 2,000.",
    "The advance seasonally adjusted insured unemployment rate was 1.1 percent for the week ending November 7.",
    "The advance number for seasonally adjusted insured unemployment during the week ending November 7 was 1,763,000.",
  ].map(s=>s.replace(/[()\\]/g,c=>"\\"+c));
  const payload="BT\n"+parts.map(s=>"[( "+s+" )] TJ").join("\n")+"\nET\n";
  return Buffer.concat([Buffer.from("%PDF-1.7\n1 0 obj\n<</Filter/FlateDecode>>\nstream\n"),
    deflateSync(Buffer.from(payload)),
    Buffer.from("\nendstream\nendobj\n%%EOF\n")]);
}
function memoryDb(){
  const sqlite=new DatabaseSync(":memory:");
  return {sqlite,db:{prepare(sql){
    const prepared=sqlite.prepare(sql);
    const wrap=(v=[])=>({
      bind(...xs){return wrap(xs)},
      async run(){return prepared.run(...v)},
      async first(){return prepared.get(...v)},
      async all(){return {results:prepared.all(...v)}},
    });
    return wrap();
  }}};
}
async function preparedSqlite(){
  const pdf=fixturePdf();
  const envelope=prepareDolAdvancePdfRawSnapshot(pdf,opts);
  assert.equal(envelope.status,"CANDIDATE_ONLY",JSON.stringify(envelope));
  const {sqlite,db}=memoryDb();
  const store=createEmploymentR6Store(db);
  const saved=await store.writeRawSnapshot(envelope.snapshot);
  const rows=(await db.prepare(
    "SELECT * FROM market_score_employment_r6_raw_snapshot_v1 WHERE snapshot_id=? ORDER BY chunk_index"
  ).bind(saved.snapshotId).all()).results;
  return {pdf,envelope,sqlite,db,store,saved,rows};
}
test("W04 authenticated stored ETA538 PDF produces exactly four non-writeable R6 field candidates",async()=>{
  const ctx=await preparedSqlite();
  try {
    const out=projectDolAdvanceVerifiedCandidates(ctx.rows,opts);
    assert.equal(out.status,"CANDIDATE_ONLY",JSON.stringify(out));
    assert.equal(out.writeAuthorized,false);
    assert.equal(out.snapshotId,ctx.saved.snapshotId);
    assert.equal(out.sourceSha256,digest(ctx.pdf));
    assert.equal(out.candidateRows.length,4);
    assert.deepEqual(out.candidateRows.map(x=>x.value),[203000,197750,1763000,1.1]);
    assert.deepEqual(out.candidateRows.map(x=>x.observationDate),
      ["2026-11-14","2026-11-14","2026-11-07","2026-11-07"]);
    for(const row of out.candidateRows){
      assert.equal(row.provider,"DOL_ETA");
      assert.equal(row.geographyType,"NATIONAL");
      assert.equal(row.geographyCode,"US");
      assert.equal(row.seasonalAdjustment,"SA");
      assert.equal(row.populationCoverage,"UI_CLAIMS_NATIONAL");
      assert.match(row.providerSeriesId,/^DOL:ETA538:/);
      assert.equal(row.provenance.rawSnapshotId,ctx.saved.snapshotId);
      assert.equal(row.provenance.originalPdfSha256,digest(ctx.pdf));
      assert.equal(row.provenance.responseHash,ctx.saved.bodySha256);
      assert.equal(row.provenance.rawRecordHash,row.sourceHash);
      assert.equal(row.provenance.sourceUrl,"https://oui.doleta.gov/press/2026/111926.pdf");
      assert.equal(row.retrievedAt,opts.retrievedAt);
      assert.equal(row.releaseDate,"2026-11-19");
      for(const missing of ["availableAt","pitClass","qualityStatus"])
        assert.equal(Object.hasOwn(row,missing),false,missing);
    }
    const again=projectDolAdvanceVerifiedCandidates(ctx.rows,opts);
    assert.deepEqual(again,out,"same raw snapshot must create stable canonical source hashes");
    const attempted=await ctx.store.upsertObservationRows({rows:out.candidateRows,retrievedAt:opts.retrievedAt});
    assert.equal(attempted.inserted,0);
    assert.equal(attempted.rejected,4,"existing R4 store must reject unapproved candidate rows");
    const count=(await ctx.db.prepare(
      "SELECT COUNT(*) n FROM "+EMPLOYMENT_R4_SHADOW_TABLES.current
    ).first()).n;
    assert.equal(count,0);
  }finally{ctx.sqlite.close()}
});
test("W04 altered snapshot provenance, forged PDF series week and missing chunks fail closed",async()=>{
  const ctx=await preparedSqlite();
  try{
    const good=projectDolAdvanceVerifiedCandidates(ctx.rows,opts);
    assert.equal(good.status,"CANDIDATE_ONLY");
    const changed=(key,value)=>{
      const detail=JSON.parse(ctx.rows[0].detail_json);
      detail[key]=value;
      return ctx.rows.map(row=>({...row,detail_json:JSON.stringify(detail)}));
    };
    assert.equal(projectDolAdvanceVerifiedCandidates(changed(
      "originalBodySha256","0".repeat(64)),opts).status,"HOLD");
    assert.equal(projectDolAdvanceVerifiedCandidates(changed(
      "sourceObservationWeeks",{INITIAL_CLAIMS:"2026-10-24"}),opts).status,"HOLD");
    assert.equal(projectDolAdvanceVerifiedCandidates(ctx.rows.slice(1),opts).status,"HOLD");
    assert.equal(projectDolAdvanceVerifiedCandidates(ctx.rows,{
      ...opts,expectedInitialWeekEnd:"2026-11-07"
    }).status,"HOLD");
  }finally{ctx.sqlite.close()}
});
