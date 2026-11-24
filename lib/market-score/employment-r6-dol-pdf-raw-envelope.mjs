// Source-only immutable text envelope for DOL ETA538 PDF binary.
// The existing R6 rawSnapshot stores TEXT. Base64 preserves the exact bytes.
// This module NEVER executes SQLite/PC provider calls, updates observations or publishes.
import {createHash} from "node:crypto";
import {inspectDolAdvancePdf} from "./employment-r6-dol-advance-pdf-candidate.mjs";

const SCHEMA="W04_DOL_ETA538_PDF_BASE64_SNAPSHOT_V1";
const ENCODING="BASE64_PDF_BYTES";
const GROUP="DOL_UI_WEEKLY_CLAIMS";
const PROVIDER="DOL_ETA";
const MAX_BYTES=8_000_000;
const hex=v=>createHash("sha256").update(v).digest("hex");
const hold=reason=>({status:"HOLD",reason});
const validIso=v=>typeof v==="string"&&v===new Date(v).toISOString();
const ids=["INITIAL_CLAIMS","INITIAL_CLAIMS_4W","CONTINUED_CLAIMS","INSURED_UNEMPLOYMENT_RATE"];
const canonicalBase64=s=>typeof s==="string"&&s.length>0&&s.length<=Math.ceil(MAX_BYTES/3)*4+4&&
  /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(s);
