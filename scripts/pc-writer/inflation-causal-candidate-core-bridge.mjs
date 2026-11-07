// Independent research-only activation for original inflation candidates.
// Intended only under the existing Core local-cycle lock, never as a new Task.
// Disabled by default; the established 19 inputs/score/publication are untouched.
import fs from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {INFLATION_CANDIDATE_GROUPS,runInflationCandidateOnce} from './inflation-causal-candidate-once.mjs';

export const CANDIDATE_CORE_SCHEMA='ZGMINI_INFLATION_CANDIDATE_CORE_R1';
export const CANDIDATE_CORE_CHECKPOINT='inflation-causal-candidates-r1/core-attempts-r1.json';
const GROUPS=['cpi','ppi','fed','census','treasury','eia'];
const CALENDAR_MATCH=Object.freeze({
 cpi:e=>e.source==='bls'&&e.id==='cpi',
 ppi:e=>e.source==='bls'&&e.id==='ppi',
 fed:e=>e.source==='fed'&&e.id==='industrial-production',
 census:e=>e.source==='census'&&
  /^census-full-report-manufacturers-shipments-inventories-and-orders(?:-|$)/.test(e.id??'')&&
  /^Full Report\s*[-–—]\s*Manufacturers['’] Shipments, Inventories,? and Orders(?:\s*·.*)?$/i.test(e.title??''),
});
const SNAPSHOT=Object.freeze({
 cpi:'bls-cpi-ppi3.json',ppi:'bls-cpi-ppi3.json',fed:'fed-g17-manufacturing-ip.json',
 census:'census-m3-manufacturing-inventories.json',treasury:'treasury-mts-customs-duties.json',
 eia:'eia-us-regular-gasoline-weekly.json',
});
const SERIES=Object.freeze({cpi:['CUSR0000SEHA','CUSR0000SEHC01'],ppi:['WPSFD4']});
const fail=code=>Object.assign(new Error(code),{code});
const isDate=value=>typeof value==='string'&&/^20\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(value)&&
 Number.isFinite(Date.parse(value+'T00:00:00Z'))&&
 new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
const isIso=value=>typeof value==='string'&&Number.isFinite(Date.parse(value))&&
 new Date(value).toISOString()===value;
const safeError=e=>/^INFL_CANDIDATE_[A-Z0-9_]{1,90}$/.test(e?.code??'')?
 e.code:'INFL_CANDIDATE_CORE_FAILED';
const validKey=(env,group)=>{
 const cred=INFLATION_CANDIDATE_GROUPS[group]?.credential;
 if(!cred)return true;
 const value=cred==='BLS'?(env?.BLS_API_KEY??env?.BLS_REGISTRATION_KEY):
  cred==='CENSUS'?env?.CENSUS_API_KEY:env?.EIA_API_KEY;
 return typeof value==='string'&&value.trim().length>0;
};
const cleanCheckpoint=()=>({schema:CANDIDATE_CORE_SCHEMA,processed:{},attempted:{}});
function validateCheckpoint(doc){
 if(doc?.schema!==CANDIDATE_CORE_SCHEMA||!doc.processed||!doc.attempted||
   Array.isArray(doc.processed)||Array.isArray(doc.attempted)||
   typeof doc.processed!=='object'||typeof doc.attempted!=='object')
  throw fail('INFL_CANDIDATE_CORE_CHECKPOINT_INVALID');
 for(const [key,value] of Object.entries(doc.processed))
  if(!GROUPS.includes(key)||typeof value?.eventKey!=='string'||value.eventKey.length>240||
    !isDate(value.observationDate))throw fail('INFL_CANDIDATE_CORE_CHECKPOINT_INVALID');
 for(const [key,value] of Object.entries(doc.attempted))
  if(!GROUPS.includes(key)||typeof value?.eventKey!=='string'||value.eventKey.length>240||
    !isIso(value.at))throw fail('INFL_CANDIDATE_CORE_CHECKPOINT_INVALID');
 return doc;
}

// Official release dates are date-only; avoid pre-release calls during the US day.
function matchingEvent(group,events,sources,now){
 const predicate=CALENDAR_MATCH[group];if(!predicate)return null;
 const today=now.toISOString().slice(0,10),hour=now.getUTCHours();
 if(!Array.isArray(events)||events.length>1500)return null;
 const found=events.filter(e=>predicate(e)&&isDate(e.date)&&
  (e.date<today||(e.date===today&&hour>=22))&&
  typeof e.id==='string'&&e.id.length<=160&&
  typeof e.sourceUrl==='string'&&e.sourceUrl.startsWith('https://')&&
  sources?.[e.source]?.status==='READY'&&
  isIso(sources[e.source].checkedAt)&&Date.parse(sources[e.source].checkedAt)<=now.getTime());
 return found.sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id)).at(-1)??null;
}

