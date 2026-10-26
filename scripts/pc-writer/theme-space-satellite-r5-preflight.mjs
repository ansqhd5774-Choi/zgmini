// Space/Satellite R5 PC preflight. Read-only to original prices, tasks and D1.
// Uses the same immutable SHA-backed PC staging convention as the existing themes.
// Source staging creates a NEW isolated release; never edits an active source tree.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath, pathToFileURL} from 'node:url';

export const SOURCE_SHA='d82329419a95eb0b77a638c475c7365b3627c2a7';
const REPO='ansqhd5774-Choi/zgmini';
const SOURCES=Object.freeze({
 'theme-optional-collect.mjs':'ada1180a78c853f3f6b925fdcc586212b933e53a38b342568a1e42b8896a9e14',
 'theme-optional-score-r188.mjs':'36d45cd82af507f5b75a5a96413c626b50c830ca2aa1291bbb64f113cd0e3366',
 'theme-optional-adaptive-r2.mjs':'f794f5a2005ab8da34fbd12b1e16e0519445cfadca034e29d9cb8d0dfffc3cd3',
 'theme-optional-pair-weight-r3.mjs':'bcaa39ef0351c5f65acaba2560c1234b215c43e223003742e919a9b01a0904d6',
 'theme-space-satellite-adaptive-r2.mjs':'edbfd40cb4a70995d78f5ad16d70d2de14cf532ee118450eabc89b4b07850dae',
});
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const need=(ok,code)=>{if(!ok)throw Object.assign(new Error(code),{code});};
const sourceDir=(projectsRoot)=>path.join(fs.realpathSync(projectsRoot),
 'zgmini-theme-optional','releases',SOURCE_SHA);
const sourceFile=(home,filename)=>path.join(home,'scripts','pc-writer',filename);

function verifyExisting(home){
 const f=path.join(home,'source-manifest.json');
 need(fs.existsSync(f),'SPACE_R5_EXISTING_RELEASE_WITHOUT_MANIFEST');
 const manifest=JSON.parse(fs.readFileSync(f,'utf8'));
 need(manifest.sourceSha===SOURCE_SHA&&manifest.version===1&&
  Array.isArray(manifest.files)&&manifest.files.length===Object.keys(SOURCES).length,
  'SPACE_R5_EXISTING_RELEASE_IDENTITY');
 for(const [filename,expected] of Object.entries(SOURCES)){
  const full=sourceFile(home,filename);
  need(fs.existsSync(full)&&sha(fs.readFileSync(full))===expected,
   'SPACE_R5_STAGED_SOURCE_HASH_MISMATCH');
  need(manifest.files.some(item=>item.path===`scripts/pc-writer/${filename}`&&
   item.sha256===expected),'SPACE_R5_MANIFEST_HASH_MISMATCH');
 }
}

