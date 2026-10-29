// R73: automatically resume only the verified transient HTTP 502 checkpoint.
// An existing R48 private cycle is retried at most 3 times, with >=60s between
// batches. It never changes a schedule, publishes D1 or deletes raw data.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {inspectR72Checkpoint,recoverR72Checkpoint} from
  './theme-nine-r72-transient-checkpoint-recover.mjs';
import {r71Preflight,runR71PrivateRecovery} from
  './theme-nine-r71-private-recovery-once.mjs';

const DEFAULT_MAX_ATTEMPTS=3;
const RETRY_INTERVAL_MS=60_000;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const ROOT='E:/ZGmini/data/pc-writer/theme-nine-r48';
const ACTION=path.join(ROOT,'THEME_NINE_R48_PRIVATE_CYCLE.cmd');
const LOCK='E:/ZGmini/data/themes/legacy-nine-r35-delta/state/delta.lock';

export function r73ScheduledPreflight({now=new Date(),exists=fs.existsSync,
  requiredPreflight=r71Preflight}={}){
  const required=requiredPreflight({now});
  const h=Object.fromEntries(new Intl.DateTimeFormat('en-US',{
    timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',hourCycle:'h23',
  }).formatToParts(now).filter(x=>['hour','minute'].includes(x.type))
    .map(x=>[x.type,Number(x.value)]));
  const minute=h.hour*60+h.minute;
  // The existing 11:30 scheduled slot is permitted even though the manual
  // R71 guard rejects overlaps. A user-triggered run of the *same* scheduled
  // task outside that slot must also work when the manual R71 guard is clear.
  const insidePrivateSlot=minute>=680&&minute<=735;
  const manualSlotAllowed=required.canRun===true;
  const actionPresent=exists(ACTION);
  const activeLock=exists(LOCK);
  const canRun=required.allRequiredPresent&&
    (insidePrivateSlot||manualSlotAllowed)&&actionPresent&&!activeLock;
  const reason=!required.allRequiredPresent?'MISSING_PRIVATE_CHAIN':
    !actionPresent?'MISSING_R48_COMMAND':
    activeLock?'PRIVATE_COLLECTION_ACTIVE':
    !(insidePrivateSlot||manualSlotAllowed)?'KNOWN_SCHEDULE_OVERLAP':
    'READY';
  return {canRun,insidePrivateSlot,manualSlotAllowed,reason};
}

function correlateR47Result(root,before){
  const names=fs.readdirSync(root).filter(n=>
    /^THEME_NINE_R47_RECURRING_PRIVATE_UPDATE_\d+_\d+\.json$/.test(n)&&
    !before.has(n));
  if(names.length!==1)return {evidenceStatus:'R47_RESULT_NOT_UNIQUELY_CORRELATED',
    statuses:[],dataOutcome:'NOT_VERIFIED',dates:null};
  const file=path.join(root,names[0]);
  if(!fs.statSync(file).isFile()||fs.lstatSync(file).isSymbolicLink())
    return {evidenceStatus:'R47_RESULT_NOT_REGULAR_FILE',statuses:[],
      dataOutcome:'NOT_VERIFIED',dates:null};
  try{
    const parsed=JSON.parse(fs.readFileSync(file,'utf8'));
    if(parsed.contract!=='THEME_NINE_R47_PRIVATE_AUTOMATIC_UPDATE_V1')
      throw Error('R47_RESULT_CONTRACT');
    return {evidenceStatus:'R47_RESULT_CORRELATED',
      statuses:[parsed.collection?.status,parsed.status].filter(x=>typeof x==='string'),
      dataOutcome:parsed.dataOutcome??'NOT_VERIFIED',
      dates:{cutoffNYDay:parsed.freshness?.targetClosedNYDay??null,
        lastVerifiedSpyNYDay:parsed.freshness?.lastVerifiedSpyNYDay??null}};
  }catch{return {evidenceStatus:'R47_RESULT_INVALID',statuses:[],
    dataOutcome:'NOT_VERIFIED',dates:null};}
}

export function runR73ScheduledR48({run=spawnSync,root=ROOT}={}){
  const before=fs.existsSync(root)?new Set(fs.readdirSync(root)):new Set();
  const result=run('cmd.exe',['/d','/c',ACTION],{
    encoding:null,timeout:25*60*1000,windowsHide:true,cwd:ROOT,
    maxBuffer:8*1024*1024});
  const latestR47=fs.existsSync(root)?correlateR47Result(root,before):null;
  return {existingPrivateCommandExit:result.status,
    status:result.status===0&&!result.error?
      'R71_EXISTING_PRIVATE_RUN_RETURNED_ZERO':'R71_EXISTING_PRIVATE_RUN_NONZERO',
    processError:result.error?.code??null,latestR47};
}