export function planInflationCandidateCoreDue({approved=false,bootstrapApproved=false,
 events=[],sources={},checkpoint=cleanCheckpoint(),providerEnv={},now=new Date()}={}){
 if(!approved)return {status:'DISABLED',due:[],skipped:[...GROUPS]};
 const moment=now instanceof Date?now:new Date(now);
 if(!Number.isFinite(moment.getTime()))throw fail('INFL_CANDIDATE_CORE_NOW_INVALID');
 validateCheckpoint(checkpoint);
 const due=[],skipped=[];
 for(const group of GROUPS){
  // Treasury CUSIP is an auction calendar, and EIA WPSR is not retail gasoline.
  // Both may make one explicitly approved bootstrap request, never recurring
  // from the unrelated existing release-calendar events.
  const initial=['treasury','eia'].includes(group);
  const event=initial?(bootstrapApproved?{eventKey:`bootstrap:${group}`}:null):
    matchingEvent(group,events,sources,moment);
  const eventKey=event&&(initial?event.eventKey:`release:${event.source}:${event.id}:${event.date}`);
  const attempt=checkpoint.attempted[group];
  const recently=attempt?.eventKey===eventKey&&isIso(attempt.at)&&
    moment.getTime()>=Date.parse(attempt.at)&&moment.getTime()-Date.parse(attempt.at)<86_400_000;
  if(!eventKey||checkpoint.processed[group]?.eventKey===eventKey||recently||
     !validKey(providerEnv,group)){skipped.push(group);continue;}
  due.push({group,eventKey,releaseDate:initial?null:event.date});
 }
 return {status:due.length?'DUE':'NO_VERIFIED_RELEASE_DUE',due,skipped};
}

function checkpointLocation(base){
 if(typeof base!=='string'||!path.isAbsolute(base)||
   path.basename(path.resolve(base)).toLowerCase()!=='pc-writer')
  throw fail('INFL_CANDIDATE_CORE_HOME_DENIED');
 let canonical;try{canonical=fs.realpathSync.native(base);}catch{
  throw fail('INFL_CANDIDATE_CORE_HOME_DENIED');
 }
 if(!fs.statSync(canonical).isDirectory())throw fail('INFL_CANDIDATE_CORE_HOME_DENIED');
 if(process.platform==='win32'){
  let approved;try{approved=fs.realpathSync.native(String.raw`E:\ZGmini\data\pc-writer`);}catch{
   throw fail('INFL_CANDIDATE_CORE_HOME_DENIED');
  }
  const norm=x=>path.win32.normalize(x.replace(/^\\\\\?\\/,'')).toLowerCase();
  if(norm(canonical)!==norm(approved))throw fail('INFL_CANDIDATE_CORE_HOME_DENIED');
 }
 const dir=path.join(base,'inflation-causal-candidates-r1');
 if(!fs.existsSync(dir))fs.mkdirSync(dir);
 const stat=fs.lstatSync(dir);
 if(!stat.isDirectory()||stat.isSymbolicLink())
  throw fail('INFL_CANDIDATE_CORE_CHECKPOINT_DIR_DENIED');
 return path.join(dir,'core-attempts-r1.json');
}
function loadCheckpoint(file){
 if(!fs.existsSync(file))return cleanCheckpoint();
 const stat=fs.lstatSync(file);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.size<1||stat.size>32768)
  throw fail('INFL_CANDIDATE_CORE_CHECKPOINT_INVALID');
 let value;try{value=JSON.parse(fs.readFileSync(file,'utf8'));}catch{
  throw fail('INFL_CANDIDATE_CORE_CHECKPOINT_INVALID');
 }
 return validateCheckpoint(value);
}
function saveCheckpoint(file,value){
 validateCheckpoint(value);
 const bytes=JSON.stringify(value),temp=`${file}.next-${randomUUID()}`;
 fs.writeFileSync(temp,bytes,{flag:'wx'});
 try{fs.renameSync(temp,file);}catch{
  try{fs.unlinkSync(temp);}catch{}
  throw fail('INFL_CANDIDATE_CORE_CHECKPOINT_SAVE_FAILED');
 }
 if(JSON.stringify(loadCheckpoint(file))!==bytes)
  throw fail('INFL_CANDIDATE_CORE_CHECKPOINT_READBACK_FAILED');
}
function savedLatest(base,group){
 try{
  const file=path.join(base,'inflation-causal-candidates-r1',SNAPSHOT[group]);
  const stat=fs.lstatSync(file);
  if(!stat.isFile()||stat.isSymbolicLink()||stat.size<1||stat.size>24_000_000)
   return null;
  const doc=JSON.parse(fs.readFileSync(file,'utf8'));
  const rows=SERIES[group]?
   SERIES[group].map(id=>doc?.series?.[id]?.at(-1)?.date):
   [doc?.observations?.at(-1)?.date];
  if(!rows.length||rows.some(v=>!isDate(v)))return null;
  return rows.sort()[0]; // CPI group is ready only when both series exist.
 }catch{return null;}
}

