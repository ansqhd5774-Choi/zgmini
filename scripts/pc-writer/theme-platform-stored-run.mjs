// One shared, stored-only private entrypoint. It is not wired to the existing
// scheduler until exact-source PC installation and shadow verification.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {listRegistered} from './theme-config-registry.mjs';
import {identity} from './theme-platform.mjs';
import {createThemeCheckpointStore} from './theme-platform-store.mjs';
import {buildOperationalRegistry,runOperationalPrivateBatch} from './theme-platform-operational.mjs';
import {createStoredOperationalAdapters} from './theme-platform-stored-adapters.mjs';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const need=(condition,code)=>{if(!condition)throw Object.assign(new Error(code),{code});};
const repo=fileURLToPath(new URL('../../',import.meta.url));

export function storedInputFingerprint({dataRoot,registrations=[]}={}){
 const root=fs.realpathSync(dataRoot);
 const manifests=[
  'themes/legacy-nine-r23/raw-manifest.json',
  'themes/legacy-nine-r35-delta/raw-manifest.json',
  'themes/data-center-power/raw-manifest.json',
  'themes/space-satellite/raw-manifest.json',
  ...registrations.map(r=>`themes/${r.internalId}/raw-manifest.json`),
 ];
 const inputs=manifests.map(relative=>{
  const file=path.resolve(root,relative);
  need(file.startsWith(root+path.sep),'THEME_INPUT_PATH_ESCAPE');
  if(!fs.existsSync(file))return {relative,status:'MISSING'};
  need(fs.lstatSync(file).isFile()&&!fs.lstatSync(file).isSymbolicLink()&&
   fs.realpathSync(file)===file,'THEME_INPUT_MANIFEST_REDIRECT');
  return {relative,sha256:sha(fs.readFileSync(file))};
 });
 const approvals=['config/theme-nine-r20-approved-candidates.json',
  'config/theme-nine-r26-official-aum-evidence.json',
  'config/theme-nine-r32-dated-aum-approval.json',
  'scripts/pc-writer/theme-space-satellite-r26-approved-roster.json',
  'scripts/pc-writer/theme-space-satellite-r23-dated-aum-evidence.json'];
 const source=approvals.map(relative=>({relative,sha256:sha(fs.readFileSync(path.join(repo,relative)))}));
 return identity({inputs,source,registrations:registrations.map(r=>({id:r.definition.id,sha256:r.sha256}))});
}

// Recheck old checkpoint proofs against the immutable stored artifacts before
// allowing the shared engine to skip completed stages. Input manifest identity
// alone is insufficient if an artifact is removed or replaced between runs.
export function replayCheckedStore({store,adapters,registry}){
 const themes=new Map(registry.themes.map(theme=>[theme.id,theme]));
 return {save:(...args)=>store.save(...args),load:async key=>{
  const saved=await store.load(key);
  for(const [task,record] of Object.entries(saved?.tasks??{})){
   const index=task.lastIndexOf(':');
   const id=task.slice(0,index),kind=task.slice(index+1);
   const theme=themes.get(id);
   need(theme&&['confirmed','provisional'].includes(kind),
    'THEME_STORED_CHECKPOINT_UNKNOWN_TASK');
   const completed=record.completed??{};
   for(const stage of ['source','calculate','validate']){
    const prior=completed[stage];
    if(!prior)continue;
    let replay;
    try{replay=await adapters.validate({theme,kind,stage,completed});}
    catch(error){throw Object.assign(new Error('THEME_STORED_CHECKPOINT_PROOF_STALE'),
      {code:'THEME_STORED_CHECKPOINT_PROOF_STALE',cause:error});}
    need(replay.status==='VERIFIED'&&
     replay.artifactSha256===prior.artifactSha256&&
     replay.methodologyVersion===prior.methodologyVersion&&
     replay.definitionSha256===prior.definitionSha256&&
     replay.observationDate===prior.observationDate&&
     replay.sourceVersion===prior.sourceVersion,
     'THEME_STORED_CHECKPOINT_PROOF_STALE');
   }
  }
  return saved;
 }};
}

export async function runStoredOperationalPrivate({dataRoot,
 maxStages=Infinity,after=null,now=new Date(),adapters=null,store=null}={}){
 need(typeof dataRoot==='string'&&dataRoot,'THEME_STORED_DATA_ROOT');
 need(now instanceof Date&&!Number.isNaN(now.getTime()),'THEME_STORED_CLOCK');
 const registrations=listRegistered(dataRoot);
 const fingerprint=storedInputFingerprint({dataRoot,registrations});
 const actualAdapters=adapters??createStoredOperationalAdapters({dataRoot,now});
 const actualStore=store??createThemeCheckpointStore({dataRoot});
 const guardedStore=adapters===null?replayCheckedStore({store:actualStore,
  adapters:actualAdapters,registry:buildOperationalRegistry({registrations})}):actualStore;
 const output=await runOperationalPrivateBatch({registrations,
  adapters:actualAdapters,store:guardedStore,
  // The R47 input window changes at the NY 19:00 ET cutoff, so the observed
  // UTC hour is part of checkpoint identity even when raw manifests do not move.
  runKey:'stored-input:'+fingerprint+':observed-utc-hour:'+now.toISOString().slice(0,13),
  maxStages,after});
 return {...output,inputFingerprint:fingerprint,
  // Default adapters consume saved inputs; the checkpoint itself is written.
  sourceMode:adapters===null?'EXISTING_LOCAL_SAVED_ONLY':'CUSTOM_ADAPTER_UNVERIFIED',
  publicConnection:'NOT_ACTIVATED',schedulerWrites:0};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  need(process.argv.length===3&&process.argv[2]==='--private','THEME_STORED_USAGE');
  const result=await runStoredOperationalPrivate({
   dataRoot:process.env.ZGMINI_DATA_ROOT??'E:/ZGmini/data'});
  console.log(JSON.stringify(result));
  if(result.status!=='COMPLETE')process.exitCode=2;
 }catch(error){
  console.error(JSON.stringify({status:'BLOCKED',reason:error.code??'THEME_STORED_RUNTIME_ERROR',
   providerCalls:0,d1Writes:0,schedulerWrites:0}));process.exitCode=2;
 }
}
