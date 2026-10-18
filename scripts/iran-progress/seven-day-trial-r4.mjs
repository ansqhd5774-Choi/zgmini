/** Seven-day local-only Shadow V1. Never collects, calls Ollama, or publishes.
 * Existing SQLite is opened read-only. The trial ledger is a small separate
 * results-only JSON at E:/ZGmini/data/iran-progress-r13/shadow-r4-trial/.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {calculateIranR4RealityShadow} from '../../lib/iran-progress/reality-shadow-r4.mjs';
import {auditR4ScoreAgainstAnchors} from '../../lib/iran-progress/observed-anchors-r4.mjs';
import {R4_TRIAL_DEFAULT,tuneR4ShadowCandidate,validateR4TrialTuning,compareR4TrialCandidates} from '../../lib/iran-progress/seven-day-tuning-r4.mjs';
const DAY=86400000,KST=9*3600000,DAYS=7;
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const DEFAULT_DB='E:\\ZGmini\\data\\iran-progress-r13\\iran.sqlite';
const DEFAULT_HOME='E:\\ZGmini\\data\\iran-progress-r13\\shadow-r4-trial';
const CHECKPOINT='r4-shadow-verified-input-v1';
export const R4_TRIAL_VERSION='R4_SEVEN_DAY_LOCAL_SHADOW_V1';
export const dayKst=ms=>new Date(ms+KST).toISOString().slice(0,10);
const hash=x=>createHash('sha256').update(typeof x==='string'?x:JSON.stringify(x)).digest('hex');
const dayNumber=(date,first)=>Math.floor((Date.parse(date+'T00:00:00Z')-Date.parse(first+'T00:00:00Z'))/DAY)+1;
const codeHash=()=>hash(['lib/iran-progress/reality-shadow-r4.mjs','lib/iran-progress/maritime-official-r4.mjs',
 'lib/iran-progress/seven-day-tuning-r4.mjs','lib/iran-progress/observed-anchors-r4.mjs'].map(p=>fs.readFileSync(path.join(ROOT,p),'utf8')).join('\n'));
const readJSON=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const recordFile=dir=>path.join(dir,'week.json');
export function summarizeR4Trial(record,now){
 if(!record)return {status:'NOT_STARTED',samples:0,productionReady:false};
 if(record.version!==R4_TRIAL_VERSION||!Array.isArray(record.samples)||record.samples.length>DAYS)
  throw Error('R4_TRIAL_RECORD_INVALID');
 const days=Array.from({length:DAYS},(_,i)=>new Date(Date.parse(record.startDate+'T00:00:00Z')+i*DAY).toISOString().slice(0,10));
 const by=new Map(record.samples.map(s=>[s.date,s]));
 if(by.size!==record.samples.length||record.samples.some(s=>!days.includes(s.date)))throw Error('R4_TRIAL_SAMPLE_SET_INVALID');
 const missingDays=days.filter(d=>!by.has(d));
 const dayIndex=dayNumber(dayKst(now),record.startDate);
 const expired=dayIndex>DAYS;
 const complete=missingDays.length===0;
 const invalidCount=record.samples.filter(s=>s.independentCheck!=='NOT_CONTRADICTED_BUT_UNCALIBRATED').length;
 return {version:record.version,status:complete?'SEVEN_DAYS_RECORDED':expired?'INCOMPLETE':'RUNNING',
  startDate:record.startDate,endDate:days.at(-1),elapsedDays:Math.min(Math.max(dayIndex,0),DAYS),
  samples:record.samples.length,missingDays,
  daily:record.samples.map(x=>({date:x.date,phase:x.phase,candidateScore:x.candidateScore,allowedRange:x.allowedRange,independentCheck:x.independentCheck})), 
  contradictoryOrUnassessed:invalidCount,configHash:record.configHash,
  sourceHash:record.sourceHash,productionReady:false,
  exactScoreAccuracy:'NOT_VERIFIED',autoTuned:false};
}
function guardedRead(file){
 if(!fs.existsSync(file))return null;
 if(fs.lstatSync(file).isSymbolicLink())throw Error('R4_TRIAL_LEDGER_SYMLINK');
 return readJSON(file);
}
function saveAtomic(file,body){
 const folder=path.dirname(file);
 fs.mkdirSync(folder,{recursive:true});
 const tmp=path.join(folder,'week-'+randomUUID()+'.tmp');
 try{
  fs.writeFileSync(tmp,JSON.stringify(body,null,2)+'\n',{flag:'wx'});
  if(fs.existsSync(file)&&fs.lstatSync(file).isSymbolicLink())throw Error('R4_TRIAL_LEDGER_SYMLINK');
  fs.renameSync(tmp,file);
 }finally{if(fs.existsSync(tmp))fs.unlinkSync(tmp);}
}
function withTrialLock(dir,work){
 fs.mkdirSync(dir,{recursive:true});
 const lockFile=path.join(dir,'week.lock');
 let handle;
 try{
  try{handle=fs.openSync(lockFile,'wx');}catch(e){
   if(e?.code==='EEXIST')throw Error('R4_TRIAL_LEASE_HELD');
   throw e;
  }
  return work();
 }finally{
  if(handle!==undefined){fs.closeSync(handle);fs.unlinkSync(lockFile);}
 }
}
/** Audit inputs are user-approved, independently verified local checkpoint content only.
 * No fallback to the old R1.3 verified-input checkpoint: no Yemen coverage.
 */
