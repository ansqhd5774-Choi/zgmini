// Candidate-only inflation research collector bridge for the existing Core lane.
// Activation and provider cadence require a separate, exact operating approval.
// Keep this default-disabled until that approval and the source manifest exist.
import fs from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';

export const INFL19_RECURRING_SCHEMA='ZGMINI_INFL19_RECURRING_R1';
export const INFL19_RECURRING_CHECKPOINT='inflation-causal-r1/recurring-checkpoint-r1.json';

const GROUPS=Object.freeze([
 {key:'bls8',source:'bls',event:'ppi',credential:'BLS',maxRequests:1},
 {key:'electricity',source:'eia_epm',event:'eia-epm',credential:'EIA',maxRequests:2},
 {key:'sce',source:'nyfed',event:'nyfed-sce',credential:null,maxRequests:3},
 {key:'gas',source:null,event:null,credential:'FRED',maxRequests:1},
]);
const ISO_DAY=/^20\d\d-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/;
const validDay=v=>typeof v==='string'&&ISO_DAY.test(v)&&
 Number.isFinite(Date.parse(v))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
const validTimestamp=v=>typeof v==='string'&&Number.isFinite(Date.parse(v))&&
 new Date(v).toISOString()===v;
const err=code=>Object.assign(new Error(code),{code});
const validKey=v=>typeof v==='string'&&v.trim().length>0;

