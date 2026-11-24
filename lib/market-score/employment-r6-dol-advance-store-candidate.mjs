// W04 ETA538 storage-shape candidate only: no network, SQLite, or D1 effects.
// The approved host must separately attest source, install, and commit effects.
import { createHash } from "node:crypto";
import { inspectDolAdvancePdf } from "./employment-r6-dol-advance-pdf-candidate.mjs";
import { EMPLOYMENT_R4_PIT_CLASSES, EMPLOYMENT_R4_SHADOW_SCHEMA_VERSION }
  from "./employment-r4-shadow-contract.mjs";

const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");
const SERIES = Object.freeze({
  INITIAL_CLAIMS:"DOL:ETA538:InitialClaims:SA",
  INITIAL_CLAIMS_4W:"DOL:ETA538:InitialClaims:SA4WK",
  CONTINUED_CLAIMS:"DOL:ETA538:ContinuedClaims:SA",
  INSURED_UNEMPLOYMENT_RATE:"DOL:ETA538:IUR:SA",
});
const hold = reason => ({
  status:"HOLD", reason, rows:[], snapshots:[],
  operationalWrites:0, providerCalls:0, d1Writes:0, writeAuthorized:false,
});
function utcIso(value) {
  return typeof value==="string"
    && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)
    && Number.isFinite(Date.parse(value))
    && new Date(value).toISOString()===value;
}

// Consumes previously obtained official PDF bytes; never calls a provider.
// This returns arguments compatible with the existing R6 store, not a command
// to call it. No historical availableAt is inferred from PDF Last-Modified.
export function buildDolAdvanceStoreCandidate(pdfBytes,{
  releaseDate,expectedInitialWeekEnd,releaseAt,now=()=>new Date(),
}={}) {
  let retrievedAt;
  try { retrievedAt=now().toISOString(); } catch { return hold("RETRIEVAL_TIME_INVALID"); }
  if (!utcIso(retrievedAt)||!utcIso(releaseAt)
    || typeof releaseDate!=="string"||releaseAt.slice(0,10)!==releaseDate
    || Date.parse(releaseAt)>Date.parse(retrievedAt))return hold("RELEASE_TIME_INVALID");
  const candidate=inspectDolAdvancePdf(pdfBytes,{
    releaseDate,expectedInitialWeekEnd,checkedAt:retrievedAt,
  });
  if(candidate.status!=="CANDIDATE_ONLY")return hold(candidate.reason??"PDF_UNVERIFIED");
  if(candidate.rows.length!==4
    || new Set(candidate.rows.map(x=>x.logicalSeriesId)).size!==4
    || candidate.rows.some(x=>!(x.logicalSeriesId in SERIES)
      || !Number.isFinite(x.value)||x.value<0
      || (x.logicalSeriesId==="INSURED_UNEMPLOYMENT_RATE"&&x.value>100)
      || x.releaseDate!==releaseDate))return hold("SERIES_INVALID");
  const bytes=Buffer.from(pdfBytes);
  const pdfSha=sha256(bytes);
  if(candidate.source?.sha256!==pdfSha
    ||candidate.source.byteLength!==bytes.byteLength)return hold("PDF_HASH_MISMATCH");
  // R6 rawSnapshot stores UTF-8 text: base64 preserves PDF bytes without schema
  // changes. Its body_sha256 hashes base64 text, NOT the original PDF. Keep
  // originalPdfSha256 distinct and verify it after decoding on eventual readback.
  const encoded=bytes.toString("base64");
  if(sha256(Buffer.from(encoded,"base64"))!==pdfSha)return hold("PDF_ENCODING_INVALID");
  const snapshots=[{
    releaseGroup:"DOL_UI_WEEKLY_CLAIMS", provider:"DOL_ETA",
    requestKey:`DOL_ETA538_ARCHIVE:${releaseDate}`,
    releaseAt,retrievedAt,httpStatus:200,contentType:"application/x-base64",
    body:encoded,
    detail:{
      sourceKind:"ETA538_ADVANCE_RELEASE_PDF",
      originalContentType:"application/pdf",
      storedBodyEncoding:"BASE64_ORIGINAL_PDF",
      originalPdfSha256:pdfSha,originalPdfByteLength:bytes.byteLength,
      originalSourceUrl:candidate.source.url,
      observedAt:retrievedAt,
      historicAvailabilityAttested:false,
    },
  }];
  const rows=candidate.rows.map(item=>{
    const providerSeriesId=SERIES[item.logicalSeriesId];
    // Observation hash is for canonical data, distinct from full PDF bytes hash.
    const record={
      logicalSeriesId:item.logicalSeriesId, observationDate:item.observationDate,
      providerSeriesId,value:item.value,unit:item.unit,releaseDate,
    };
    const rawRecordHash=sha256(JSON.stringify(record));
    return {
      logicalSeriesId:item.logicalSeriesId,provider:"DOL_ETA",
      providerSeriesId,geographyType:"NATIONAL",geographyCode:"US",
      frequency:"WEEKLY",unit:item.unit,seasonalAdjustment:"SA",
      populationCoverage:"UI_CLAIMS_NATIONAL",
      observationDate:item.observationDate,releaseDate:releaseAt,
      // Earliest evidenced by this call, not the historic public release time.
      availableAt:retrievedAt,retrievedAt,value:item.value,
      sourceRevision:null,sourceHash:rawRecordHash,
      qualityStatus:"READY_FORWARD",pitClass:EMPLOYMENT_R4_PIT_CLASSES.forwardObserved,
      schemaVersion:EMPLOYMENT_R4_SHADOW_SCHEMA_VERSION,
      provenance:{
        sourceUrl:candidate.source.url,sourceKind:"ETA538_ADVANCE_RELEASE_PDF",
        originalPdfSha256:pdfSha,rawRecordHash,
        observedAt:retrievedAt,historicAvailabilityAttested:false,
      },
    };
  });
  return {
    status:"CANDIDATE_ONLY",
    reason:"SOURCE_SHAPE_READY_OPERATIONAL_STORAGE_NOT_APPROVED_OR_EXECUTED",
    rows,snapshots,originalPdfSha256:pdfSha,
    operationalWrites:0,providerCalls:0,d1Writes:0,writeAuthorized:false,
  };
}