export function sampleR4Trial({verifiedInput,observations=[],now,existing=null,sourceHash,config=R4_TRIAL_DEFAULT}){
 const cfg=validateR4TrialTuning(config);
 if(!Number.isSafeInteger(now)||now<=0)throw Error('R4_TRIAL_NOW_INVALID');
 if(!verifiedInput||typeof verifiedInput!=='object')
  return {status:'R4_INPUT_PENDING',reason:'INDEPENDENT_VERIFIED_R4_CHECKPOINT_MISSING',write:false};
 const shadow=calculateIranR4RealityShadow(verifiedInput,now);
 if(shadow.status!=='SHADOW_READY')
  return {status:'R4_INPUT_PENDING',reason:'VERIFICATION_OR_COVERAGE_INCOMPLETE',
   missing:shadow.missing??[],write:false};
 if(!Array.isArray(observations))throw Error('R4_TRIAL_OBSERVATIONS_INVALID');
 const assessment=auditR4ScoreAgainstAnchors(shadow.score,observations,now);
 const candidate=tuneR4ShadowCandidate(shadow,cfg);
 const date=dayKst(now),source=sourceHash??'UNKNOWN_SOURCE_VERSION',tuningHash=hash(cfg);
 if(existing){
  if(existing.version!==R4_TRIAL_VERSION||existing.sourceHash!==source||
   existing.configHash!==tuningHash)throw Error('R4_TRIAL_METHOD_OR_TUNING_DRIFT');
  if(dayNumber(date,existing.startDate)<1||dayNumber(date,existing.startDate)>DAYS)
   return {status:'TRIAL_WINDOW_CLOSED',write:false,record:existing};
  if(existing.samples.some(s=>s.date===date))
   return {status:'SAMPLE_ALREADY_RECORDED',write:false,record:existing};
 }
 const one={date,asOf:now,inputHash:hash(verifiedInput),phase:shadow.phase,
  candidateScore:candidate.score,weightedScore:candidate.weighted,domains:{...shadow.domains},
  baselineScore:shadow.score,allowedRange:candidate.allowedRange,
  independentCheck:assessment.status,independentMaximum:assessment.evidence?.maximumCompatibleScore??null,
  sourceCoverage:'VERIFIED_INPUT_CONTRACT_ONLY',publicScore:null,productionReady:false};
 const record=existing?{...existing,samples:[...existing.samples,one].sort((a,b)=>a.date.localeCompare(b.date))}
  :{version:R4_TRIAL_VERSION,startDate:date,sourceHash:source,configHash:tuningHash,
    config:cfg,samples:[one]};
 return {status:'SAMPLE_RECORDED',write:true,record,summary:summarizeR4Trial(record,now)};
}
function safeCheckpoint(db,name){const r=db.prepare('SELECT body FROM checkpoints WHERE name=?').get(name);return r?JSON.parse(r.body):null;}
export function previewR4TrialReweight(record,variants,now){
 const state=summarizeR4Trial(record,now);
 if(state.status!=='SEVEN_DAYS_RECORDED')return {status:'INSUFFICIENT_SEVEN_DAY_HISTORY',samples:state.samples??0,productionReady:false};
 const snapshots=record.samples.map(s=>({status:'SHADOW_READY',domains:s.domains,phase:s.phase,allowedRange:s.allowedRange,score:s.baselineScore}));
 return {status:'TUNING_CANDIDATES_ONLY',period:{startDate:state.startDate,endDate:state.endDate},
  autoApplied:false,productionReady:false,exactScoreAccuracy:'NOT_VERIFIED',
  variants:compareR4TrialCandidates(snapshots,variants)};
}
export function runR4TrialLocal({mode,dbFile=DEFAULT_DB,dir=DEFAULT_HOME,now=Date.now()}){
 if(!['--sample','--report','--preflight','--compare'].includes(mode))throw Error('R4_TRIAL_MODE_INVALID');
 const file=recordFile(dir);
 if(mode==='--report')return {status:'READ_ONLY_REPORT',...summarizeR4Trial(guardedRead(file),now)};
 if(mode==='--compare'){
  const existing=guardedRead(file),variantFile=path.join(dir,'seven-day-variants.json');
  if(!existing)return {status:'TRIAL_NOT_STARTED',productionReady:false};
  if(!fs.existsSync(variantFile))return {status:'TRIAL_VARIANTS_NOT_PROVIDED',productionReady:false};
  return previewR4TrialReweight(existing,readJSON(variantFile),now);
 }
 if(!fs.existsSync(dbFile))return {status:'AUTOMATION_BLOCKED',reason:'APPROVED_LOCAL_SQLITE_NOT_FOUND'};
 let db;
 try{
  db=new DatabaseSync(dbFile,{readOnly:true});
  const input=safeCheckpoint(db,CHECKPOINT);
  if(!input)return {status:'R4_INPUT_PENDING',reason:'INDEPENDENT_VERIFIED_R4_CHECKPOINT_MISSING',
   source:'LOCAL_SQLITE_READ_ONLY',sampled:false};
  const observations=safeCheckpoint(db,'r4-shadow-observed-anchors-v1')??[];
  if(mode==='--preflight'){
   const result=sampleR4Trial({verifiedInput:input,observations,now,sourceHash:codeHash()});
   return {status:result.status,reason:result.reason??null,missing:result.missing??[],sampled:false};
  }
  const method=codeHash();
  const precheck=sampleR4Trial({verifiedInput:input,observations,now,sourceHash:method});
  if(precheck.status==='R4_INPUT_PENDING')return {status:precheck.status,reason:precheck.reason,
   missing:precheck.missing??[],sampled:false};
  return withTrialLock(dir,()=>{
   const existing=guardedRead(file);
   const result=sampleR4Trial({verifiedInput:input,observations,now,existing,sourceHash:method});
   if(result.write)saveAtomic(file,result.record);
   return {status:result.status,reason:result.reason??null,missing:result.missing??[],
    ...(result.record?{summary:summarizeR4Trial(result.record,now)}:{}),
    sampled:result.write===true,source:'LOCAL_SQLITE_READ_ONLY',providerCalls:0,ollamaCalls:0,published:false};
  });
 }finally{db?.close();}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const result=runR4TrialLocal({mode:process.argv[2]});
  console.log(JSON.stringify(result));
  if(['AUTOMATION_BLOCKED','R4_INPUT_PENDING'].includes(result.status))process.exitCode=2;
 }catch(e){console.log(JSON.stringify({status:'STATE_UNKNOWN',reason:e?.message??'R4_TRIAL_FAILED',published:false}));process.exitCode=1;}
}
