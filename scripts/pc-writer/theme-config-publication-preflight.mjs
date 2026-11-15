// Phase 2: offline publication preparation only. No provider, D1 or task access.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readRegistered,safeDirectory,ensure,digest,validDate,listRegistered} from './theme-config-registry.mjs';
import {scoreRegistered} from './theme-config-score.mjs';
import {PUBLIC_DISPLAY_MAX_AGE_MS} from '../../worker/public-display-freshness.mjs';
import {CONFIGURED_V2} from '../../worker/theme-configured-r32-contract.mjs';
export const CONFIGURED_PUBLIC_VERSION='ZGMINI_CONFIGURED_THEME_PUBLIC_V1';
const terms='https://getmarkethistory.com/docs/terms';
const checkFile=file=>ensure(fs.lstatSync(file).isFile()&&!fs.lstatSync(file).isSymbolicLink(),'PUBLIC_PREFLIGHT_FILE_REDIRECT');
const exactKeys=(value,keys)=>value&&Object.getPrototypeOf(value)===Object.prototype&&Object.keys(value).length===keys.length&&keys.every(k=>Object.hasOwn(value,k));
function verifyApproval(a,r,{now}){
 ensure(exactKeys(a,['schema','themeId','definitionSha256','profile','etfs','benchmark','selectionReviewed','publicationAuthorized','derivedOnlyNoRaw','rights','approvedAt','expiresAt']),'PUBLIC_APPROVAL_SCHEMA');
 ensure(a.schema==='ZGMINI_CONFIGURED_PUBLIC_APPROVAL_V1'&&a.themeId===r.definition.id&&a.definitionSha256===r.sha256&&a.profile===r.definition.profile&&a.benchmark==='SPY'&&JSON.stringify(a.etfs)===JSON.stringify(r.definition.etfs),'PUBLIC_APPROVAL_IDENTITY');
 ensure(a.selectionReviewed===true&&a.publicationAuthorized===true&&a.derivedOnlyNoRaw===true,'PUBLIC_APPROVAL_SCOPE');
 ensure(Number.isFinite(Date.parse(a.approvedAt))&&Number.isFinite(Date.parse(a.expiresAt))&&Date.parse(a.approvedAt)<=now&&Date.parse(a.expiresAt)>now,'PUBLIC_APPROVAL_EXPIRED_OR_FUTURE');
 ensure(exactKeys(a.rights,['mode','termsUrl','evidenceReference'])&&a.rights.termsUrl===terms&&typeof a.rights.evidenceReference==='string'&&a.rights.evidenceReference.trim().length>0&&a.rights.evidenceReference.length<=500,'PUBLIC_RIGHTS_EVIDENCE_REQUIRED');
 // Presence of an operator's attestation is not an independent legal finding.
 // No anonymous-risk assumption is inherited from unrelated legacy themes.
 ensure(a.rights.mode==='VERIFIED_DERIVED_PUBLICATION_RIGHTS','PUBLIC_RIGHTS_MODE_REVIEW_REQUIRED');
}
export function preflightConfiguredPublication({dataRoot,id,now=Date.now()}={}){
 const result={version:'ZGMINI_CONFIGURED_PUBLICATION_PREFLIGHT_V1',id,status:'PREFLIGHT_BLOCKED',stage:'REGISTRATION',providerCalls:0,d1Queries:0,d1Writes:0,schedulerWrites:0,publicationExecuted:false};
 try{
  ensure(Number.isSafeInteger(now)&&now>0,'PUBLIC_PREFLIGHT_CLOCK');
  const r=readRegistered(dataRoot,id),d=r.definition;
  result.definitionSha256=r.sha256;
  result.stage='STORED_SCORE_REPLAY';
  const score=scoreRegistered({dataRoot,registration:r});
  ensure(score.status==='PRIVATE_SCORE_READY'&&score.score!==null,'PUBLIC_SCORE_NOT_READY');
  const home=safeDirectory(dataRoot,'themes/'+r.internalId),derived=safeDirectory(home,'derived');
  const encoded=Buffer.from(JSON.stringify(score,null,2)+'\n'),candidateSha256=digest(encoded);
  const candidateFile=path.join(derived,'score-'+candidateSha256+'.json');
  ensure(fs.existsSync(candidateFile),'PUBLIC_STORED_SCORE_MISSING');checkFile(candidateFile);
  ensure(digest(fs.readFileSync(candidateFile))===candidateSha256,'PUBLIC_STORED_SCORE_SHA');
  result.candidateSha256=candidateSha256;
  result.stage='SOURCE_FRESHNESS';
  const file=path.join(home,'raw-manifest.json');checkFile(file);
  const manifest=JSON.parse(fs.readFileSync(file,'utf8'));
  const times=manifest.files.map(f=>Date.parse(f.collectedAt));
  ensure(times.length&&times.every(t=>Number.isFinite(t)&&t<=now),'PUBLIC_SOURCE_CLOCK');
  const sourceStoredAt=Math.max(...times);
  ensure(validDate(score.observationDate)&&Date.parse(score.observationDate+'T00:00:00Z')<=now&&now-Date.parse(score.observationDate+'T23:59:59Z')<PUBLIC_DISPLAY_MAX_AGE_MS&&now-sourceStoredAt<PUBLIC_DISPLAY_MAX_AGE_MS,'PUBLIC_SOURCE_STALE');
  result.observationDate=score.observationDate;result.sourceStoredAt=new Date(sourceStoredAt).toISOString();
  result.stage='OPERATOR_PUBLICATION_APPROVAL';
  const approvalDir=path.join(fs.realpathSync(dataRoot),'theme-config','public-approvals');
  ensure(fs.existsSync(approvalDir),'PUBLIC_APPROVAL_MISSING');safeDirectory(dataRoot,'theme-config/public-approvals');
  const approvalFile=path.join(approvalDir,id+'.json');ensure(fs.existsSync(approvalFile),'PUBLIC_APPROVAL_MISSING');checkFile(approvalFile);
  const approvalBytes=fs.readFileSync(approvalFile);ensure(approvalBytes.length<=8192,'PUBLIC_APPROVAL_SIZE');
  const approval=JSON.parse(approvalBytes);verifyApproval(approval,r,{now});
  result.approvalSha256=digest(approvalBytes);
  const v2=d.schema==='ZGMINI_THEME_CONFIG_V2';
  const candidate={version:v2?CONFIGURED_V2:CONFIGURED_PUBLIC_VERSION,status:'READY',themeId:d.id,theme:d.label,etfs:[...d.etfs],benchmark:'SPY',methodologyVersion:d.profile,
   definitionSha256:r.sha256,candidateSha256,approvalSha256:result.approvalSha256,sourceVersion:score.sourceVersion,sourceStoredAt:result.sourceStoredAt,
   observationDate:score.observationDate,score:score.score,history:v2?structuredClone(score.history):score.history.map(p=>({date:p.date,score:p.score,status:p.status,weights:p.weights})),
   ...(v2?{selectionEvidenceSha256:score.selectionEvidenceSha256,aumEvidenceSha256:score.aumEvidenceSha256}:{}),
   derivedOnlyNoRaw:true,publicationAuthorized:true,publicationAuthorizationBasis:'LOCAL_OPERATOR_ATTESTATION_NOT_INDEPENDENT_LEGAL_VERIFICATION'};
  return {...result,status:'PREFLIGHT_PASS_NO_REMOTE_ACCESS',stage:'LOCAL_PREPARATION_COMPLETE',feedKey:'theme-configured:'+id,candidate};
 }catch(e){return {...result,reason:e.code??'PUBLIC_PREFLIGHT_LOCAL_SOURCE_INVALID'};}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [mode,id,...extra]=process.argv.slice(2),dataRoot=process.env.ZGMINI_DATA_ROOT??'E:/ZGmini/data';
 try{
  ensure(!extra.length&&(mode==='--all'&&!id||mode==='--preflight'&&id),'PUBLIC_PREFLIGHT_USAGE');
  const results=mode==='--all'?listRegistered(dataRoot).map(r=>preflightConfiguredPublication({dataRoot,id:r.definition.id})):[preflightConfiguredPublication({dataRoot,id})];
  // Operator evidence contains only verdicts and hashes, never raw bars or an
  // automatically created approval. Candidate bytes are returned to code callers.
  console.log(JSON.stringify({status:results.length?'READONLY_PREFLIGHT_RESULTS':'NO_REGISTERED_THEMES',results:results.map(({candidate,...r})=>r),providerCalls:0,d1Queries:0,d1Writes:0},null,2));
  if(results.some(r=>r.status==='PREFLIGHT_BLOCKED'))process.exitCode=2;
 }catch(e){console.error(JSON.stringify({status:'PREFLIGHT_BLOCKED',reason:e.code??'LOCAL_IO_ERROR',d1Queries:0,d1Writes:0}));process.exitCode=2;}
}
