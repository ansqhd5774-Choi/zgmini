// W04 PIT-04-08: read-only per-key evidence for STATE_INITIAL_CLAIMS.
// No SQLite access, provider calls, PIT backdating, mutation, or publication.
import {EMPLOYMENT_R4_CORE_STATES,EMPLOYMENT_R4_PIT_CLASSES} from "./employment-r4-shadow-contract.mjs";
const STATES=new Set(EMPLOYMENT_R4_CORE_STATES);
const PIT_CLASSES=new Set(Object.values(EMPLOYMENT_R4_PIT_CLASSES));
const SHA=/^[a-f0-9]{64}$/i;
const validDay=x=>typeof x==="string"&&/^20\d{2}-\d{2}-\d{2}$/.test(x)
  &&Number.isFinite(Date.parse(x+"T00:00:00Z"))
  &&new Date(x+"T00:00:00Z").toISOString().slice(0,10)===x;
const epoch=x=>typeof x==="string"&&x.trim()&&Number.isFinite(Date.parse(x))?Date.parse(x):null;
const key=r=>[r.logical_series_id,r.geography_type,r.geography_code,r.observation_date].join("|");
const validKey=r=>r?.logical_series_id==="STATE_INITIAL_CLAIMS"&&r.geography_type==="STATE"
  &&STATES.has(r.geography_code)&&validDay(r.observation_date)
  &&new Date(r.observation_date+"T00:00:00Z").getUTCDay()===6;
const validValue=x=>(typeof x==="number"&&Number.isSafeInteger(x)&&x>=0)
  ||(typeof x==="string"&&/^(?:0|[1-9][0-9]*)$/.test(x)
    &&Number.isSafeInteger(Number(x)));
function withinAsOf(row,asOf){
  const retrieved=epoch(row?.retrieved_at);
  const available=row?.available_at==null?retrieved:epoch(row.available_at);
  if(retrieved===null||available===null||retrieved>asOf||available>asOf)return false;
  // An optional SQLite time column with NULL/bad metadata must not erase
  // the underlying CURRENT key. Only a *known future time* excludes the row
  // from an as-of snapshot; malformed/missing metadata is handled by HOLD.
  for(const field of ["first_seen_at","recorded_at"])
    if(Object.hasOwn(row,field)){
      const n=epoch(row[field]);
      if(n!==null&&n>asOf)return false;
    }
  return true;
}
function metadata(row,asOf){
  // A declared timestamp whose value is unknown cannot attest candidate
  // lineage, even though the key itself remains visible for manual review.
  if(row&&["first_seen_at","recorded_at"].some(field=>
    Object.hasOwn(row,field)&&epoch(row[field])===null))return false;
  if(!row||!validKey(row)||!validValue(row.value)||!SHA.test(row.source_hash??"")
     ||!withinAsOf(row,asOf)||row.provider!=="DOL_ETA"
     ||row.provider_series_id!=="ETA539:C3"||!String(row.quality_status??"").trim()
     ||!PIT_CLASSES.has(row.pit_class)
     ||typeof row.provenance_json!=="string"||row.provenance_json.length>16384)return false;
  try{const x=JSON.parse(row.provenance_json);return x&&typeof x==="object"&&!Array.isArray(x);}
  catch{return false;}
}
const same=(a,b)=>Boolean(a&&b&&validValue(a.value)&&validValue(b.value)
  &&Number(a.value)===Number(b.value)&&a.source_hash===b.source_hash
  &&a.provider===b.provider&&a.provider_series_id===b.provider_series_id);
function groups(rows,asOf){
  const m=new Map();
  for(const row of rows)if(validKey(row)&&withinAsOf(row,asOf)){
    const k=key(row),a=m.get(k)??[];a.push(row);m.set(k,a);
  }
  return m;
}
function mostRecent(rows){
  if(!rows?.length)return {row:null,ambiguous:false};
  const ordered=[...rows].sort((a,b)=>(epoch(b.retrieved_at)??-1)-(epoch(a.retrieved_at)??-1)
    ||(epoch(b.recorded_at)??-1)-(epoch(a.recorded_at)??-1));
  const r=ordered[0],ambiguous=ordered.slice(1).some(x=>
    epoch(x.retrieved_at)===epoch(r.retrieved_at)
    &&epoch(x.recorded_at)===epoch(r.recorded_at)&&!same(x,r));
  return {row:r,ambiguous};
}
/**
 * Source-only classification. Identity is public series/state/week; report
 * contains no source hash, raw count, provenance, PC path, or full timestamps.
 * Conflict counts and HISTORY missing counts can overlap and must not be added.
 * Candidate internal metadata consistency never certifies historical PIT.
 * An A-grade report has a 12KB byte ceiling: paginate at <=8 identity rows
 * and retain the same validated as-of snapshot between requests.
 */
