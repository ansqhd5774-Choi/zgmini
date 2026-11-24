// Source-only post-write readback of ETA538 raw PDF and its 4 National rows.
// The authorised PC host owns the SELECT/transaction, approval and effects.
// No network, SQL, provider calls, writes, or public projections here.
import {createHash} from "node:crypto";
import {verifyStoredDolAdvancePdfRawSnapshot} from "./employment-r6-dol-pdf-raw-envelope.mjs";
import {EMPLOYMENT_R4_PIT_CLASSES} from "./employment-r4-shadow-contract.mjs";

const SERIES=Object.freeze({
  INITIAL_CLAIMS:"DOL:ETA538:InitialClaims:SA",
  INITIAL_CLAIMS_4W:"DOL:ETA538:InitialClaims:SA4WK",
  CONTINUED_CLAIMS:"DOL:ETA538:ContinuedClaims:SA",
  INSURED_UNEMPLOYMENT_RATE:"DOL:ETA538:IUR:SA",
});
const hash=value=>createHash("sha256").update(value).digest("hex");
const hold=reason=>({status:"HOLD",reason,verifiedRows:0});
const iso=value=>typeof value==="string"&&Number.isFinite(Date.parse(value));
function detail(value){
  try{
    const parsed=typeof value==="string"?JSON.parse(value):value;
    return parsed&&typeof parsed==="object"&&!Array.isArray(parsed)?parsed:null;
  }catch{return null;}
}
export function verifyDolAdvanceStoredRowLineage({
  rawChunks,observationRows,releaseDate,expectedInitialWeekEnd,
}={}){
  const raw=verifyStoredDolAdvancePdfRawSnapshot(rawChunks,{
    releaseDate,expectedInitialWeekEnd,
  });
  if(raw.status!=="CANDIDATE_ONLY")return hold(raw.reason??"RAW_SNAPSHOT_UNVERIFIED");
  const expected=raw.candidateRows;
  if(!Array.isArray(expected)||expected.length!==4||
     !Array.isArray(observationRows)||observationRows.length!==4)
    return hold("NATIONAL_ROW_COUNT_INVALID");
  const snapshotId=raw.snapshotId;
  const responseHash=raw.evidence.bodyTextSha256;
  const originalHash=raw.evidence.originalBodySha256;
  const retrievedAt=rawChunks[0].retrieved_at;
  const checked=new Set();
  for(const row of observationRows){
    const key=row?.logical_series_id;
    const source=expected.find(x=>x.logicalSeriesId===key);
    if(!source||checked.has(key)||!(key in SERIES))return hold("NATIONAL_SERIES_ID_INVALID");
    checked.add(key);
    const metadata=detail(row?.provenance_json);
    if(!metadata||row.provider!=="DOL_ETA"||
       row.provider_series_id!==SERIES[key]||
       row.geography_type!=="NATIONAL"||row.geography_code!=="US"||
       row.observation_date!==source.observationDate||
       Number(row.value)!==source.value||
       row.unit!==source.unit||
       row.quality_status!=="READY_FORWARD"||
       row.pit_class!==EMPLOYMENT_R4_PIT_CLASSES.forwardObserved||
       !iso(row.release_date)||row.release_date.slice(0,10)!==releaseDate||
       !iso(row.available_at)||!iso(row.retrieved_at)||
       Date.parse(row.available_at)>Date.parse(row.retrieved_at)||
       Date.parse(row.available_at)<Date.parse(releaseDate+"T00:00:00Z"))
      return hold("NATIONAL_OBSERVATION_MISMATCH");
    const record={
      logicalSeriesId:key,observationDate:source.observationDate,
      providerSeriesId:SERIES[key],value:source.value,unit:source.unit,
      releaseDate,
    };
    const observationHash=hash(JSON.stringify(record));
    if(row.source_hash!==observationHash||
       metadata.rawRecordHash!==observationHash||
       metadata.responseHash!==responseHash||
       metadata.rawSnapshotId!==snapshotId||
       metadata.originalPdfSha256!==originalHash||
       metadata.sourceKind!=="ETA538_ADVANCE_RELEASE_PDF"||
       metadata.historicAvailabilityAttested!==false||
       metadata.observedAt!==retrievedAt)
      return hold("NATIONAL_PROVENANCE_MISMATCH");
  }
  return {
    status:"LINEAGE_VERIFIED",verifiedRows:4,snapshotId,
    originalPdfSha256:originalHash,storedTextSha256:responseHash,
    releaseDate,observationWeeks:raw.evidence.observationWeeks,
    publication:"NOT_ATTESTED",
  };
}