const factoryCollectors=async()=>{
 const [bls,treasury,census,fed,eia]=await Promise.all([
  import('./inflation-causal-candidate-bls3.mjs'),
  import('./inflation-causal-candidate-treasury.mjs'),
  import('./inflation-causal-candidate-census-m3.mjs'),
  import('./inflation-causal-candidate-fed-g17.mjs'),
  import('./inflation-causal-candidate-eia-gasoline.mjs')]);
 return {cpi:bls.collectInflationCandidateBls,ppi:bls.collectInflationCandidateBls,
  treasury:treasury.collectTreasuryCustoms,census:census.collectCensusM3Inventories,
  fed:fed.collectFedG17Manufacturing,eia:eia.collectEiaRegularWeekly};
};

export async function collectInflationCandidatesIfDue({base,approved=false,
 bootstrapApproved=false,officialEvents=[],officialSources={},providerEnv={},
 now=new Date(),quotaFetch,collectors,checkpointIO,latestIO}={}){
 if(!approved)return {status:'DISABLED',providerRequests:0,due:[],completed:[],failed:[]};
 const moment=now instanceof Date?now:new Date(now);
 if(!Number.isFinite(moment.getTime()))throw fail('INFL_CANDIDATE_CORE_NOW_INVALID');
 const file=checkpointIO?.file??checkpointLocation(base);
 const checkpoint=checkpointIO?.load?checkpointIO.load():loadCheckpoint(file);
 const plan=planInflationCandidateCoreDue({approved:true,bootstrapApproved,
  events:officialEvents,sources:officialSources,checkpoint,providerEnv,now:moment});
 if(!plan.due.length)return {...plan,providerRequests:0,completed:[],failed:[]};
 if(typeof quotaFetch!=='function')throw fail('INFL_CANDIDATE_CORE_QUOTA_REQUIRED');
 const save=checkpointIO?.save??(doc=>saveCheckpoint(file,doc));
 const latest=latestIO??(group=>savedLatest(base,group));
 const admitted=[],before={},failed=[];
 for(const entry of plan.due){
  before[entry.group]=latest(entry.group);
  const previous=checkpoint.attempted[entry.group];
  checkpoint.attempted[entry.group]={eventKey:entry.eventKey,at:moment.toISOString()};
  try{save(checkpoint);admitted.push(entry);}
  catch{failed.push({group:entry.group,code:'INFL_CANDIDATE_CORE_ATTEMPT_SAVE_FAILED'});
   if(previous)checkpoint.attempted[entry.group]=previous;
   else delete checkpoint.attempted[entry.group];}
 }
 if(!admitted.length)return {status:'PARTIAL_PREVIOUS_INPUTS_PRESERVED',
  providerRequests:0,completed:[],failed};
 const underlying=collectors??await factoryCollectors();
 const wrapped=Object.fromEntries(admitted.map(entry=>[
  entry.group,async args=>underlying[entry.group](args)]));
 const report=await runInflationCandidateOnce({approved:true,base,groups:admitted.map(x=>x.group),
  providerEnv,quotaFetch,collectors:wrapped,now:moment});
 const completed=[];
 for(const entry of report.completed){
  const event=admitted.find(x=>x.group===entry.group);
  const after=latest(entry.group),previous=before[entry.group];
  const advanced=after&&(!previous||after>previous);
  // Completed collection is not necessarily a new published observation.
  // Only after a saved, read-back observation advances is release processed.
  if(advanced&&entry.status==='SAVED_READBACK'){
   checkpoint.processed[entry.group]={eventKey:event.eventKey,observationDate:after};
   try{save(checkpoint);completed.push({group:entry.group,status:'OBSERVATION_ADVANCED',latest:after});}
   catch{failed.push({group:entry.group,code:'INFL_CANDIDATE_CORE_PROCESSED_SAVE_FAILED'});}
  }else completed.push({group:entry.group,status:'AWAITING_NEW_OBSERVATION',latest:after});
 }
 failed.push(...report.failed);
 return {status:failed.length?'PARTIAL_PREVIOUS_INPUTS_PRESERVED':
  report.skipped.length?'PARTIAL_CREDENTIALS_UNAVAILABLE':
  completed.some(x=>x.status==='OBSERVATION_ADVANCED')?'COMPLETE':'UNCHANGED_WAITING_NEW_OBSERVATION',
  providerRequests:report.providerRequests,completed,failed,skipped:report.skipped,
  due:admitted.map(x=>x.group)};
}