function readDetail(s){
  try{
    const d=typeof s==="string"?JSON.parse(s):s;
    return d&&typeof d==="object"&&!Array.isArray(d)?d:null;
  }catch{return null;}
}
// Produces an object compatible with the current writeRawSnapshot API only.
// It is intentionally not passed to that API by the normal R6 Collector.
export function prepareDolAdvancePdfRawSnapshot(bytes,{
  releaseDate,expectedInitialWeekEnd,retrievedAt,
}={}){
  if(!validIso(retrievedAt))return hold("RETRIEVED_AT_INVALID");
  const pdf=Buffer.from(bytes??[]);
  if(pdf.length<80||pdf.length>MAX_BYTES)return hold("PDF_BYTES_INVALID");
  const candidate=inspectDolAdvancePdf(pdf,{releaseDate,expectedInitialWeekEnd,
    checkedAt:retrievedAt});
  if(candidate.status!=="CANDIDATE_ONLY")return hold(candidate.reason??"PDF_INVALID");
  if(Date.parse(retrievedAt)<Date.parse(releaseDate+"T00:00:00.000Z"))
    return hold("RETRIEVED_BEFORE_RELEASE");
  const body=pdf.toString("base64");
  if(!canonicalBase64(body)||!Buffer.from(body,"base64").equals(pdf))
    return hold("BASE64_ENCODING_INVALID");
  const bodyTextSha256=hex(Buffer.from(body,"utf8"));
  const requestKey="DOL_ETA538_PDF:"+releaseDate;
  const detail={
    schema:SCHEMA,bodyEncoding:ENCODING,originalContentType:"application/pdf",
    originalBodySha256:candidate.source.sha256,
    originalBodyBytes:pdf.length,
    bodyTextSha256,
    sourceUrl:candidate.source.url,
    sourceReleaseDate:releaseDate,
    sourceObservationWeeks:Object.fromEntries(candidate.rows.map(row=>[
      row.logicalSeriesId,row.observationDate,
    ])),
    provenanceStatus:"CANDIDATE_ONLY",
    // Explicitly no availableAt; a later readback cannot fabricate historic PIT.
  };
  return {
    status:"CANDIDATE_ONLY",
    reason:"SNAPSHOT_ENVELOPE_PREPARED_NOT_STORED_OR_PUBLISHED",
    snapshot:{releaseGroup:GROUP,provider:PROVIDER,requestKey,
      releaseAt:null,retrievedAt,httpStatus:200,
      contentType:"application/pdf",body,detail},
    evidence:{originalBodySha256:candidate.source.sha256,
      originalBodyBytes:pdf.length,bodyTextSha256,releaseDate,
      observationWeeks:detail.sourceObservationWeeks},
    // These are not R4 observation-current rows and must not be silently upserted.
    candidateRows:candidate.rows,
  };
}
// Validate the actual R6 rawSnapshot ordered TEXT chunks after SELECT.
// No D1/SQLite calls, no operator-provided hashes trusted without recomputing.
// Returns only hashes and the candidate observations, never raw binary or text.
export function verifyStoredDolAdvancePdfRawSnapshot(chunks,{
  releaseDate,expectedInitialWeekEnd,
}={}){
  if(!Array.isArray(chunks)||chunks.length<1||chunks.length>128)
    return hold("SNAPSHOT_CHUNKS_INVALID");
  const first=chunks[0],count=Number(first?.chunk_count);
  if(!Number.isSafeInteger(count)||count!==chunks.length||count<1||count>128)
    return hold("SNAPSHOT_CHUNK_COUNT_MISMATCH");
  const parsed=readDetail(first?.detail_json);
  const key="DOL_ETA538_PDF:"+releaseDate;
  if(!parsed||parsed.schema!==SCHEMA||parsed.bodyEncoding!==ENCODING||
    parsed.originalContentType!=="application/pdf"||
    parsed.sourceReleaseDate!==releaseDate||
    first.release_group!==GROUP||first.provider!==PROVIDER||first.request_key!==key||
    first.content_type!=="application/pdf"||
    !validIso(first.retrieved_at)||first.release_at!=null||
    !/^[0-9a-f]{64}$/.test(parsed.originalBodySha256??"")||
    !/^[0-9a-f]{64}$/.test(parsed.bodyTextSha256??"")||
    !Number.isSafeInteger(parsed.originalBodyBytes)||parsed.originalBodyBytes<80||
    parsed.originalBodyBytes>MAX_BYTES)return hold("SNAPSHOT_METADATA_INVALID");
  const bodyParts=[];
  for(let i=0;i<count;i++){
    const row=chunks[i];
    if(row.chunk_index!==i||row.chunk_count!==count||
      row.snapshot_id!==first.snapshot_id||
      row.release_group!==GROUP||row.provider!==PROVIDER||row.request_key!==key||
      row.retrieved_at!==first.retrieved_at||
      row.body_sha256!==first.body_sha256||
      row.detail_json!==first.detail_json||
      typeof row.body_chunk!=="string"||row.body_chunk.length>120_000)
      return hold("SNAPSHOT_CHUNK_INCONSISTENT");
    bodyParts.push(row.body_chunk);
  }
  const body=bodyParts.join("");
  if(!canonicalBase64(body))return hold("SNAPSHOT_BASE64_INVALID");
  const textHash=hex(Buffer.from(body,"utf8"));
  if(textHash!==first.body_sha256||textHash!==parsed.bodyTextSha256||
    first.snapshot_id!==hex(GROUP+"|"+PROVIDER+"|"+key+"|"+textHash))
    return hold("SNAPSHOT_TEXT_HASH_MISMATCH");
  const pdf=Buffer.from(body,"base64");
  if(pdf.toString("base64")!==body||pdf.length!==parsed.originalBodyBytes||
    hex(pdf)!==parsed.originalBodySha256)
    return hold("SNAPSHOT_ORIGINAL_BYTES_MISMATCH");
  const expected=prepareDolAdvancePdfRawSnapshot(pdf,{
    releaseDate,expectedInitialWeekEnd,retrievedAt:first.retrieved_at});
  if(expected.status!=="CANDIDATE_ONLY"||
    JSON.stringify(expected.evidence.observationWeeks)!==
      JSON.stringify(parsed.sourceObservationWeeks)||
    expected.snapshot.detail.sourceUrl!==parsed.sourceUrl)
    return hold("SNAPSHOT_RELEASE_OR_OBSERVATIONS_MISMATCH");
  return {status:"CANDIDATE_ONLY",reason:"EXACT_STORED_BYTES_ATTESTED_NOT_OPERATIONAL",
    snapshotId:first.snapshot_id,chunkCount:count,
    evidence:expected.evidence,candidateRows:expected.candidateRows};
}
