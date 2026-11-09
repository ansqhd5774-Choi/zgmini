import {createHash} from 'node:crypto';

// A private, deterministic input-change signal. This does not replace the
// existing sourceVersion/sourceStoredAt or create a public history record.
const IDENTIFIER=/^[A-Za-z][A-Za-z0-9_.:-]{0,95}$/;
const STATE=/^[A-Z][A-Z0-9_]{0,47}$/;
const HASH=/^[a-f0-9]{64}$/;

function requiredText(value,pattern,field){
 if(typeof value!=='string'||!pattern.test(value))throw Error(`INVALID_${field}`);
 return value;
}

function optionalText(value,field){
 if(value===null||value===undefined)return null;
 if(typeof value!=='string'||!value||value.length>128)throw Error(`INVALID_${field}`);
 return value;
}

export function scoreInputLineage({scoreId,methodologyVersion,eligibilityState,evaluationKey=null,sources}={}){
 const id=requiredText(scoreId,IDENTIFIER,'SCORE_ID');
 const method=requiredText(methodologyVersion,IDENTIFIER,'METHODOLOGY_VERSION');
 const state=requiredText(eligibilityState,STATE,'ELIGIBILITY_STATE');
 const evaluation=optionalText(evaluationKey,'EVALUATION_KEY');
 if(!Array.isArray(sources)||sources.length===0)throw Error('INPUT_EVIDENCE_REQUIRED');
 const seen=new Set();
 const normalized=sources.map(source=>{
  const key=requiredText(source?.key,IDENTIFIER,'SOURCE_KEY');
  if(seen.has(key))throw Error('DUPLICATE_SOURCE_KEY');
  seen.add(key);
  const sourceState=requiredText(source?.state,STATE,'SOURCE_STATE');
  const observation=optionalText(source?.observationId,'OBSERVATION_ID');
  const revision=optionalText(source?.revisionId,'REVISION_ID');
  const digest=source?.bodySha256??null;
  if(digest!==null&&!HASH.test(digest))throw Error('INVALID_SOURCE_DIGEST');
  if(sourceState==='READY'&&digest===null)throw Error('READY_SOURCE_DIGEST_REQUIRED');
  // Deliberately ignore output storedAt, publication timestamps and any
  // unrecognized source properties, including raw provider payloads.
  return [key,sourceState,observation,revision,digest];
 }).sort((a,b)=>a[0]<b[0]?-1:a[0]>b[0]?1:0);
 const encoded=JSON.stringify(['score-input-lineage-r1',id,method,state,evaluation,normalized]);
 return Object.freeze({scoreId:id,inputSignature:createHash('sha256').update(encoded).digest('hex'),sourceCount:normalized.length,eligibilityState:state});
}

// The caller must supply the LAST VERIFIED publication, not a pending
// calculation or an unverified D1 write. Never use this as a write gate alone.
export function scoreInputRebuildDecision(candidate,lastVerified=null){
 if(!candidate||!HASH.test(candidate.inputSignature)||typeof candidate.scoreId!=='string')throw Error('INVALID_CANDIDATE_LINEAGE');
 if(lastVerified===null||lastVerified?.publicationVerified!==true)return {required:true,reason:'NO_VERIFIED_PUBLICATION'};
 if(lastVerified.scoreId!==candidate.scoreId)throw Error('LINEAGE_SCORE_ID_MISMATCH');
 if(!HASH.test(lastVerified.inputSignature))return {required:true,reason:'UNVERIFIED_PREVIOUS_SIGNATURE'};
 return lastVerified.inputSignature===candidate.inputSignature
  ?{required:false,reason:'UNCHANGED_EFFECTIVE_INPUT'}
  :{required:true,reason:'EFFECTIVE_INPUT_CHANGED'};
}
