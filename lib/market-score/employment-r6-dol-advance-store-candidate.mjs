// W04 ETA538 storage-shape candidate only: no network, SQLite, or D1 effects.
// The approved host must separately attest source, install, and commit effects.
import { createHash } from "node:crypto";
import { inspectDolAdvancePdf } from "./employment-r6-dol-advance-pdf-candidate.mjs";
import { prepareDolAdvancePdfRawSnapshot } from "./employment-r6-dol-pdf-raw-envelope.mjs";
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
  // Reuse the already-merged W04 canonical raw envelope and its exact-byte
  // readback contract. Never introduce a second ETA538 request key or encoding.
  const prepared=prepareDolAdvancePdfRawSnapshot(bytes,{
    releaseDate,expectedInitialWeekEnd,retrievedAt,
  });
  if(prepared.status!=="CANDIDATE_ONLY"||
     prepared.evidence?.originalBodySha256!==pdfSha)
    return hold("PDF_ENVELOPE_INVALID");
  const snapshots=[prepared.snapshot];
  // The R6 store SHA is for the serialized Base64 TEXT; do not confuse it
  // with the original binary PDF SHA. Preserve the exact snapshot identity
  // expected by the existing R4 responseHash -> R6 rawSnapshot readback.
  const textBodySha=prepared.evidence.bodyTextSha256;
  const rawSnapshotId=sha256("DOL_UI_WEEKLY_CLAIMS|DOL_ETA|"+
    prepared.snapshot.requestKey+"|"+textBodySha);
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
        responseHash:textBodySha,rawSnapshotId,
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

