// Private confirmed configured-theme reader. Deliberately independent of
// legacy R37/DC/Space collectors, D1 clients, schedulers and publication.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {readRegistered,safeDirectory} from './theme-config-registry.mjs';
import {scoreRegistered} from './theme-config-score.mjs';

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
