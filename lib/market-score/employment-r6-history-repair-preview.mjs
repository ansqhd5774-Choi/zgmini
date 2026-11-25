import {createHash} from "node:crypto";

const sha=x=>createHash("sha256").update(x).digest("hex");
const hash=x=>typeof x==="string"&&/^[a-f0-9]{64}$/.test(x);
const time=x=>typeof x==="string"&&Number.isFinite(Date.parse(x));
const key=(s,t,g,d)=>[s,t,g,d].join("|");
const currentKey=r=>key(r.logical_series_id,r.geography_type,r.geography_code,r.observation_date);
const evidenceKey=r=>key(r.logicalSeriesId,r.geographyType,r.geographyCode,r.observationDate);
const count=x=>typeof x==="number"&&Number.isSafeInteger(x)&&x>=0;
const historical="HISTORICAL_CURRENT_OR_REVISED_PROVIDER_HISTORY";

// Source-only preparation for the existing Writer. This does not authorize or
// execute a write. Keep the private receipt, raw references and row CAS local.
// Never use a provider observation date as the time the repaired History existed.
export function prepareEmploymentHistoryRepair({receiptBytes,receiptSha256,evidenceDigest,
  expectedKeys,currentRows,historyRows,recordedAt}={}){
  if(!Buffer.isBuffer(receiptBytes)||!hash(receiptSha256)||sha(receiptBytes)!==receiptSha256||
    !hash(evidenceDigest)||!count(expectedKeys)||expectedKeys>50000||
    !Array.isArray(currentRows)||!Array.isArray(historyRows)||!time(recordedAt))
    throw Error("W04_REPAIR_INPUT_INVALID");
  const p=JSON.parse(receiptBytes.toString("utf8"));
  if(p.kind!=="PIT0605_PC_WORKSPACE_PRIVATE_V1"||p.digest!==evidenceDigest||
    !Array.isArray(p.rows)||p.rows.length!==expectedKeys||
    sha(JSON.stringify(p.rows))!==evidenceDigest)throw Error("W04_REPAIR_RECEIPT_MISMATCH");
  const current=new Map(),history=new Set(historyRows.map(currentKey)),seen=new Set();
  for(const r of currentRows){
    const id=currentKey(r);if(current.has(id))throw Error("W04_REPAIR_CURRENT_DUPLICATE");
    current.set(id,r);
  }
  const rows=[],held={existingHistory:0,unmatched:0,unsupportedCurrent:0};
  for(const e of p.rows){
    const id=evidenceKey(e);
    if(seen.has(id))throw Error("W04_REPAIR_DUPLICATE_EVIDENCE");
    seen.add(id);
    if(e.logicalSeriesId!=="STATE_INITIAL_CLAIMS"||e.geographyType!=="STATE"||
      !/^[A-Z]{2}$/.test(e.geographyCode??"")||!/^\d{4}-\d{2}-\d{2}$/.test(e.observationDate??"")||
      e.historicalAvailabilityProved!==false||e.repairAuthorized!==false)
      throw Error("W04_REPAIR_SCOPE_INVALID");
    if(history.has(id)){held.existingHistory++;continue;}
    const c=current.get(id);
    if(!c||c.provider!=="DOL_ETA"||c.provider_series_id!=="ETA539:C3"||
      c.frequency!=="WEEKLY"||c.pit_class!==historical||!count(c.value)||
      !hash(c.source_hash)||!time(c.retrieved_at)){held.unsupportedCurrent++;continue;}
    if(e.classification!=="RAW_OBSERVATION_MATCH_HISTORICAL_TIME_UNPROVEN"||
      !Array.isArray(e.sourceVersions)){held.unmatched++;continue;}
    const versions=e.sourceVersions.filter(v=>v.sourceHash===c.source_hash&&
      v.value===c.value&&(v.sourceRevision??null)===(c.source_revision??null)&&
      hash(v.responseHash)&&hash(v.snapshotId)&&time(v.retrievedAt)&&
      Date.parse(v.retrievedAt)<=Date.parse(recordedAt))
      .sort((a,b)=>Date.parse(a.retrievedAt)-Date.parse(b.retrievedAt)||
        a.snapshotId.localeCompare(b.snapshotId));
    if(!versions.length){held.unmatched++;continue;}
    // Retain the actual receipt time separately; operational availability of
    // the proposed newly inserted History row is no earlier than its recording.
    rows.push({key:id,currentPreimage:{...c},sourceReceipt:{...versions[0]},
      proposedAvailableAt:recordedAt,proposedRecordedAt:recordedAt,
      historicalAvailabilityProved:false});
  }
  return {status:"REPAIR_PREVIEW_ONLY",eligible:rows.length,held,rows,
    historicalVersionAttested:false,repairAuthorized:false,sqliteWrites:0};
}
