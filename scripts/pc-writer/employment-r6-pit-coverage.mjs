// Read-only CURRENT/HISTORY lineage gate for an existing approved PC Core and
// an optional isolated candidate. Counts are diagnostics, not approval to copy
// data, backdate availability, modify schemas, or publish a candidate to D1.
import fs from "node:fs";
import {DatabaseSync} from "node:sqlite";
import {EMPLOYMENT_R6_TABLES} from "../../lib/market-score/employment-r6-contract.mjs";
import {EMPLOYMENT_R6_REQUIRED_LOGICAL_SERIES} from "../../lib/market-score/employment-r6-formula.mjs";

const T=EMPLOYMENT_R6_TABLES;
const ids=[...EMPLOYMENT_R6_REQUIRED_LOGICAL_SERIES];
const identity=row=>[row.logical_series_id,row.geography_type,row.geography_code,row.observation_date].join("\u001f");
const validAsOf=date=>typeof date==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(date)
  &&Number.isFinite(Date.parse(date+"T00:00:00Z"))
  &&new Date(date+"T00:00:00Z").toISOString().slice(0,10)===date;
const sourceRows=(db,table,asOfDate)=>{
  const exists=db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(table);
  if(!exists)return null;
  const fields=new Set(db.prepare(`PRAGMA table_info(${table})`).all().map(col=>col.name));
  const available=fields.has("available_at")?"available_at":"NULL AS available_at";
  const list=ids.map(()=>"?").join(",");
  return db.prepare(`SELECT logical_series_id,geography_type,geography_code,
    observation_date,source_hash,value,retrieved_at,${available}
    FROM ${table} WHERE logical_series_id IN (${list}) AND observation_date<=?`)
    .all(...ids,asOfDate);
};
const historyIndex=(rows,asOfDate)=>{
  const out=new Map(),end=Date.parse(asOfDate+"T23:59:59.999Z");
  for(const row of rows??[]){
    const known=Date.parse(row.available_at??row.retrieved_at??"");
    if(!Number.isFinite(known)||known>end)continue;
    const key=identity(row),set=out.get(key)??[];
    set.push(row);out.set(key,set);
  }
  return out;
};

export function auditEmploymentR6PitCoverage({dbPath,candidateDbPath=null,asOfDate}={}){
  if(!validAsOf(asOfDate))throw Error("PIT_AUDIT_AS_OF_INVALID");
  if(typeof dbPath!=="string"||!fs.existsSync(dbPath))throw Error("PIT_AUDIT_CORE_NOT_FOUND");
  if(candidateDbPath&&(typeof candidateDbPath!=="string"||!fs.existsSync(candidateDbPath)))
    throw Error("PIT_AUDIT_CANDIDATE_NOT_FOUND");
  if(candidateDbPath&&fs.realpathSync(candidateDbPath)===fs.realpathSync(dbPath))
    throw Error("PIT_AUDIT_CANDIDATE_IS_CORE");
  const core=new DatabaseSync(dbPath,{readOnly:true});
  const candidate=candidateDbPath?new DatabaseSync(candidateDbPath,{readOnly:true}):null;
  try{
    const current=sourceRows(core,T.observationCurrent,asOfDate);
    const history=sourceRows(core,T.observationHistory,asOfDate);
    const candidates=candidate?sourceRows(candidate,T.observationHistory,asOfDate):null;
    const currentKeys=new Map((current??[]).map(row=>[identity(row),row]));
    const historyKeys=historyIndex(history,asOfDate);
    const candidateKeys=historyIndex(candidates,asOfDate);
    const missingBySeries=new Map();
    let missing=0,candidateCovered=0,candidateSameValueAndHash=0,candidateDifferent=0;
    for(const [key,row] of currentKeys){
      if(historyKeys.has(key))continue;
      missing++;
      const s=missingBySeries.get(row.logical_series_id)??{id:row.logical_series_id,missing:0,candidateCovered:0,matchingCandidate:0};
      s.missing++;
      const compatible=candidateKeys.get(key)??[];
      if(compatible.length){
        candidateCovered++;s.candidateCovered++;
        if(compatible.some(other=>other.source_hash===row.source_hash&&Number(other.value)===Number(row.value))){
          candidateSameValueAndHash++;s.matchingCandidate++;
        }else candidateDifferent++;
      }
      missingBySeries.set(row.logical_series_id,s);
    }
    return {
      kind:"EMPLOYMENT_R6_PIT_READONLY_COVERAGE_R1",asOfDate,
      coreCurrentTableExists:current!==null,coreHistoryTableExists:history!==null,
      candidateHistoryTableExists:candidate?candidates!==null:null,
      coreCurrentRows:current?.length??null,coreHistoryRevisions:history?.length??null,
      coreHistoryAsOfUniqueKeys:history===null?null:historyKeys.size,
      coreCurrentKeys:current===null?null:currentKeys.size,
      coreCurrentKeysMissingHistory:current===null||history===null?null:missing,
      missingKeysWithCandidateHistory:candidate&&current!==null&&history!==null&&candidates!==null?candidateCovered:null,
      missingKeysWithMatchingCandidateValueAndHash:candidate&&current!==null&&history!==null&&candidates!==null?candidateSameValueAndHash:null,
      missingKeysWithDifferentCandidateRevision:candidate&&current!==null&&history!==null&&candidates!==null?candidateDifferent:null,
      candidateHistoryAsOfUniqueKeys:candidate&&candidates!==null?candidateKeys.size:null,
      missingBySeries:current!==null&&history!==null?[...missingBySeries.values()].sort((a,b)=>a.id.localeCompare(b.id)):null,
      promotionApproved:false,coreWrites:0,providerCalls:0,
    };
  }finally{core.close();candidate?.close();}
}
