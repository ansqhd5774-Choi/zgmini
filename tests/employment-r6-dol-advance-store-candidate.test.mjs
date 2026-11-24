import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { deflateSync } from "node:zlib";
import { buildDolAdvanceStoreCandidate, inspectDolAdvanceStoredSnapshot } from "../lib/market-score/employment-r6-dol-advance-store-candidate.mjs";

const RELEASE="2026-11-19T13:30:00.000Z";
const OBSERVED="2026-11-24T14:06:51.000Z";
const opts={
  releaseDate:"2026-11-19",expectedInitialWeekEnd:"2026-11-14",
  releaseAt:RELEASE,now:()=>new Date(OBSERVED),
};
// Synthetic parser fixture: these bytes are never represented as the official
// PDF or uploaded as actual raw evidence.
function fixturePdf({heading="Thursday, November 19, 2026",continued="November 7"}={}) {
  const lines=[
    "UNEMPLOYMENT INSURANCE WEEKLY CLAIMS",
    "SEASONALLY ADJUSTED DATA",heading,
    "In the week ending November 14, the advance figure for seasonally adjusted initial claims was 203,000, an increase of 1,000.",
    "The 4-week moving average was 197,750, an increase of 2,000.",
    "The advance seasonally adjusted insured unemployment rate was 1.1 percent for the week ending November 7.",
    "The advance number for seasonally adjusted insured unemployment during the week ending "+continued+" was 1,763,000.",
  ];
  const stream="BT\n"+lines.map(s=>`[ (${s.replace(/[()\\]/g,c=>"\\"+c)}) ] TJ`).join("\n")+"\nET\n";
  return Buffer.concat([
    Buffer.from("%PDF-1.7\n1 0 obj\n<</Filter/FlateDecode>>\nstream\n","latin1"),
    deflateSync(Buffer.from(stream,"latin1")),
    Buffer.from("\nendstream\nendobj\n%%EOF\n","latin1"),
  ]);
}
const sha256=bytes=>createHash("sha256").update(bytes).digest("hex");

test("W04 ETA538 candidate preserves exact PDF bytes in base64, hashes separately",()=>{
  const original=fixturePdf();
  const out=buildDolAdvanceStoreCandidate(original,opts);
  assert.equal(out.status,"CANDIDATE_ONLY",JSON.stringify(out));
  assert.equal(out.writeAuthorized,false);
  assert.equal(out.operationalWrites,0);
  assert.equal(out.providerCalls,0);
  assert.equal(out.d1Writes,0);
  assert.equal(out.snapshots.length,1);
  const snapshot=out.snapshots[0];
  assert.equal(snapshot.contentType,"application/x-base64");
  assert.equal(snapshot.detail.storedBodyEncoding,"BASE64_ORIGINAL_PDF");
  assert.equal(snapshot.detail.originalPdfSha256,sha256(original));
  assert.equal(out.originalPdfSha256,sha256(original));
  const decoded=Buffer.from(snapshot.body,"base64");
  assert.deepEqual(decoded,original);
  assert.equal(sha256(decoded),snapshot.detail.originalPdfSha256);
  assert.notEqual(sha256(Buffer.from(snapshot.body,"utf8")),snapshot.detail.originalPdfSha256);
});