export function classifyEmploymentR6Pit04KeyEvidence({
  coreCurrentRows,coreHistoryRows,candidateCurrentRows,candidateHistoryRows,
  asOfIso,maxEvidenceRows=8,offset=0,
}={}){
  const collections=[coreCurrentRows,coreHistoryRows,candidateCurrentRows,candidateHistoryRows];
  if(!collections.every(Array.isArray)||collections.some((x,i)=>x.length>(i%2===0?50000:100000)))
    throw Error("PIT0408_INPUT_INVALID");
  const asOf=epoch(asOfIso);
  if(asOf===null||!Number.isSafeInteger(maxEvidenceRows)||maxEvidenceRows<1||maxEvidenceRows>8
    ||!Number.isSafeInteger(offset)||offset<0||offset>50000)
    throw Error("PIT0408_ARGUMENT_INVALID");
  const core=groups(coreCurrentRows,asOf),history=groups(coreHistoryRows,asOf);
  const candidate=groups(candidateCurrentRows,asOf),candidateHistory=groups(candidateHistoryRows,asOf);
  const counts={coreKeys:core.size,coreHistoryMissing:0,coreHistoryConflict:0,
    coreHistoryAmbiguous:0,candidateOverlapConflicts:0,missingCandidateInternalMatch:0,
    missingCandidateIncomplete:0,missingWithoutCandidate:0,duplicateCurrentKeys:0};
  const evidence=[];
  for(const [k,rows] of [...core].sort(([a],[b])=>a.localeCompare(b))){
    const row=rows[0],h=mostRecent(history.get(k)),c=mostRecent(candidate.get(k));
    const ch=mostRecent(candidateHistory.get(k));
    const missing=!h.row,historyConflict=Boolean(h.row&&!same(row,h.row));
    const candidateConflict=Boolean(c.row&&!same(row,c.row));
    const internal=Boolean(c.row&&ch.row&&!c.ambiguous&&!ch.ambiguous
      &&metadata(row,asOf)&&metadata(c.row,asOf)&&metadata(ch.row,asOf)
      &&same(row,c.row)&&same(c.row,ch.row));
    if(missing)counts.coreHistoryMissing++;
    if(historyConflict)counts.coreHistoryConflict++;
    if(h.ambiguous)counts.coreHistoryAmbiguous++;
    if(candidateConflict)counts.candidateOverlapConflicts++;
    if(rows.length>1)counts.duplicateCurrentKeys++;
    if(missing){
      if(internal)counts.missingCandidateInternalMatch++;
      else if(c.row||ch.row)counts.missingCandidateIncomplete++;
      else counts.missingWithoutCandidate++;
    }
    if(!missing&&!historyConflict&&!candidateConflict&&!h.ambiguous&&rows.length===1)continue;
    const reason=candidateConflict?"CANDIDATE_CURRENT_CONFLICT"
      :h.ambiguous?"CORE_HISTORY_AMBIGUOUS"
      :historyConflict?"CORE_HISTORY_CONFLICT"
      :rows.length>1?"CORE_CURRENT_DUPLICATE"
      :internal?"MISSING_HISTORY_CANDIDATE_INTERNAL_MATCH_ONLY"
      :c.row||ch.row?"MISSING_HISTORY_CANDIDATE_UNVERIFIED"
      :"MISSING_HISTORY_NO_CANDIDATE";
    evidence.push({logicalSeriesId:row.logical_series_id,geographyCode:row.geography_code,
      observationDate:row.observation_date,reason,
      coreHistoryMissing:missing,candidateCurrentConflict:candidateConflict,
      rawPitAttested:false,repairAuthorized:false});
  }
  const priority=["CANDIDATE_CURRENT_CONFLICT","CORE_HISTORY_AMBIGUOUS",
    "CORE_HISTORY_CONFLICT","CORE_CURRENT_DUPLICATE",
    "MISSING_HISTORY_CANDIDATE_UNVERIFIED","MISSING_HISTORY_NO_CANDIDATE",
    "MISSING_HISTORY_CANDIDATE_INTERNAL_MATCH_ONLY"];
  evidence.sort((a,b)=>priority.indexOf(a.reason)-priority.indexOf(b.reason)
    ||a.observationDate.localeCompare(b.observationDate)
    ||a.geographyCode.localeCompare(b.geographyCode));
  return {kind:"EMPLOYMENT_R6_PIT0408_KEY_REVIEW_SOURCE_ONLY_V1",
    status:"HOLD_KEY_CLASSIFICATION_NOT_RAW_PIT_ATTESTATION",counts,
    evidenceTotal:evidence.length,offset,pageSize:maxEvidenceRows,
    evidenceTruncated:offset+maxEvidenceRows<evidence.length,
    nextOffset:offset+maxEvidenceRows<evidence.length?offset+maxEvidenceRows:null,
    evidence:evidence.slice(offset,offset+maxEvidenceRows),
    rawPitAttested:false,promotionApproved:false,repairAuthorized:false,
    providerCalls:0,sqliteWrites:0,d1Writes:0};
}
