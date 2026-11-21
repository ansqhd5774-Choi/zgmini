// Boundaries for existing configured-theme Writer ownership.
// Read-only preparation; the actual approved Writer must independently rerun
// preflight when it publishes. This module never invokes D1, creates a
// credential, changes a schedule or grants a supplier publication license.
import {calculateStoredConfiguredConfirmed} from './theme-platform-stored-configured.mjs';
import {preflightConfiguredPublication} from './theme-config-publication-preflight.mjs';

const need=(condition,code)=>{if(!condition)throw Object.assign(new Error(code),{code});};
const hash=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);

// The verified immutable score and the existing Writer preflight candidate
// must agree exactly before the owner can consider an approved publication.
export function prepareConfiguredExistingWriterHandoff({
 dataRoot,id,now=Date.now(),
 storedReader=calculateStoredConfiguredConfirmed,
 preflight=preflightConfiguredPublication
}={}){
 need(typeof dataRoot==='string'&&dataRoot&&
  typeof id==='string'&&/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(id)&&
  Number.isSafeInteger(now)&&now>0,'THEME_WRITER_HANDOFF_ARGS');
 const noWrites={providerCalls:0,d1Queries:0,d1Writes:0,schedulerWrites:0,
  publicationExecuted:false};
 let proven;
 try{proven=storedReader({dataRoot,id});}
 catch(error){return {status:'BLOCKED',stage:'SAVED_RESULT',
  reason:error.code??'THEME_WRITER_SAVED_RESULT_UNAVAILABLE',...noWrites};}
 need(hash(proven?.artifactSha256)&&Array.isArray(proven.rows)&&
  proven.rows.length===1,'THEME_WRITER_SAVED_PROOF_INVALID');
 let prepared;
 try{prepared=preflight({dataRoot,id,now});}
 catch(error){return {status:'BLOCKED',stage:'EXISTING_WRITER_PREFLIGHT',
  reason:error.code??'THEME_WRITER_PREFLIGHT_UNAVAILABLE',...noWrites};}
 if(prepared?.status!=='PREFLIGHT_PASS_NO_REMOTE_ACCESS')
  return {status:'BLOCKED',stage:prepared?.stage??'EXISTING_WRITER_PREFLIGHT',
   reason:prepared?.reason??'THEME_WRITER_PUBLICATION_APPROVAL_MISSING',
   scoreArtifactSha256:proven.artifactSha256,...noWrites};
 const c=prepared.candidate,row=proven.rows[0];
 need(prepared.providerCalls===0&&prepared.d1Queries===0&&
  prepared.d1Writes===0&&prepared.schedulerWrites===0&&
  prepared.publicationExecuted===false&&
  hash(prepared.candidateSha256)&&hash(prepared.approvalSha256)&&
  prepared.candidateSha256===proven.artifactSha256&&
  c?.candidateSha256===proven.artifactSha256&&
  c.themeId===id&&c.status==='READY'&&
  c.methodologyVersion===row.methodologyVersion&&
  c.sourceVersion===row.sourceVersion&&
  c.observationDate===row.observationDate&&
  c.score===row.score&&
  JSON.stringify(c.etfs)===JSON.stringify(row.etfs)&&
  JSON.stringify(c.history)===JSON.stringify(row.history),
  'THEME_WRITER_SAVED_PREFLIGHT_MISMATCH');
 // Local operator attestation is not independent provider licensing evidence.
 // No source/D1 authorization is created by this result.
 return {status:'LOCAL_HANDOFF_MATCH_NOT_PUBLISHED',
  stage:'SOURCE_AND_WRITER_PREFLIGHT_MATCH',
  feedKey:prepared.feedKey,id,observationDate:row.observationDate,
  sourceVersion:row.sourceVersion,scoreArtifactSha256:proven.artifactSha256,
  localApprovalSha256:prepared.approvalSha256,
  independentProviderRightsVerified:false,
  writerOwner:'EXISTING_CONFIGURED_WRITER',
  ...noWrites};
}