test("W04 ETA538 four National rows match R4 stored-row shape without fake PIT time",()=>{
  const out=buildDolAdvanceStoreCandidate(fixturePdf(),opts);
  assert.equal(out.status,"CANDIDATE_ONLY",JSON.stringify(out));
  assert.deepEqual(out.rows.map(x=>x.logicalSeriesId),[
    "INITIAL_CLAIMS","INITIAL_CLAIMS_4W","CONTINUED_CLAIMS","INSURED_UNEMPLOYMENT_RATE",
  ]);
  assert.deepEqual(out.rows.map(x=>x.value),[203000,197750,1763000,1.1]);
  assert.deepEqual(out.rows.map(x=>x.observationDate),[
    "2026-11-14","2026-11-14","2026-11-07","2026-11-07",
  ]);
  const hashes=new Set(out.rows.map(row=>row.sourceHash));
  assert.equal(hashes.size,4);
  for(const row of out.rows){
    assert.match(row.sourceHash,/^[a-f0-9]{64}$/);
    assert.equal(row.provider,"DOL_ETA");
    assert.equal(row.releaseDate,RELEASE);
    assert.equal(row.availableAt,OBSERVED);
    assert.equal(row.retrievedAt,OBSERVED);
    assert.equal(row.provenance.originalPdfSha256,out.originalPdfSha256);
    assert.equal(row.provenance.historicAvailabilityAttested,false);
    assert.equal(row.qualityStatus,"READY_FORWARD");
  }
  assert.ok(out.rows[0].providerSeriesId.startsWith("DOL:ETA538:"));
  assert.equal(out.snapshots[0].detail.historicAvailabilityAttested,false);
});

test("W04 malformed, mixed-vintage or impossible timestamps cannot be storage input",()=>{
  for(const [bytes,config,reason] of [
    [Buffer.from("not a PDF"),opts,"PDF_LAYOUT_UNSUPPORTED"],
    [fixturePdf({heading:"Thursday, November 12, 2026"}),opts,"PDF_RELEASE_DATE_MISMATCH"],
    [fixturePdf({continued:"October 31"}),opts,"WEEK_DATE_INCONSISTENT"],
    [fixturePdf(),{...opts,releaseAt:"2026-11-26T13:30:00.000Z"},"RELEASE_TIME_INVALID"],
    [fixturePdf(),{...opts,releaseAt:"2026-11-19T13:30:00+00:00"},"RELEASE_TIME_INVALID"],
    [fixturePdf(),{...opts,now:()=>new Date("2026-11-18T00:00:00.000Z")},"RELEASE_TIME_INVALID"],
  ]){
    const out=buildDolAdvanceStoreCandidate(bytes,config);
    assert.equal(out.status,"HOLD",JSON.stringify(out));
    assert.equal(out.reason,reason);
    assert.deepEqual(out.rows,[]);
    assert.deepEqual(out.snapshots,[]);
    assert.equal(out.operationalWrites,0);
    assert.equal(out.writeAuthorized,false);
  }
});


test("W04 eventual stored body readback detects base64 and original-PDF tampering independently",()=>{
  const candidate=buildDolAdvanceStoreCandidate(fixturePdf(),opts);
  assert.equal(candidate.status,"CANDIDATE_ONLY");
  const snapshot=candidate.snapshots[0];
  const input={
    body:snapshot.body,
    bodySha256:sha256(Buffer.from(snapshot.body,"utf8")),
    detail:snapshot.detail,
  };
  const ok=inspectDolAdvanceStoredSnapshot(input);
  assert.equal(ok.status,"RAW_BYTES_VERIFIED",JSON.stringify(ok));
  assert.equal(ok.originalPdfSha256,candidate.originalPdfSha256);
  assert.equal(ok.observationsVerified,false);
  assert.equal(ok.historicalAvailabilityAttested,false);
  assert.equal(ok.operationalWrites,0);
  const wrongBody=inspectDolAdvanceStoredSnapshot({...input,bodySha256:"0".repeat(64)});
  assert.equal(wrongBody.reason,"STORED_BODY_HASH_MISMATCH");
  const wrongOriginal=inspectDolAdvanceStoredSnapshot({...input,
    detail:{...input.detail,originalPdfSha256:"0".repeat(64)}});
  assert.equal(wrongOriginal.reason,"ORIGINAL_PDF_HASH_MISMATCH");
  const wrongLength=inspectDolAdvanceStoredSnapshot({...input,
    detail:{...input.detail,originalPdfByteLength:input.detail.originalPdfByteLength+1}});
  assert.equal(wrongLength.reason,"ORIGINAL_PDF_HASH_MISMATCH");
  const notBase64=inspectDolAdvanceStoredSnapshot({...input,body:"not PDF!!!"});
  assert.equal(notBase64.reason,"STORED_SNAPSHOT_FORMAT_INVALID");
});
