// W01 offline research-only PIT evidence calculator.
// Requires a caller-supplied archive of real observations and exact UTC cutoffs.
// It NEVER requests providers, scores inflation, chooses weights, or writes data.
// An absence of archived release/storage provenance is UNKNOWN, never a zero.
import {INFLATION30_CANDIDATES} from './inflation-causal-30-candidate-screen-r1.mjs';

const fail=code=>{throw Object.assign(new Error(code),{code});};
const need=(ok,code)=>{if(!ok)fail(code);};
const isObject=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const sourceIds=new Set(INFLATION30_CANDIDATES.filter(x=>x.series!==null).map(x=>x.id));
const UTC=/^20\d\d-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d\.\d{3}Z$/;
const DAY=/^(?:19|20)\d\d-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/;
const exactIso=s=>typeof s==='string'&&UTC.test(s)&&
 new Date(s).toISOString()===s;
const exactDay=s=>typeof s==='string'&&DAY.test(s)&&
 new Date(s+'T00:00:00.000Z').toISOString().startsWith(s);
const RECORD_KEYS=new Set(['observationDate','availableAt','sourceStoredAt',
 'value','sourceVersion']);

function validateRecord(record){
 need(isObject(record)&&
  Object.keys(record).every(k=>RECORD_KEYS.has(k))&&
  exactDay(record.observationDate)&&
  (record.availableAt===null||exactIso(record.availableAt))&&
  (record.sourceStoredAt===null||exactIso(record.sourceStoredAt))&&
  (record.value===null||(typeof record.value==='number'&&Number.isFinite(record.value)))&&
  typeof record.sourceVersion==='string'&&
  record.sourceVersion.length>=1&&record.sourceVersion.length<=160,
  'W01_PIT_OBSERVATION_CONTRACT_STOP');
 // Never trust a sourceStoredAt earlier than the claimed release date.
 need(record.availableAt===null||record.sourceStoredAt===null||
  record.sourceStoredAt>=record.availableAt,
  'W01_PIT_PROVENANCE_ORDER_STOP');
 need(record.sourceStoredAt===null||
  record.observationDate<=record.sourceStoredAt.slice(0,10),
  'W01_PIT_FUTURE_OBSERVATION_STOP');
 return record;
}

function validateArchive(observationsById){
 need(isObject(observationsById)&&
  Object.keys(observationsById).every(id=>sourceIds.has(id)),
  'W01_PIT_SOURCE_SCOPE_STOP');
 const archive=new Map();
 for(const id of Object.keys(observationsById)){
  const rows=observationsById[id];
  need(Array.isArray(rows)&&rows.length<=20_000,
   'W01_PIT_SOURCE_SIZE_STOP');
  const keyed=new Map();
  const valid=rows.map(row=>{
   const x=validateRecord(row);
   // Same observation and two provenance instants must not imply two
   // contradictory values, even if their claimed sourceVersion differs.
   const key=[x.observationDate,x.availableAt,x.sourceStoredAt].join('|');
   if(keyed.has(key))need(keyed.get(key)===x.value,
    'W01_PIT_CONFLICTING_REVISION_STOP');
   keyed.set(key,x.value);
   return x;
  });
  archive.set(id,valid);
 }
 return archive;
}

function chooseAt(rows,cutoff){
 let best=null;
 for(const x of rows){
  // Archive inclusion at a verified PC sourceStoredAt proves the value
  // was known NO LATER than storage, without fabricating publication time.
  // Unknown availableAt must never be represented as an exact release time.
  if(x.value===null||x.sourceStoredAt===null||
    x.observationDate>cutoff.slice(0,10)||
    (x.availableAt!==null&&x.availableAt>cutoff)||
    x.sourceStoredAt>cutoff)continue;
  if(best===null||x.observationDate>best.observationDate||
    (x.observationDate===best.observationDate&&
     x.sourceStoredAt>best.sourceStoredAt))best=x;
 }
 return best;
}

