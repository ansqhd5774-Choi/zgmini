// Stored-only bridge for the existing calculators. No collector, publisher,
// task installer or public-reader function is invoked here. The existing
// immutable derived artifact must match recomputation before a stage is verified.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {calculateNineR47PrivateScores} from './theme-nine-r47-private-score.mjs';
import {calculateNineR47PrivateThemes,loadNineR47OfficialEvidence} from './theme-nine-r47-private-theme-aggregate.mjs';
import {calculateDataCenterPower} from './theme-data-center-power-r1.mjs';
import {runApprovedSpacePcR28} from './theme-space-satellite-operational-r28.mjs';
import {scoreRegistered} from './theme-config-score.mjs';
import {readRegistered} from './theme-config-registry.mjs';
import {R32,identity} from './theme-platform.mjs';
import {PAIR50,SPACE_R32} from './theme-platform-operational.mjs';
import {calculateStoredR88} from './theme-platform-provisional-r88.mjs';
import {createVerifiedOptionalProvisionalCalculator} from './theme-platform-provisional-optional.mjs';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const need=(ok,code)=>{if(!ok)throw Object.assign(new Error(code),{code});};
const pretty=value=>Buffer.from(JSON.stringify(value,null,2)+'\n');
const compact=value=>Buffer.from(JSON.stringify(value)+'\n');
const project=fileURLToPath(new URL('../../',import.meta.url));
const validScore=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=100;

function exactExisting(dataRoot,relative,bytes){
 const root=fs.realpathSync(dataRoot),file=path.resolve(root,relative);
 need(file.startsWith(root+path.sep),'THEME_STORED_PATH_ESCAPE');
 need(fs.existsSync(file),'THEME_STORED_DERIVED_NOT_SAVED');
 const stat=fs.lstatSync(file);
 need(stat.isFile()&&!stat.isSymbolicLink()&&fs.realpathSync(file)===file,
  'THEME_STORED_DERIVED_REDIRECT');
 need(sha(fs.readFileSync(file))===sha(bytes),'THEME_STORED_REPLAY_MISMATCH');
 return sha(bytes);
}

export function calculateStoredR37({dataRoot,configDirectory=path.join(project,'config'),now=new Date()}={}){
 const rosterPath=path.join(configDirectory,'theme-nine-r20-approved-candidates.json');
 let sessions;
 const scores=calculateNineR47PrivateScores({dataRoot,rosterPath,now,
  onVerifiedSessions:value=>{sessions=value;}});
 const evidence=loadNineR47OfficialEvidence({configDirectory,rosterPath});
 const themes=calculateNineR47PrivateThemes({scores,...evidence});
 const first=pretty(scores),second=pretty(themes);
 const suffix=sha(Buffer.concat([first,second])).slice(0,16);
 const prefix=`themes/legacy-nine-r47-private/THEME_NINE_R47_PRIVATE_${themes.benchmarkDate}_${suffix}`;
 exactExisting(dataRoot,prefix+'_ETF.json',first);
 const artifactSha256=exactExisting(dataRoot,prefix+'_NINE.json',second);
 need(themes.themes?.length===9&&themes.counts?.themes===9&&
  themes.publicationAuthorized===false,'THEME_STORED_R37_CONTRACT');
 const roster=new Map(evidence.roster.groups.map(g=>[g.theme,g.tickers.map(t=>t.ticker)]));
 return {artifactSha256,replayContext:{scores,evidence,sessions},rows:themes.themes.map(t=>({label:t.theme,
  etfs:roster.get(t.theme),methodologyVersion:R32,
  observationDate:themes.benchmarkDate,score:t.latest?.score,history:t.history,
  sourceVersion:identity(scores.source)}))};
}

export function calculateStoredDc({dataRoot}={}){
 const result=calculateDataCenterPower({dataRoot});
 need(result?.status==='PRIVATE_CANDIDATE_NOT_PUBLISHED'&&
  result.methodologyVersion===PAIR50,'THEME_STORED_DC_CONTRACT');
 const bytes=pretty(result),hash=sha(bytes);
 const artifactSha256=exactExisting(dataRoot,
  `themes/data-center-power/derived/dc-power-r1-${hash.slice(0,16)}.json`,bytes);
 return {artifactSha256,rows:[{label:result.theme,etfs:result.etfs,
  methodologyVersion:PAIR50,observationDate:result.observationDate,
  score:result.score,history:result.history,sourceVersion:result.sourceVersion}]};
}

export function calculateStoredSpace({dataRoot}={}){
 const result=runApprovedSpacePcR28({dataRoot,historicalSingleContinuity:true});
 need(result?.status==='PRIVATE_CURRENT_APPROVED_BASKET_READY'&&
  result.history?.length===252,'THEME_STORED_SPACE_CONTRACT');
 const bytes=compact(result),hash=sha(bytes);
 const artifactSha256=exactExisting(dataRoot,
  `themes/space-satellite/derived/space-satellite-r29-${hash}.json`,bytes);
 return {artifactSha256,rows:[{label:'우주·위성',etfs:result.etfs,
  methodologyVersion:SPACE_R32,observationDate:result.scoreAsOf,
  score:result.latest.score,history:result.history,
  sourceVersion:identity({spaceManifestSha256:result.sourceManifestSha256,
   sharedSpyManifestSha256:result.sharedSpyManifestSha256})}]};
}