export async function runR73PrivateAutoRetry({
  inspect=()=>inspectR72Checkpoint({allowNoFailure:true}),
  recover=()=>recoverR72Checkpoint(),
  run=runR71PrivateRecovery,preflight=r71Preflight,
  delay=sleep,maxAttempts=DEFAULT_MAX_ATTEMPTS,
  report=record=>process.stdout.write(JSON.stringify(record)+'\n'),
}={}){
  if(!Number.isInteger(maxAttempts)||maxAttempts<1||maxAttempts>3)
    throw Object.assign(new Error('R73_ATTEMPT_LIMIT'),{code:'R73_ATTEMPT_LIMIT'});
  let recoveries=0;
  for(let attempt=1;attempt<=maxAttempts;attempt++){
    const ready=preflight();
    if(!ready.canRun)return {status:'STOP_R73_PC_PREFLIGHT',attempts:attempt-1,
      reason:ready.reason??'PREFLIGHT_NOT_READY',recoveries,d1Writes:0,
      schedulerWrites:0,publicWrites:0};
    const checkpoint=inspect(); // validated SHA and exact checkpoint identity
    if(!checkpoint.noFailed){
      if(checkpoint.sourceFailure!=='STOP_HTTP_502')return {
        status:'STOP_R73_NON_502_CHECKPOINT',attempts:attempt-1,
        recoveries,d1Writes:0,schedulerWrites:0,publicWrites:0};
      const restored=recover();
      recoveries++;
      report({event:'VERIFIED_HTTP502_CHECKPOINT_BACKUP_AND_RESUME',attempt,
        backup:restored.backup,completedSymbolsPreserved:restored.completedSymbolsPreserved});
    }
    const result=run(); // existing R48 private-only command, not a new collector
    report({event:'EXISTING_PRIVATE_CYCLE_FINISHED',attempt,
      privateExit:result.existingPrivateCommandExit,
      privateStatus:result.status,
      sourceEvidenceStatus:result.latestR47?.evidenceStatus??'NOT_VERIFIED',
      dataOutcome:result.latestR47?.dataOutcome??'NOT_VERIFIED',
      latestR47Codes:result.latestR47?.statuses??[],
      lastVerifiedSpyNYDay:result.latestR47?.dates?.lastVerifiedSpyNYDay??null});
    if(result.existingPrivateCommandExit===0&&
       result.status==='R71_EXISTING_PRIVATE_RUN_RETURNED_ZERO')return {
      status:'R73_PRIVATE_COMMAND_RETURNED_ZERO',attempts:attempt,
      recoveries,lastPrivateStatus:result.status,
      sourceEvidenceStatus:result.latestR47?.evidenceStatus??'NOT_VERIFIED',
      dataOutcome:result.latestR47?.dataOutcome??'NOT_VERIFIED',
      d1Writes:0,schedulerWrites:0,publicWrites:0};
    const next=inspect(); // never retry unknown/429/non-502 failures
    if(next.noFailed||next.sourceFailure!=='STOP_HTTP_502')return {
      status:'STOP_R73_PRIVATE_NON_502_FAILURE',attempts:attempt,
      recoveries,lastPrivateStatus:result.status,
      d1Writes:0,schedulerWrites:0,publicWrites:0};
    if(attempt===maxAttempts)return {
      status:'STOP_R73_HTTP502_RETRY_CAP',attempts:attempt,
      recoveries,lastPrivateStatus:result.status,
      d1Writes:0,schedulerWrites:0,publicWrites:0};
    report({event:'HTTP502_PAUSE_BEFORE_RETRY',attempt,delayMs:RETRY_INTERVAL_MS});
    await delay(RETRY_INTERVAL_MS);
  }
  throw Object.assign(new Error('R73_UNREACHABLE'),{code:'R73_UNREACHABLE'});
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    if(process.argv.length!==3||!
      ['--run-private','--scheduled-private'].includes(process.argv[2]))
      throw Object.assign(new Error('R73_USAGE'),{code:'R73_USAGE'});
    if(process.platform!=='win32')
      throw Object.assign(new Error('R73_WINDOWS_PC_REQUIRED'),
        {code:'R73_WINDOWS_PC_REQUIRED'});
    const scheduled=process.argv[2]==='--scheduled-private';
    const result=await runR73PrivateAutoRetry(scheduled?{
      preflight:r73ScheduledPreflight,
      recover:()=>recoverR72Checkpoint({preflightFn:r73ScheduledPreflight}),
      run:runR73ScheduledR48,
    }:{});
    process.stdout.write(JSON.stringify({report:'THEME_NINE_R73_AUTO_HTTP502',
      mode:scheduled?'EXISTING_1130_SCHEDULED':'MANUAL',...result},null,2)+'\n');
    if(result.status.startsWith('STOP_'))process.exitCode=2;
  }catch(error){
    process.stderr.write(JSON.stringify({status:'STOP_R73_ABORTED',
      reason:error.code??'UNEXPECTED',d1Writes:0,schedulerWrites:0,
      publicWrites:0})+'\n');
    process.exitCode=1;
  }
}
