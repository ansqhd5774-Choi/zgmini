// Private confirmed configured-theme reader. Deliberately independent of
// legacy R37/DC/Space collectors, D1 clients, schedulers and publication.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {readRegistered,safeDirectory} from './theme-config-registry.mjs';
import {scoreRegistered} from './theme-config-score.mjs';
import {identity} from './theme-platform.mjs';
import {calculateStoredConfiguredProvisional} from './theme-platform-provisional-configured.mjs';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const need=(condition,code)=>{
 if(!condition)throw Object.assign(new Error(code),{code});
};
const validScore=value=>typeof value==='number'&&Number.isFinite(value)&&
 value>=0&&value<=100;

// No new score is written. A successful result proves that the existing
// immutable score file has exactly the bytes the approved scorer recomputes.
export function calculateStoredConfiguredConfirmed({
 dataRoot,id,registrationReader=readRegistered,scoreCalculator=scoreRegistered
}={}){
 need(typeof dataRoot==='string'&&dataRoot&&typeof id==='string'&&
  /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(id),
  'THEME_CONFIG_STORED_INPUT');
 const registration=registrationReader(dataRoot,id);
 const definition=registration?.definition;
 need(definition?.id===id&&typeof definition.profile==='string'&&
  /^[a-f0-9]{64}$/.test(registration?.sha256??'')&&
  /^registered-[a-z0-9-]+$/.test(registration?.internalId??''),
  'THEME_CONFIG_STORED_REGISTRATION');
 const result=scoreCalculator({dataRoot,registration});
 need(result?.status==='PRIVATE_SCORE_READY'&&result.themeId===id&&
  result.profile===definition.profile&&
  result.definitionSha256===registration.sha256&&
  result.publicationAuthorized===false&&
  Array.isArray(result.etfs)&&
  JSON.stringify(result.etfs)===JSON.stringify(definition.etfs)&&
  typeof result.sourceVersion==='string'&&result.sourceVersion&&
  Array.isArray(result.history)&&result.history.length===252&&
  result.history.at(-1)?.date===result.observationDate&&
  result.history.at(-1)?.score===result.score&&
  validScore(result.score),
  'THEME_CONFIG_STORED_SCORE_CONTRACT');
 const bytes=Buffer.from(JSON.stringify(result,null,2)+'\n');
 const artifactSha256=sha(bytes);
 const home=safeDirectory(dataRoot,'themes/'+registration.internalId+'/derived');
 const file=path.join(home,'score-'+artifactSha256+'.json');
 need(fs.existsSync(file),'THEME_CONFIG_STORED_SCORE_NOT_SAVED');
 const stat=fs.lstatSync(file);
 need(stat.isFile()&&!stat.isSymbolicLink()&&fs.realpathSync(file)===file&&
  stat.size===bytes.length&&sha(fs.readFileSync(file))===artifactSha256,
  'THEME_CONFIG_STORED_SCORE_REPLAY_MISMATCH');
 return {artifactSha256,rows:[{
  label:result.label,etfs:[...result.etfs],
  methodologyVersion:result.profile,
  observationDate:result.observationDate,score:result.score,
  history:result.history,sourceVersion:result.sourceVersion
 }]};
}

// Use the shared batch/checkpoint runner. No legacy collector, D1 token
// or publication action is invoked. Both phases replay already saved input.
export function createConfiguredStoredPrivateAdapters({dataRoot,
 calculator=calculateStoredConfiguredConfirmed,
 provisionalCalculator=calculateStoredConfiguredProvisional,
 now=new Date(),decoder=null}={}){
 need(typeof dataRoot==='string'&&dataRoot,'THEME_CONFIG_STORED_DATA_ROOT');
 need(now instanceof Date&&!Number.isNaN(now.getTime()),'THEME_CONFIG_STORED_CLOCK');
 const cache=new Map();
 const saved=(theme,kind)=>{
  const key=kind+':'+theme.id;
  if(!cache.has(key))cache.set(key,Promise.resolve().then(async()=>{
   if(kind==='confirmed')return calculator({dataRoot,id:theme.id});
   if(kind==='provisional')return provisionalCalculator({
    dataRoot,theme,confirmedResult:await saved(theme,'confirmed'),now,decoder
   });
   need(false,'THEME_CONFIG_STORED_KIND_UNSUPPORTED');
  }));
  return cache.get(key);
 };
 const stage=async({theme,kind,stage,completed}={})=>{
  need(theme?.operational?.family==='configured'&&
   typeof theme.id==='string','THEME_CONFIG_STORED_FAMILY');
  const batch=await saved(theme,kind);
  const row=batch?.rows?.find(x=>x.label===theme.label);
  const consistent=Array.isArray(row?.etfs)&&
   row.methodologyVersion===theme.methodologyVersion&&
   JSON.stringify(row.etfs)===JSON.stringify(theme.etfs)&&
   typeof row.sourceVersion==='string'&&!!row.sourceVersion&&
   /^\d{4}-\d{2}-\d{2}$/.test(row.observationDate??'')&&
   validScore(row.score);
  const confirmed=kind==='confirmed'&&
   Array.isArray(row?.history)&&row.history.length===252&&
   row.history.at(-1)?.date===row.observationDate&&
   row.history.at(-1)?.score===row.score;
  const provisional=kind==='provisional'&&
   batch?.historicalReaderContract==='LOCAL_SAVED_R32_REPLAY_VERIFIED'&&
   batch?.currentVisibility==='UNKNOWN_D1_STORED_AT_NOT_READ'&&
   /^\d{4}-\d{2}-\d{2}$/.test(row?.confirmedObservationDate??'')&&
   row.confirmedObservationDate<row.observationDate&&
   Array.isArray(row.points)&&row.points.length>0&&
   row.points.at(-1)?.date===row.observationDate&&
   row.points.at(-1)?.score===row.score;
  need(/^[a-f0-9]{64}$/.test(batch?.artifactSha256??'')&&
   consistent&&(confirmed||provisional),
   'THEME_CONFIG_STORED_PROJECTION_MISMATCH');
  return {
   status:'VERIFIED',artifactSha256:batch.artifactSha256,
   methodologyVersion:theme.methodologyVersion,
   definitionSha256:identity(theme),
   calculationSha256:completed?.calculate?.artifactSha256,
   observationDate:row.observationDate,sourceVersion:row.sourceVersion,
   ...(provisional?{
    historicalReaderContract:batch.historicalReaderContract,
    currentVisibility:batch.currentVisibility
   }:{}),
   stage,existingOwner:true,publicationAuthorized:false
  };
 };
 return {source:stage,calculate:stage,validate:stage};
}