export function calculateStoredConfigured({dataRoot,id}={}){
 const registration=readRegistered(dataRoot,id);
 const result=scoreRegistered({dataRoot,registration});
 need(result?.status==='PRIVATE_SCORE_READY'&&result.themeId===id&&
  result.profile===registration.definition.profile,
  'THEME_STORED_CONFIGURED_CONTRACT');
 const bytes=pretty(result),hash=sha(bytes);
 const artifactSha256=exactExisting(dataRoot,
  `themes/${registration.internalId}/derived/score-${hash}.json`,bytes);
 return {artifactSha256,rows:[{label:result.label,etfs:result.etfs,
  methodologyVersion:result.profile,observationDate:result.observationDate,
  score:result.score,history:result.history,sourceVersion:result.sourceVersion}]};
}

// Existing D1 readers are injected from their approved owner. This bridge is
// incapable of creating a D1 client, using a token, publishing or scheduling.
export function createVerifiedStoredProvisionalCalculator({readFeed,readPublicBase,
 now=new Date(),
 decoder=null,calculateR88=calculateStoredR88,
 optionalFactory=createVerifiedOptionalProvisionalCalculator}={}){
 need(typeof readFeed==='function','THEME_STORED_PUBLIC_READBACK_REQUIRED');
 need(now instanceof Date&&!Number.isNaN(now.getTime()),'THEME_STORED_CLOCK');
 const optional=optionalFactory({readFeed,now,decoder});
 return async({dataRoot,theme,group,confirmedResult}={})=>{
  if(group==='r37'){
   // The existing public API projects modelRevision and R88 Reader version;
   // the raw R37 D1 body lacks those fields and must not impersonate the API.
   need(typeof readPublicBase==='function','THEME_STORED_R32_PUBLIC_API_REQUIRED');
   const publicBase=await readPublicBase();
   need(publicBase?.status==='READY'&&
    typeof publicBase.modelRevision==='string'&&
    typeof publicBase.r32ProvisionalReaderVersion==='string',
    'THEME_STORED_R32_PUBLIC_API_INVALID');
   return calculateR88({dataRoot,publicBase,confirmedResult,now,decoder});
  }
  if(group==='data-center'||group==='space')
   return optional({dataRoot,theme,group,confirmedResult});
  need(false,'THEME_STORED_CONFIGURED_PROVISIONAL_PUBLIC_BASE_REQUIRED');
 };
}

export function createStoredOperationalAdapters({dataRoot,
 calculators={r37:calculateStoredR37,'data-center':calculateStoredDc,
  space:calculateStoredSpace,configured:calculateStoredConfigured},
 provisionalCalculator=null,now=new Date()}={}){
 need(typeof dataRoot==='string'&&dataRoot,'THEME_STORED_DATA_ROOT');
 need(now instanceof Date&&!Number.isNaN(now.getTime()),'THEME_STORED_CLOCK');
 const cache=new Map();
 const groupResult=(theme,kind)=>{
  const family=theme.operational?.family;
  const key=family==='configured'?`configured:${theme.id}`:family;
  need(typeof key==='string'&&key,'THEME_STORED_FAMILY_REQUIRED');
  const cacheKey=kind+':'+key;
  if(!cache.has(cacheKey)){
   cache.set(cacheKey,Promise.resolve().then(async()=>{
    if(kind==='provisional'){
     need(typeof provisionalCalculator==='function',
      'THEME_STORED_PROVISIONAL_PUBLIC_BASE_REQUIRED');
     // Share the already verified group calculation. No second R47 replay.
     const confirmedResult=await groupResult(theme,'confirmed');
     return provisionalCalculator({dataRoot,theme,group:key,now,confirmedResult});
    }
    const calculator=calculators[family];
    need(typeof calculator==='function','THEME_STORED_CALCULATOR_MISSING');
    return calculator({dataRoot,id:theme.id,now});
   }));
  }
  return cache.get(cacheKey);
 };
 const stage=async({theme,kind,stage,completed})=>{
  const batch=await groupResult(theme,kind);
  need(/^[a-f0-9]{64}$/.test(batch?.artifactSha256??'')&&
   Array.isArray(batch.rows),'THEME_STORED_ARTIFACT_UNVERIFIED');
  const row=batch.rows.find(r=>r.label===theme.label);
  need(row&&row.methodologyVersion===theme.methodologyVersion&&
   JSON.stringify(row.etfs)===JSON.stringify(theme.etfs)&&
   /^\d{4}-\d{2}-\d{2}$/.test(row.observationDate??'')&&
   validScore(row.score)&&
   (kind==='confirmed'?Array.isArray(row.history)&&row.history.length===252&&
    row.history.at(-1)?.date===row.observationDate&&
    row.history.at(-1)?.score===row.score:
    Array.isArray(row.points)&&row.points.length>0&&
    row.points.at(-1)?.date===row.observationDate&&
    row.points.at(-1)?.score===row.score&&
    /^\d{4}-\d{2}-\d{2}$/.test(row.confirmedObservationDate??'')&&
    row.confirmedObservationDate<row.observationDate),
   'THEME_STORED_PROJECTION_MISMATCH');
  return {status:'VERIFIED',artifactSha256:batch.artifactSha256,
   ...(kind==='provisional'?{
    historicalReaderContract:batch.historicalReaderContract,
    currentVisibility:batch.currentVisibility}:{}),
   methodologyVersion:theme.methodologyVersion,
   definitionSha256:identity(theme),
   calculationSha256:completed.calculate?.artifactSha256,
   observationDate:row.observationDate,sourceVersion:row.sourceVersion,
   stage,existingOwner:true,publicationAuthorized:false};
 };
 return {source:stage,calculate:stage,validate:stage};
}