function releaseDate(group,events,today,utcHour){
 if(!Array.isArray(events)||events.length>1000)return null;
 // Official release feeds here provide a calendar date, not a release time.
 // Do not mark that day's release handled during a pre-announcement Core tick.
 // 22:00 UTC is a conservative US-day cutoff; the following UTC days qualify.
 const dates=events.filter(e=>e?.source===group.source&&e?.id===group.event&&
  validDay(e.date)&&(e.date<today||(e.date===today&&utcHour>=22))&&
  typeof e.sourceUrl==='string'&&
  /^https:\/\//.test(e.sourceUrl)).map(e=>e.date).sort();
 return dates.at(-1)??null;
}

export function planInflation19Due({enabled=false,gasDailyApproved=false,events=[],
 checkpoint={},now=new Date()}={}){
 if(!enabled)return {status:'DISABLED',due:[],skipped:GROUPS.map(x=>x.key)};
 const current=now instanceof Date?now:new Date(now);
 if(!Number.isFinite(current.getTime()))throw err('INFL19_RECURRING_NOW_INVALID');
 const today=current.toISOString().slice(0,10),due=[],skipped=[];
 for(const group of GROUPS){
  const previous=checkpoint?.processed?.[group.key];
  const attempt=checkpoint?.attempted?.[group.key];
  const attemptedRecently=eventKey=>attempt?.eventKey===eventKey&&
   validTimestamp(attempt.at)&&current.getTime()>=Date.parse(attempt.at)&&
   current.getTime()-Date.parse(attempt.at)<24*3600000;
  if(group.key==='gas'){
   if(gasDailyApproved===true&&(!validDay(previous)||previous<today)&&
    (!validDay(attempt?.eventKey)||attempt.eventKey<today))
    due.push({key:group.key,eventKey:today,maxRequests:group.maxRequests});
   else skipped.push(group.key);
   continue;
  }
  const day=releaseDate(group,events,today,current.getUTCHours());
  if(day&&(!validDay(previous)||previous<day)&&
   (!validDay(attempt?.eventKey)||attempt.eventKey<=day)&&!attemptedRecently(day))
   due.push({key:group.key,eventKey:day,maxRequests:group.maxRequests});
  else skipped.push(group.key);
 }
 return {status:due.length?'DUE':'NO_VERIFIED_RELEASE_DUE',due,skipped};
}

function checkpointFile(base){
 if(typeof base!=='string'||!path.isAbsolute(base)||path.basename(path.resolve(base)).toLowerCase()!=='pc-writer')
  throw err('INFL19_RECURRING_HOME_DENIED');
 let canonical;
 try{canonical=fs.realpathSync.native(base);}catch{throw err('INFL19_RECURRING_HOME_DENIED');}
 const root=fs.statSync(canonical);
 if(!root.isDirectory())throw err('INFL19_RECURRING_HOME_DENIED');
 if(process.platform==='win32'){
  let approved;try{approved=fs.realpathSync.native(String.raw`E:\ZGmini\data\pc-writer`);}
  catch{throw err('INFL19_RECURRING_HOME_DENIED');}
  const norm=x=>path.win32.normalize(x.replace(/^\\\\\?\\/,'' )).toLowerCase();
  if(norm(canonical)!==norm(approved))throw err('INFL19_RECURRING_HOME_DENIED');
 }
 const dir=path.join(base,'inflation-causal-r1');
 const stat=fs.lstatSync(dir);
 if(!stat.isDirectory()||stat.isSymbolicLink())throw err('INFL19_RECURRING_CHECKPOINT_DIR_DENIED');
 return path.join(dir,'recurring-checkpoint-r1.json');
}

function loadCheckpoint(file){
 if(!fs.existsSync(file))return {schema:INFL19_RECURRING_SCHEMA,processed:{},attempted:{}};
 const s=fs.lstatSync(file);
 if(!s.isFile()||s.isSymbolicLink()||s.size>65536)throw err('INFL19_RECURRING_CHECKPOINT_FILE_DENIED');
 let value;try{value=JSON.parse(fs.readFileSync(file,'utf8'));}
 catch{throw err('INFL19_RECURRING_CHECKPOINT_INVALID');}
 if(value?.schema!==INFL19_RECURRING_SCHEMA||typeof value.processed!=='object'||
  !value.processed||Array.isArray(value.processed)||
  Object.entries(value.processed).some(([k,v])=>!GROUPS.some(g=>g.key===k)||!validDay(v))||
  (value.attempted!==undefined&&(
   typeof value.attempted!=='object'||!value.attempted||Array.isArray(value.attempted)||
   Object.entries(value.attempted).some(([k,v])=>!GROUPS.some(g=>g.key===k)||
    !validDay(v?.eventKey)||!validTimestamp(v?.at)))))
  throw err('INFL19_RECURRING_CHECKPOINT_INVALID');
 return value;
}

function saveCheckpoint(file,value){
 const bytes=JSON.stringify(value),tmp=`${file}.tmp-${process.pid}-${randomUUID()}`;
 fs.writeFileSync(tmp,bytes,{flag:'wx'});
 try{fs.renameSync(tmp,file);}catch(e){try{fs.unlinkSync(tmp);}catch{}throw err('INFL19_RECURRING_CHECKPOINT_RENAME_FAILED');}
 const after=loadCheckpoint(file);
 if(JSON.stringify(after)!==bytes)throw err('INFL19_RECURRING_CHECKPOINT_READBACK_FAILED');
}

function credentialsOf(env,group){
 if(group.credential==='BLS')return env?.BLS_API_KEY||env?.BLS_REGISTRATION_KEY;
 if(group.credential==='EIA')return env?.EIA_API_KEY;
 if(group.credential==='FRED')return env?.FRED_API_KEY;
 return null;
}

// No I/O, dynamic imports or secret reads while disabled. The caller supplies
// the official, stored calendar events and exact activation decision.
export async function collectInflation19IfDue({
 base,approved=false,gasDailyApproved=false,officialEvents=[],now=new Date(),
 providerEnv,quotaFetch,collectors,checkpointIO,
}={}){
 if(approved!==true)return {status:'DISABLED',providerRequests:0,updated:[],skipped:GROUPS.map(x=>x.key)};
 const file=checkpointIO?.file??checkpointFile(base);
 const previous=checkpointIO?.load?checkpointIO.load():loadCheckpoint(file);
 const plan=planInflation19Due({enabled:true,gasDailyApproved,events:officialEvents,
  checkpoint:previous,now});
 if(!plan.due.length)return {...plan,providerRequests:0,updated:[]};
 // The production caller must use the existing enforced quota fetch. We do not
 // create unguarded direct fetches or silently fall back to the global fetch.
 if(typeof quotaFetch!=='function')throw err('INFL19_RECURRING_APPROVED_QUOTA_FETCH_REQUIRED');
 const environment=providerEnv??{};
 const configured=collectors??{
  bls8:(await import('./inflation-causal-bls8.mjs')).collectInflationCausalBls8,
  gas:(await import('./inflation-causal-gas-electric.mjs')).collectGas,
  electricity:(await import('./inflation-causal-gas-electric.mjs')).collectIndustrialElectricity,
  sce:(await import('./inflation-sce-collector.mjs')).collectSceOneYear,
 };
 const report={status:'COMPLETE',providerRequests:0,updated:[],unchanged:[],
  skipped:[...plan.skipped],failed:[]};
 const next={schema:INFL19_RECURRING_SCHEMA,processed:{...previous.processed},
  attempted:{...(previous.attempted??{})}};
 for(const due of plan.due){
  const group=GROUPS.find(x=>x.key===due.key);
  const key=credentialsOf(environment,group);
  if(group.credential&&!validKey(key)){report.skipped.push(group.key);continue;}
  // Persist the attempted event BEFORE making any network request. A crash or
  // partial provider failure cannot cause unbounded retry on every Core tick.
  next.attempted[group.key]={eventKey:due.eventKey,
   at:(now instanceof Date?now:new Date(now)).toISOString()};
  try{(checkpointIO?.save??(value=>saveCheckpoint(file,value)))(next);}
  catch{report.failed.push({source:group.key,code:'INFL19_RECURRING_ATTEMPT_CHECKPOINT_FAILED'});continue;}
  let groupRequests=0;
  const meteredFetch=async(...args)=>{
   if(groupRequests>=group.maxRequests)throw err('INFL19_RECURRING_REQUEST_BOUND_EXCEEDED');
   groupRequests++;return quotaFetch(...args);
  };
  try{
   const common={base,quotaFetch:meteredFetch,now:now instanceof Date?now:new Date(now)};
   const args=group.key==='bls8'?{...common,blsKey:key}:
    group.key==='gas'?{...common,fredKey:key}:
    group.key==='electricity'?{...common,eiaKey:key}:
    {directory:path.join(base,'inflation-causal','sce31'),fetcher:meteredFetch,
     now:()=>common.now};
   if(group.key==='sce'){
    const stat=fs.lstatSync(args.directory);
    if(!stat.isDirectory()||stat.isSymbolicLink())
     throw err('INFL19_RECURRING_SCE_DIRECTORY_DENIED');
   }
   if(typeof configured[group.key]!=='function')throw err('INFL19_RECURRING_COLLECTOR_UNAVAILABLE');
   const result=await configured[group.key](args);
   const count=result?.providerCalls??result?.providerRequests??groupRequests;
   if(!Number.isSafeInteger(count)||count!==groupRequests||count>group.maxRequests)
    throw err('INFL19_RECURRING_REQUEST_BOUND_EXCEEDED');
   // Mark a release/day handled only after an approved collector has returned
   // with its own existing storage/readback/unchanged contract.
   if(!['SAVED_READBACK','UNCHANGED','UNCHANGED_VALID_INPUT_PRESERVED','STORED'].includes(result?.status))
    throw err('INFL19_RECURRING_COLLECTOR_CONTRACT_DENIED');
   const unchanged=['UNCHANGED','UNCHANGED_VALID_INPUT_PRESERVED'].includes(result.status);
   if(unchanged&&group.key!=='gas'){
    // Date-only calendar events can precede the provider's actual publication.
    // The pre-call attempted checkpoint already prevents a retry for 24 hours;
    // do not permanently mark this release processed until data is read back.
    report.unchanged.push({source:group.key,status:'UNCHANGED_WAITING_NEXT_DUE',
     providerRequests:count});
    continue;
   }
   next.processed[group.key]=due.eventKey;
   (checkpointIO?.save??(value=>saveCheckpoint(file,value)))(next);
   if(unchanged)report.unchanged.push({source:group.key,status:result.status,providerRequests:count});
   else report.updated.push({source:group.key,status:result.status,providerRequests:count});
  }catch(error){
   report.failed.push({source:group.key,code:/^INFL19_[A-Z0-9_]+$/.test(error?.code??'')?
    error.code:'INFL19_RECURRING_SOURCE_FAILED'});
  }finally{report.providerRequests+=groupRequests;}
 }
 if(report.failed.length)report.status='PARTIAL_PREVIOUS_CHECKPOINT_PRESERVED';
 else if(!report.updated.length&&report.unchanged.length)
  report.status='UNCHANGED_AWAITING_NEXT_DUE';
 return report;
}

// Production adapter for the existing PC Core lane. The feature flag is read
// from the already installed provider environment, never from a new scheduler.
// The hook remains inert unless an explicitly approved source scope is enabled.
export async function runInflation19RecurringFromCore(base,{now=new Date(),
 envLoader,calendarLoader,quotaFactory,collectors,checkpointIO,
}={}){
 let env;
 try{
  const loader=envLoader??(await import('./local-env.mjs')).loadLocalProviders;
  env=loader(base);
 }catch{return {status:'DISABLED_PROVIDERS_UNAVAILABLE',providerRequests:0,updated:[]};}
 if(env?.ZGMINI_INFL19_RECURRING_APPROVED!=='1')
  return {status:'DISABLED',providerRequests:0,updated:[]};
 let calendar;
 try{
  if(calendarLoader)calendar=await calendarLoader(base);
  else{
   // DatabaseSync readOnly avoids the normal write-capable localDatabase's
   // WAL initialization and opens no provider connection or DB schema.
   const {DatabaseSync}=await import('node:sqlite');
   const file=path.join(base,'storage','core.sqlite'),st=fs.lstatSync(file);
   if(!st.isFile()||st.isSymbolicLink())throw err('INFL19_RECURRING_SQLITE_DENIED');
   const db=new DatabaseSync(file,{readOnly:true});
   try{
    db.exec('PRAGMA query_only=ON;');
    const row=db.prepare("SELECT body FROM public_feed_snapshots_v1 WHERE kind='output' AND feed_key='release-calendar' AND snapshot_key='current'").get();
    calendar=row?JSON.parse(row.body):null;
   }finally{db.close();}
  }
 }catch{calendar=null;}
 const sources=calendar?.sources??{},events=Array.isArray(calendar?.events)?calendar.events:[];
 const clock=now instanceof Date?now.getTime():new Date(now).getTime();
 const officialEvents=events.filter(e=>e&&sources[e.source]?.status==='READY'&&
  typeof sources[e.source]?.checkedAt==='string'&&
  Number.isFinite(Date.parse(sources[e.source].checkedAt))&&
  Date.parse(sources[e.source].checkedAt)<=clock);
 let quota;
 const lazyQuotaFetch=async(...args)=>{
  if(!quota){
   const create=quotaFactory??(await import('./quota-fetch.mjs')).createQuotaFetch;
   quota=create({base,originalFetch:globalThis.fetch,mode:'enforce'});
  }
  return quota.fetch(...args);
 };
 return collectInflation19IfDue({base,approved:true,
  gasDailyApproved:env.ZGMINI_INFL19_GAS_DAILY_APPROVED==='1',
  officialEvents,now,providerEnv:env,quotaFetch:lazyQuotaFetch,collectors,
  checkpointIO});
}
