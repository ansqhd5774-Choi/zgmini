// W01 source-only adapter from the existing seven PRIVATE PC raw JSON documents
// into the offline point-in-time evidence calculator. No file/network/DB access.
// A document-level sourceStoredAt is evidence of a stored snapshot, NOT an
// assertion that every historical observation was publicly released then.
// Do not invent availableAt or reconstruct unpublished historical vintages.
import {INFLATION_CANDIDATES_7} from './inflation-causal-candidates-public-7-catalog.mjs';
import {evaluateInflation30PitEvidence} from './inflation-causal-30-pit-evidence-r1.mjs';
import {projectInflationCandidate7Row}
 from '../scripts/pc-writer/inflation-causal-candidates-public-7-preview-r1.mjs';

export const INFLATION7_PRIVATE_RAW_FILES=Object.freeze({
 '2':'eia-us-regular-gasoline-weekly.json',
 '16':'treasury-mts-customs-duties.json',
 '22':'bls-cpi-ppi3.json',
 '23':'bls-cpi-ppi3.json',
 '24':'bls-cpi-ppi3.json',
 '28':'census-m3-manufacturing-inventories.json',
 '29':'fed-g17-manufacturing-ip.json',
});

const obj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const VALID_FILES=new Set(Object.values(INFLATION7_PRIVATE_RAW_FILES));
const ERROR=/^INFL7_[A-Z0-9_]{3,80}$/;
const fail=c=>{throw Object.assign(new Error(c),{code:c});};
function valueOf(id,observation){
 if(id==='16')return Number(observation.netUsdDecimal);
 return observation.value;
}
function rawRows(id,meta,doc){
 const rows=['22','23','24'].includes(id)?
  doc.series?.[meta.series]:doc.observations;
 return rows.map(x=>({
  observationDate:x.date,
  availableAt:null, // unknown release timing is never guessed
  sourceStoredAt:doc.sourceStoredAt,
  value:valueOf(id,x),sourceVersion:doc.sourceVersion,
 }));
}

export function evaluateInflation7StoredPitAdapter({
 cutoffs,documentsByFile,now=Date.now()
}={}){
 if(!obj(documentsByFile)||Object.keys(documentsByFile)
  .some(file=>!VALID_FILES.has(file)))
  fail('W01_PIT_PRIVATE_FILE_SCOPE_STOP');
 if(!Number.isSafeInteger(now)||now<=0)
  fail('W01_PIT_AUDIT_TIME_STOP');
 // Run the same per-series source contract as existing PC-side public preview.
 // A malformed series must remain UNVERIFIED even when another series in the
 // same BLS file is valid; do not let a failed document contribute points.
 const observationsById={},sourceErrors={};
 for(const meta of INFLATION_CANDIDATES_7){
  const file=INFLATION7_PRIVATE_RAW_FILES[meta.id];
  const doc=documentsByFile[file];
  if(!doc){sourceErrors[meta.id]='SOURCE_FILE_NOT_SUPPLIED';continue;}
  try{
   projectInflationCandidate7Row(meta,doc,{now});
   observationsById[meta.id]=rawRows(meta.id,meta,doc);
  }catch(error){
   sourceErrors[meta.id]=ERROR.test(error?.message??'')?
    error.message:'SOURCE_CONTRACT_UNVERIFIED';
  }
 }
 const evaluation=evaluateInflation30PitEvidence({cutoffs,observationsById});
 const observed=INFLATION_CANDIDATES_7
  .filter(m=>evaluation.candidates.find(c=>c.id===m.id)?.availableCutoffs>0)
  .map(m=>m.id);
 return Object.freeze({
  schema:'W01_PRIVATE_INFLATION7_STORED_PIT_AUDIT_R1',
  evidenceLevel:'CALLER_SUPPLIED_STORED_DOCUMENTS_NOT_LIVE_PC_PROOF',
  sourceFilesSupplied:Object.keys(documentsByFile).length,
  sourceRowsParsed:Object.keys(observationsById).length,
  sevenCandidatesWithConservativePIT:observed.length,
  sevenIdsWithConservativePIT:Object.freeze(observed),
  sourceErrors:Object.freeze(sourceErrors),
  providerCalls:0,dbWrites:0,d1Writes:0,rawEgress:0,
  evaluation,
 });
}