// Pure stored-body readback check for the existing R6 text snapshot table.
// Verify both hashes independently; a base64 body hash is not a PDF hash.
export function inspectDolAdvanceStoredSnapshot({body,bodySha256,detail}={}) {
  if(typeof body!=="string"||body.length===0||body.length>11_000_000
    || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(body)
    || detail?.storedBodyEncoding!=="BASE64_ORIGINAL_PDF"
    || detail?.originalContentType!=="application/pdf"
    || !/^[a-f0-9]{64}$/.test(String(bodySha256??""))
    || !/^[a-f0-9]{64}$/.test(String(detail?.originalPdfSha256??""))
    || !Number.isSafeInteger(detail?.originalPdfByteLength))
    return {status:"HOLD",reason:"STORED_SNAPSHOT_FORMAT_INVALID"};
  if(sha256(Buffer.from(body,"utf8"))!==bodySha256)
    return {status:"HOLD",reason:"STORED_BODY_HASH_MISMATCH"};
  const pdf=Buffer.from(body,"base64");
  if(pdf.toString("base64")!==body||pdf.length!==detail.originalPdfByteLength
    ||sha256(pdf)!==detail.originalPdfSha256)
    return {status:"HOLD",reason:"ORIGINAL_PDF_HASH_MISMATCH"};
  return {status:"RAW_BYTES_VERIFIED",originalPdfSha256:detail.originalPdfSha256,
    originalPdfByteLength:pdf.length,observationsVerified:false,
    historicalAvailabilityAttested:false,operationalWrites:0};
}
