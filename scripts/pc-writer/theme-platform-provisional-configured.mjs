// Stored-only registered provisional bridge. It replays the existing R32
// calculator against approved saved Parquet, never fetches or publishes data.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {readRegistered,safeDirectory} from './theme-config-registry.mjs';
import {readConfiguredEvidence,readConfiguredSessions} from './theme-config-score.mjs';
import {preflightConfiguredPublication} from './theme-config-publication-preflight.mjs';
import {configuredProvisionalCandidate} from './theme-config-provisional.mjs';
import {readNineR45SavedDates} from './theme-nine-r45-private-eod-feed.mjs';
import {validConfiguredProvisional,validR32History,CONFIGURED_V2} from
 '../../worker/theme-configured-r32-contract.mjs';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const need=(ok,code)=>{if(!ok)throw Object.assign(new Error(code),{code});};
const fileName=/^provisional-([a-f0-9]{64})\.json$/;

// This is a private evidence bridge, not a replacement for the D1 publisher.
// No candidate is created when the exact local output has not been saved.
export async function calculateStoredConfiguredProvisional({
 dataRoot,theme,confirmedResult,now=new Date(),decoder=null,
 registrationReader=readRegistered,preflight=preflightConfiguredPublication,
 sessionReader=readConfiguredSessions,evidenceReader=readConfiguredEvidence,
 savedReader=readNineR45SavedDates,calculate=configuredProvisionalCandidate
}={}){
 need(typeof dataRoot==='string'&&dataRoot&&theme?.operational?.family==='configured'&&
  typeof theme.id==='string'&&now instanceof Date&&!Number.isNaN(now.getTime()),
  'THEME_CONFIG_PROVISIONAL_INPUT');
 const registration=registrationReader(dataRoot,theme.id);
 const definition=registration?.definition;
 need(definition?.schema==='ZGMINI_THEME_CONFIG_V2'&&definition.id===theme.id&&
  definition.label===theme.label&&definition.profile===theme.methodologyVersion&&
  JSON.stringify(definition.etfs)===JSON.stringify(theme.etfs),
  'THEME_CONFIG_PROVISIONAL_DEFINITION_MISMATCH');
 const prior=confirmedResult?.rows?.find(row=>row.label===theme.label);
 need(prior&&prior.methodologyVersion===theme.methodologyVersion&&
  JSON.stringify(prior.etfs)===JSON.stringify(theme.etfs)&&
  Array.isArray(prior.history)&&prior.history.length===252,
  'THEME_CONFIG_PROVISIONAL_CONFIRMED_NOT_VERIFIED');
 const approval=preflight({dataRoot,id:theme.id,now:now.getTime()});
 need(approval?.status==='PREFLIGHT_PASS_NO_REMOTE_ACCESS'&&approval.candidate,
  'THEME_CONFIG_PROVISIONAL_APPROVAL_OR_SOURCE_MISSING');
 const confirmed=approval.candidate;
 need(confirmed.status==='READY'&&confirmed.version===CONFIGURED_V2&&
  confirmed.themeId===theme.id&&confirmed.definitionSha256===registration.sha256&&
  confirmed.observationDate===prior.observationDate&&
  confirmed.score===prior.score&&confirmed.sourceVersion===prior.sourceVersion&&
  JSON.stringify(confirmed.history)===JSON.stringify(prior.history),
  'THEME_CONFIG_PROVISIONAL_CONFIRMED_DRIFT');
 const directory=safeDirectory(dataRoot,'themes/'+registration.internalId+'/derived');
 const candidates=[];
 for(const name of fs.readdirSync(directory).filter(n=>fileName.test(n))){
  const file=path.join(directory,name),stat=fs.lstatSync(file);
  need(stat.isFile()&&!stat.isSymbolicLink()&&
   fs.realpathSync(file)===file&&stat.size<=2_000_000,
   'THEME_CONFIG_PROVISIONAL_FILE_INVALID');
  const bytes=fs.readFileSync(file);
  need(sha(bytes)===fileName.exec(name)[1],'THEME_CONFIG_PROVISIONAL_SHA_MISMATCH');
  let record;
  try{record=JSON.parse(bytes);}catch{
   need(false,'THEME_CONFIG_PROVISIONAL_JSON_INVALID');
  }
  need(record&&typeof record==='object'&&!Array.isArray(record),
   'THEME_CONFIG_PROVISIONAL_RECORD_INVALID');
  if(record.themeId!==theme.id||record.confirmedObservationDate!==prior.observationDate)continue;
  need(record.status==='READY'&&record.version===CONFIGURED_V2&&
   record.methodologyVersion===theme.methodologyVersion&&
   record.definitionSha256===registration.sha256&&
   record.approvalSha256===confirmed.approvalSha256&&
   record.candidateSha256===confirmed.candidateSha256&&
   record.publicationAuthorized===true&&
   /^R32_PROVISIONAL_SHA256_[a-f0-9]{64}$/.test(record.sourceVersion??'')&&
   validR32History(record)&&validConfiguredProvisional(record),
   'THEME_CONFIG_PROVISIONAL_CONTRACT_INVALID');
  candidates.push({record,bytes,artifactSha256:sha(bytes)});
 }
 need(candidates.length>0,'THEME_CONFIG_PROVISIONAL_NOT_STORED');
 candidates.sort((a,b)=>b.record.observationDate.localeCompare(a.record.observationDate));
 need(candidates.length===1||
  candidates[0].record.observationDate!==candidates[1].record.observationDate,
  'THEME_CONFIG_PROVISIONAL_SAME_DAY_AMBIGUOUS');
 const {record,artifactSha256}=candidates[0];
 need(Number.isFinite(Date.parse(record.sourceStoredAt))&&
  Date.parse(record.sourceStoredAt)<=now.getTime(),
  'THEME_CONFIG_PROVISIONAL_SOURCE_CLOCK');
 const dates=record.sourceFiles.map(f=>f.date);
 const saved=await savedReader({dataRoot,dates,decoder});
 need(saved?.rows instanceof Map&&saved.hashes instanceof Map&&
  record.sourceFiles.every(f=>saved.hashes.get(f.date)===f.sha256),
  'THEME_CONFIG_PROVISIONAL_RAW_SHA_MISMATCH');
 // Source timestamps are part of the existing saved-data provenance contract.
 // A different file observation time cannot impersonate the original candidate.
 need(saved.sourceStoredAt===record.sourceStoredAt,
  'THEME_CONFIG_PROVISIONAL_SOURCE_TIME_MISMATCH');
 const sessions=sessionReader({dataRoot,registration}).sessions;
 const aum=evidenceReader(dataRoot,definition.aumEvidence);
 const recomputed=calculate({definition,sessions,aum,confirmed,
  rows:saved.rows,hashes:saved.hashes,sourceStoredAt:record.sourceStoredAt,
  prior:{history:record.history.slice(0,-1)}});
 need(JSON.stringify(recomputed)===JSON.stringify(record),
  'THEME_CONFIG_PROVISIONAL_REPLAY_MISMATCH');
 return {artifactSha256,
  historicalReaderContract:'LOCAL_SAVED_R32_REPLAY_VERIFIED',
  currentVisibility:'UNKNOWN_D1_STORED_AT_NOT_READ',
  rows:[{label:theme.label,etfs:[...theme.etfs],
   methodologyVersion:theme.methodologyVersion,
   observationDate:record.observationDate,score:record.score,
   confirmedObservationDate:record.confirmedObservationDate,
   points:record.history.map(p=>({date:p.date,score:p.score})),
   sourceVersion:record.sourceVersion}]};
}
