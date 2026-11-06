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
import {createStoredOperationalAdapters,createVerifiedStoredProvisionalCalculator}
 from './theme-platform-stored-adapters.mjs';
import {createNineR54D1Query} from './theme-nine-r54-d1-client.mjs';
import {biotechCloudflareTokenR7} from './theme-biotech-auth-r7.mjs';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const need=(condition,code)=>{if(!condition)throw Object.assign(new Error(code),{code});};
const repo=fileURLToPath(new URL('../../',import.meta.url));
const READ="SELECT body,stored_at FROM public_feed_snapshots_v1 WHERE kind='output' AND feed_key=? AND snapshot_key='current'";
const EXISTING_KEYS=new Set([
 'theme-data-center-power-r1','theme-data-center-power-provisional-r1',
 'theme-space-satellite-r2','theme-space-satellite-provisional-r1']);

// A single explicit shadow inspection is allowed to read existing PC data but
// must not create an E: checkpoint. Resume evidence for production batches
// remains the existing durable checkpoint store; this is strictly ephemeral.
export function createTransientThemeCheckpointStore(){
 const snapshots=new Map();
 return {persistence:'TRANSIENT_MEMORY_ONLY',
  load:async key=>structuredClone(snapshots.get(key)??null),
  save:async(key,state,expectedRevision)=>{
   need(/^[a-f0-9]{64}$/.test(key)&&state?.fingerprint===key&&
    state.revision===expectedRevision+1,'THEME_TRANSIENT_CHECKPOINT_IDENTITY');
   need((snapshots.get(key)?.revision??0)===expectedRevision,
    'THEME_TRANSIENT_CHECKPOINT_CAS_CONFLICT');
   snapshots.set(key,structuredClone(state));
  }};
}

export async function readStoredPublicR32Base({fetchImpl=fetch,now=Date.now()}={}){
 need(Number.isSafeInteger(now)&&now>0,'THEME_STORED_PUBLIC_CLOCK');
 // Existing public Reader is the source for modelRevision/R88 projection;
 // never manufacture those fields from a raw D1 R37 record.
 const response=await fetchImpl('https://zgmini.kr/api/theme-fear-greed?ten_r88='+now,{
  headers:{'cache-control':'no-cache'},redirect:'error',
  signal:AbortSignal.timeout(20000)});
 need(response?.ok,'THEME_STORED_PUBLIC_API_UNAVAILABLE');
 const body=await response.json();
 need(body?.status==='READY'&&typeof body.modelRevision==='string'&&
  typeof body.r32ProvisionalReaderVersion==='string',
  'THEME_STORED_PUBLIC_API_SHAPE_INVALID');
 return body;
}

export function createStoredD1FeedReader({dataRoot,query=null}={}){
 need(typeof dataRoot==='string'&&dataRoot,'THEME_STORED_DATA_ROOT');
 // Defer credential/config resolution until an optional family actually
 // requests one of its existing keys. A missing D1 token must not prevent
 // local R37/other confirmed replay from starting.
 let approvedQuery=query;
 return async key=>{
  need(EXISTING_KEYS.has(key),'THEME_STORED_D1_FEED_NOT_APPROVED');
  approvedQuery??=createNineR54D1Query({dataRoot,tokenFn:options=>
   biotechCloudflareTokenR7({...options,allowProcessRefresh:false})});
  need(typeof approvedQuery==='function','THEME_STORED_PUBLIC_QUERY_REQUIRED');
  const result=await approvedQuery(READ,[key],{write:false});
  need(Array.isArray(result?.results)&&result.results.length<=1,
   'THEME_STORED_D1_READ_RESPONSE_INVALID');
  const row=result.results[0];
  if(!row)return null;
  need(typeof row.body==='string'&&Number.isSafeInteger(Number(row.stored_at))&&
   Number(row.stored_at)>0,'THEME_STORED_D1_RECORD_INVALID');
  let body;
  try{body=JSON.parse(row.body);}catch{need(false,'THEME_STORED_D1_RECORD_JSON_INVALID');}
  need(body&&typeof body==='object'&&!Array.isArray(body),
   'THEME_STORED_D1_RECORD_BODY_INVALID');
  return {body,storedAt:Number(row.stored_at)};
 };
}

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
 maxStages=Infinity,after=null,now=new Date(),adapters=null,store=null,
 readFeed=null,readPublicBase=null,decoder=null}={}){
 need(typeof dataRoot==='string'&&dataRoot,'THEME_STORED_DATA_ROOT');
 need(now instanceof Date&&!Number.isNaN(now.getTime()),'THEME_STORED_CLOCK');
 const registrations=listRegistered(dataRoot);
 const fingerprint=storedInputFingerprint({dataRoot,registrations});
 let d1Reads=0,publicApiReads=0;
 const measuredRead=readFeed===null?null:async key=>{d1Reads++;return readFeed(key);};
 const measuredPublic=readPublicBase===null?null:async()=>{
  publicApiReads++;return readPublicBase();};
 const provisionalCalculator=measuredRead===null?null:
  createVerifiedStoredProvisionalCalculator({readFeed:measuredRead,
   readPublicBase:measuredPublic,now,decoder});
 const actualAdapters=adapters??createStoredOperationalAdapters({dataRoot,now,
  provisionalCalculator});
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
  sourceMode:adapters!==null?'CUSTOM_ADAPTER_UNVERIFIED':
   readFeed===null?'EXISTING_LOCAL_SAVED_ONLY':'SAVED_PLUS_PUBLIC_API_AND_D1_READS',
  providerCalls:adapters===null?0:'CUSTOM_ADAPTER_UNVERIFIED',d1Writes:0,
  checkpointPersistence:store===null?'DURABLE_PC_REVISION_HISTORY':
   store.persistence??'INJECTED_STORE_UNSPECIFIED',
  publicConnection:'NOT_ACTIVATED',d1Reads,publicApiReads,schedulerWrites:0};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  need(process.argv.length===3&&
   ['--private','--private-public-readback'].includes(process.argv[2]),
   'THEME_STORED_USAGE');
  const dataRoot=process.env.ZGMINI_DATA_ROOT??'E:/ZGmini/data';
  const readFeed=process.argv[2]==='--private-public-readback'?
   createStoredD1FeedReader({dataRoot}):null;
  const readPublicBase=readFeed===null?null:()=>readStoredPublicR32Base();
  const result=await runStoredOperationalPrivate({
   dataRoot,readFeed,readPublicBase});
  console.log(JSON.stringify(result));
  if(result.status!=='COMPLETE')process.exitCode=2;
 }catch(error){
  console.error(JSON.stringify({status:'BLOCKED',reason:error.code??'THEME_STORED_RUNTIME_ERROR',
   providerCalls:0,d1Writes:0,schedulerWrites:0}));process.exitCode=2;
 }
}