export async function stageSpaceSource({projectsRoot,fetchImpl=fetch}={}){
 need(typeof projectsRoot==='string'&&fs.existsSync(projectsRoot),
  'SPACE_R5_PROJECTS_ROOT_MISSING');
 const home=sourceDir(projectsRoot);
 if(fs.existsSync(home)){
  verifyExisting(home);
  return {sourceSha:SOURCE_SHA,releaseDir:home,mode:'EXISTING_IMMUTABLE_SOURCE_VERIFIED'};
 }
 // All source bytes are fetched and independently SHA-256 verified before any staging write.
 const assets=[];
 for(const [filename,expected] of Object.entries(SOURCES)){
  const url=`https://raw.githubusercontent.com/${REPO}/${SOURCE_SHA}/scripts/pc-writer/${filename}`;
  const response=await fetchImpl(url,{headers:{'User-Agent':'ZGMINI-space-r5-preflight'},
   signal:AbortSignal.timeout(30000)});
  need(response.ok,`SPACE_R5_SOURCE_HTTP_${response.status}`);
  const bytes=Buffer.from(await response.arrayBuffer());
  need(bytes.length>0&&bytes.length<1_000_000,'SPACE_R5_SOURCE_SIZE_INVALID');
  need(sha(bytes)===expected,'SPACE_R5_DOWNLOADED_SOURCE_HASH_MISMATCH');
  assets.push({filename,bytes,sha256:expected});
 }
 const parent=path.dirname(home);
 fs.mkdirSync(parent,{recursive:true});
 const temporary=path.join(parent,`.incomplete-space-r5-${SOURCE_SHA}-${process.pid}`);
 need(!fs.existsSync(temporary),'SPACE_R5_PREVIOUS_STAGING_REQUIRES_REVIEW');
 fs.mkdirSync(temporary);
 for(const asset of assets){
  const full=sourceFile(temporary,asset.filename);
  fs.mkdirSync(path.dirname(full),{recursive:true});
  fs.writeFileSync(full,asset.bytes,{flag:'wx'});
  need(sha(fs.readFileSync(full))===asset.sha256,'SPACE_R5_STAGE_READBACK_HASH');
 }
 const manifest={version:1,purpose:'SPACE_SATELLITE_PRIVATE_PREFLIGHT',
  sourceRepository:REPO,sourceSha:SOURCE_SHA,stagedAt:new Date().toISOString(),
  files:assets.map(({filename,sha256})=>({path:`scripts/pc-writer/${filename}`,sha256}))};
 fs.writeFileSync(path.join(temporary,'source-manifest.json'),JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
 fs.renameSync(temporary,home);
 verifyExisting(home);
 return {sourceSha:SOURCE_SHA,releaseDir:home,mode:'STAGED_NEW_IMMUTABLE_SOURCE'};
}

function inspectCheckpoints(home){
 const dir=path.join(home,'state');
 if(!fs.existsSync(dir))return [];
 const names=fs.readdirSync(dir).filter(name=>/^collection-[a-f0-9]{16}\.json$/.test(name));
 need(names.length<=100,'SPACE_R5_UNBOUNDED_CHECKPOINTS_REVIEW_REQUIRED');
 return names.map(name=>{
  const file=path.join(dir,name);
  need(fs.statSync(file).size<=1_000_000,'SPACE_R5_CHECKPOINT_OVERSIZE');
  const state=JSON.parse(fs.readFileSync(file,'utf8'));
  need(state.version===1&&state.themeId==='space-satellite'&&
   state.symbols&&typeof state.symbols==='object','SPACE_R5_CHECKPOINT_IDENTITY');
  const symbols=Object.fromEntries(Object.entries(state.symbols).map(([symbol,s])=>
   [symbol,{complete:s?.complete===true,pages:s?.pages??null}]));
  return {file:name,start:state.start,end:state.end,
   requiresFailureReview:Boolean(state.failedAt),symbols};
 });
}

export async function inspectSpacePc({dataRoot,releaseDir}={}){
 need(typeof dataRoot==='string'&&fs.existsSync(dataRoot),'SPACE_R5_DATA_ROOT_MISSING');
 need(typeof releaseDir==='string'&&fs.existsSync(releaseDir),
  'SPACE_R5_RELEASE_MISSING');
 verifyExisting(releaseDir);
 const home=path.join(dataRoot,'themes','space-satellite');
 const manifest=path.join(home,'raw-manifest.json');
 const checkpoints=inspectCheckpoints(home);
 if(!fs.existsSync(manifest))return {dataStatus:'RAW_MANIFEST_NOT_FOUND',
  checkpointCount:checkpoints.length,checkpoints,providerCalls:0,
  d1Writes:0,publicWrites:0,schedulerWrites:0,
  next:'REVIEW_EXISTING_STATE_BEFORE_EXPLICIT_BOUNDED_COLLECTION'};
 const {auditSpaceSatelliteAdaptive}=await import(pathToFileURL(sourceFile(releaseDir,
  'theme-space-satellite-adaptive-r2.mjs')).href);
 const report=auditSpaceSatelliteAdaptive({dataRoot});
 return {dataStatus:report.status,coverage:report.coverage,
  ignoredExistingRawEntries:report.ignoredExistingRawEntries,
  candidates:report.candidates.map(c=>({etfs:c.etfs,commonSessions:c.commonSessions,
   scoredSessions:c.scoredSessions,missingSessions:c.missingSessions,
   lastValidObservation:c.observationDate,latestScore:c.score,
   eligibleRoute:c.eligibility?.route,isCurrentWithinLocalData:c.isCurrent})),
  checkpointCount:checkpoints.length,checkpoints,
  sourceVersion:report.sourceVersion,providerCalls:0,d1Writes:0,
  publicWrites:0,schedulerWrites:0,
  next:'REVIEW_CHECKPOINT_AND_PRICE_COVERAGE_BEFORE_COLLECTION_OR_PUBLICATION'};
}

export async function preflightSpacePc({projectsRoot='E:/ZGmini/projects',
 dataRoot='E:/ZGmini/data',fetchImpl=fetch}={}){
 need(fs.existsSync(projectsRoot),'SPACE_R5_PROJECTS_ROOT_MISSING');
 need(fs.existsSync(dataRoot),'SPACE_R5_DATA_ROOT_MISSING');
 const release=await stageSpaceSource({projectsRoot,fetchImpl});
 return {report:'SPACE_SATELLITE_R5_PRIVATE_PC_PREFLIGHT',
  sourceSha:release.sourceSha,releaseDir:release.releaseDir,
  stageMode:release.mode,...await inspectSpacePc({dataRoot,releaseDir:release.releaseDir})};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.platform!=='win32'){
  console.error('RESULT=BLOCKED_WINDOWS_PC_ONLY');process.exitCode=2;
 }else if(process.argv.length!==3||process.argv[2]!=='--preflight'){
  console.error('RESULT=BLOCKED_USE_EXPLICIT_PREFLIGHT');process.exitCode=2;
 }else try{
  const result=await preflightSpacePc();
  console.log(JSON.stringify(result,null,2));
  console.log('RESULT=PRIVATE_PC_PREFLIGHT_ONLY_NO_PROVIDER_NO_D1_NO_TASK');
 }catch(error){
  console.error('RESULT=BLOCKED_'+String(error.code??error.message??'UNKNOWN')
   .replace(/[^A-Za-z0-9_]/g,'_').slice(0,90));process.exitCode=1;
 }
}
