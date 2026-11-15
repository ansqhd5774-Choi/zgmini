// Private registered-theme execution against immutable, already saved inputs.
// No provider GET, D1 client, writer, scheduled task, installation or public API.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {listRegistered} from './theme-config-registry.mjs';
import {identity,runThemeBatch} from './theme-platform.mjs';
import {buildOperationalRegistry,OPERATIONAL_METHODS} from './theme-platform-operational.mjs';
import {createConfiguredStoredPrivateAdapters} from './theme-platform-stored-configured.mjs';

const need=(ok,code)=>{if(!ok)throw Object.assign(new Error(code),{code});};
const hash=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
const clone=x=>structuredClone(x);

// When the caller has not supplied the approved durable checkpoint owner,
// a private read-only invocation never creates an E: checkpoint by accident.
export function createTransientConfiguredCheckpointStore(){
 const records=new Map();
 return {persistence:'TRANSIENT_MEMORY_ONLY',
  load:async key=>clone(records.get(key)??null),
  save:async(key,state,revision)=>{
   need(hash(key)&&state?.fingerprint===key&&state.revision===revision+1,
    'THEME_CONFIGURED_CHECKPOINT_IDENTITY');
   need((records.get(key)?.revision??0)===revision,
    'THEME_CONFIGURED_CHECKPOINT_CAS_CONFLICT');
   records.set(key,clone(state));
  }};
}

function checkedSource(root,relative){
 const canonical=fs.realpathSync(root),file=path.resolve(canonical,relative);
 need(file.startsWith(canonical+path.sep),'THEME_CONFIGURED_INPUT_PATH_ESCAPE');
 if(!fs.existsSync(file))return {path:relative,status:'MISSING'};
 need(fs.lstatSync(file).isFile()&&!fs.lstatSync(file).isSymbolicLink()&&
  fs.realpathSync(file)===file,'THEME_CONFIGURED_INPUT_REDIRECT');
 const bytes=fs.readFileSync(file);
 return {path:relative,sha256:createHash('sha256').update(bytes).digest('hex')};
}

// Never confuse a registration or synthetic score with a verified PC input.
// The fingerprint advances whenever a registered source manifest changes.
export function configuredStoredFingerprint({dataRoot,registrations}={}){
 need(typeof dataRoot==='string'&&fs.existsSync(dataRoot),
  'THEME_CONFIGURED_DATA_ROOT_REQUIRED');
 need(Array.isArray(registrations),'THEME_CONFIGURED_REGISTRATIONS');
 const sources=registrations.map(r=>{
  need(r?.definition?.id&&r.internalId==='registered-'+r.definition.id&&
   hash(r.sha256),'THEME_CONFIGURED_REGISTRATION_IDENTITY');
  return {id:r.definition.id,definitionSha256:r.sha256,
   manifest:checkedSource(dataRoot,'themes/'+r.internalId+'/raw-manifest.json')};
 });
 return identity({version:'CONFIGURED_SAVED_INPUTS_V1',sources});
}

function checkedResume({store,adapters,registry}){
 const expected=new Map(registry.themes.map(t=>[t.id,t]));
 return {persistence:store.persistence??'INJECTED_STORE_UNSPECIFIED',
  save:(...args)=>store.save(...args),
  load:async key=>{
   const prior=await store.load(key);
   for(const [task,checkpoint] of Object.entries(prior?.tasks??{})){
    const colon=task.lastIndexOf(':');
    const id=task.slice(0,colon),kind=task.slice(colon+1);
    const theme=expected.get(id);
    need(theme&&['confirmed','provisional'].includes(kind),
     'THEME_CONFIGURED_CHECKPOINT_UNKNOWN_TASK');
    const completed=checkpoint.completed??{};
    for(const stage of ['source','calculate','validate']){
     const previous=completed[stage];if(!previous)continue;
     let fresh;
     try{fresh=await adapters.validate({theme,kind,stage,completed});}
     catch(error){throw Object.assign(new Error('THEME_CONFIGURED_CHECKPOINT_PROOF_STALE'),
       {code:'THEME_CONFIGURED_CHECKPOINT_PROOF_STALE',cause:error});}
     need(fresh?.status==='VERIFIED'&&
      previous.publicationAuthorized===false&&
      fresh.artifactSha256===previous.artifactSha256&&
      fresh.definitionSha256===previous.definitionSha256&&
      fresh.methodologyVersion===previous.methodologyVersion&&
      fresh.sourceVersion===previous.sourceVersion&&
      fresh.observationDate===previous.observationDate&&
      (kind!=='provisional'||
       fresh.historicalReaderContract===previous.historicalReaderContract&&
       fresh.currentVisibility===previous.currentVisibility),
      'THEME_CONFIGURED_CHECKPOINT_PROOF_STALE');
    }
   }
   return prior;
  }};
}

// Registered themes only. Existing 10 themes remain owned by their separate
// installed R37/DC/Space collectors and publishers; this call cannot skip them
// or mark their operational completion.
export async function runConfiguredStoredPrivateBatch({
 dataRoot,registrations=null,store=null,now=new Date(),
 calculator,provisionalCalculator,decoder=null,maxStages=Infinity,after=null
}={}){
 need(typeof dataRoot==='string'&&fs.existsSync(dataRoot),
  'THEME_CONFIGURED_DATA_ROOT_REQUIRED');
 need(now instanceof Date&&!Number.isNaN(now.getTime()),
  'THEME_CONFIGURED_CLOCK');
 const entries=registrations??listRegistered(dataRoot);
 need(Array.isArray(entries),'THEME_CONFIGURED_REGISTRATION_LIST');
 const registry=buildOperationalRegistry({registrations:entries});
 registry.themes=registry.themes.filter(t=>t.operational.family==='configured');
 const fingerprint=configuredStoredFingerprint({dataRoot,registrations:entries});
 if(!registry.themes.length)return {status:'NO_REGISTERED_THEMES',inputFingerprint:fingerprint,
  confirmed:0,provisional:0,providerCalls:0,d1Reads:0,d1Writes:0,schedulerWrites:0,
  checkpointPersistence:'NONE',publicConnection:'NOT_ACTIVATED'};
 const actualStore=store??createTransientConfiguredCheckpointStore();
 const adapters=createConfiguredStoredPrivateAdapters({dataRoot,now,decoder,
  ...(calculator?{calculator}:{}),
  ...(provisionalCalculator?{provisionalCalculator}:{})});
 const guarded=checkedResume({store:actualStore,adapters,registry});
 const out=await runThemeBatch({registry,adapters,store:guarded,
  runKey:'configured-saved:'+fingerprint,mode:'private',maxStages,after,
  formulas:OPERATIONAL_METHODS});
 // A caller-injected calculator or checkpoint implementation can perform
 // external work; do not falsely report zero I/O for unknown dependencies.
 const injectedCalculator=calculator!==undefined||provisionalCalculator!==undefined;
 const unverified=injectedCalculator?'UNVERIFIED_INJECTED_CALCULATOR':0;
 const storeUnverified=store!==null&&!store.persistence?
  'UNVERIFIED_INJECTED_CHECKPOINT_STORE':0;
 return {...out,inputFingerprint:fingerprint,registeredThemes:registry.themes.length,
  checkpointPersistence:guarded.persistence,
  sourceMode:injectedCalculator?'INJECTED_CALCULATOR_UNVERIFIED':'LOCAL_SAVED_ONLY',
  providerCalls:unverified,d1Reads:unverified,
  d1Writes:unverified||storeUnverified,
  schedulerWrites:unverified,
  publicConnection:'NOT_ACTIVATED'};
}