// This adapter must be called inside Core's pre-publication lock if installed.
export async function runInflationCandidatesFromCore(base,{now=new Date(),
 envLoader,calendarLoader,quotaFactory,collectors,checkpointIO,latestIO}={}){
 let env;
 try{const load=envLoader??(await import('./local-env.mjs')).loadLocalProviders;
  env=load(base);}catch{return {status:'DISABLED_PROVIDERS_UNAVAILABLE',providerRequests:0};}
 if(env?.ZGMINI_INFLATION_CANDIDATE_CORE_APPROVED!=='1')
  return {status:'DISABLED',providerRequests:0};
 let calendar=null;
 try{
  if(calendarLoader)calendar=await calendarLoader(base);
  else{
   const {DatabaseSync}=await import('node:sqlite');
   const file=path.join(base,'storage','core.sqlite'),stat=fs.lstatSync(file);
   if(!stat.isFile()||stat.isSymbolicLink())throw fail('INFL_CANDIDATE_CORE_SQLITE_DENIED');
   const db=new DatabaseSync(file,{readOnly:true});
   try{db.exec('PRAGMA query_only=ON;');
    const row=db.prepare("SELECT body FROM public_feed_snapshots_v1 WHERE kind='output' AND feed_key='release-calendar' AND snapshot_key='current'").get();
    calendar=row?JSON.parse(row.body):null;
   }finally{db.close();}
  }
 }catch{calendar=null;}
 let quota;
 const fetch=async(...args)=>{
  if(!quota){const create=quotaFactory??(await import('./quota-fetch.mjs')).createQuotaFetch;
   quota=create({base,originalFetch:globalThis.fetch,mode:'enforce'});}
  return quota.fetch(...args);
 };
 return collectInflationCandidatesIfDue({base,approved:true,
  bootstrapApproved:env.ZGMINI_INFLATION_CANDIDATE_BOOTSTRAP_APPROVED==='1',
  officialEvents:Array.isArray(calendar?.events)?calendar.events:[],
  officialSources:calendar?.sources??{},providerEnv:env,quotaFetch:fetch,
  collectors,checkpointIO,latestIO,now});
}