function missingReason(rows,cutoff){
 if(rows.length===0)return 'NO_ARCHIVED_OBSERVATIONS';
 if(rows.some(x=>x.sourceStoredAt===null))
  return 'PIT_STORE_TIME_UNVERIFIED';
 if(rows.some(x=>x.value===null))return 'MISSING_VALUE_NOT_ZERO';
 if(rows.every(x=>(x.availableAt!==null&&x.availableAt>cutoff)||
    x.sourceStoredAt>cutoff||x.observationDate>cutoff.slice(0,10)))
  return 'NOT_YET_AVAILABLE_AT_CUTOFF';
 return 'NO_ELIGIBLE_PIT_OBSERVATION';
}

export function evaluateInflation30PitEvidence({cutoffs,observationsById}={}){
 need(Array.isArray(cutoffs)&&cutoffs.length>=1&&cutoffs.length<=120&&
  cutoffs.every(exactIso)&&cutoffs.every((x,i)=>i===0||x>cutoffs[i-1]),
  'W01_PIT_CUTOFF_CONTRACT_STOP');
 const archive=validateArchive(observationsById);
 const result=INFLATION30_CANDIDATES.map(c=>{
  const eligibleAsPredictor=c.researchRole==='PROVISIONAL_MODEL_CANDIDATE';
  if(c.sourceGroup==='DEFERRED_DEFINITION'||c.sourceGroup==='MERGED_DERIVATION'){
   return Object.freeze({id:c.id,sourceGroup:c.sourceGroup,
    eligibleAsPredictor:false,observationsSupplied:0,
    availableCutoffs:0,releaseVerifiedCutoffs:0,storageOnlyCutoffs:0,
    cutoffCount:cutoffs.length,
    status:c.sourceGroup==='MERGED_DERIVATION'?'MERGED_NO_NEW_RAW_SOURCE':'DEFINITION_NOT_APPROVED',
    firstFail:null,lastObservationDate:null,lastStoredAt:null});
  }
  const rows=archive.get(c.id)??[];
  let available=0,releaseVerified=0,storageOnly=0,firstFail=null,last=null;
  for(const cutoff of cutoffs){
   const match=chooseAt(rows,cutoff);
   if(match){
    available++;last=match;
    if(match.availableAt===null)storageOnly++;else releaseVerified++;
   }
   else if(firstFail===null)firstFail=Object.freeze({
    cutoff,reason:missingReason(rows,cutoff)});
  }
  return Object.freeze({id:c.id,sourceGroup:c.sourceGroup,
   eligibleAsPredictor,observationsSupplied:rows.length,
   availableCutoffs:available,releaseVerifiedCutoffs:releaseVerified,
   storageOnlyCutoffs:storageOnly,cutoffCount:cutoffs.length,
   status:available===cutoffs.length?'PIT_OBSERVABLE_AT_ALL_CUTOFFS':
    available>0?'PIT_PARTIAL':'PIT_UNVERIFIED',
   firstFail,lastObservationDate:last?.observationDate??null,
   lastStoredAt:last?.sourceStoredAt??null});
 });
 const availableSources=result.filter(x=>sourceIds.has(x.id)&&x.availableCutoffs>0).length;
 const fullyObserved=result.filter(x=>sourceIds.has(x.id)&&x.availableCutoffs===cutoffs.length).length;
 return Object.freeze({
  scope:'OFFLINE_PIT_EVIDENCE_ONLY_NOT_APPROVED',
  cutoffCount:cutoffs.length,sourceCandidates:26,
  sourceCandidatesWithPITObservation:availableSources,
  sourceCandidatesFullyObserved:fullyObserved,
  excludedFromCausalPredictors:Object.freeze(['15','17','22','23','27','30']),
  selectedIndicators:0,approvedWeights:0,approvedCompositeFormula:false,
  releaseTimeUnknownDoesNotImplyOriginalRelease:'STORED_SNAPSHOT_ONLY',
  candidates:Object.freeze(result),
 });
}
