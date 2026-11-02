/**
 * R46: pure, fail-closed decision for a future isolated R2 daily source lane.
 *
 * No provider/D1 API, filesystem, process, task, environment, lock, or Core
 * interactions. This NEVER runs the R45 collector or authorizes its E: write.
 * A trusted caller must separately obtain approval and reconcile its own
 * append-only checkpoint before attempting anything the plan recommends.
 *
 * The existing 5-minute Core hot path and the NY IEX intraday window are
 * explicitly excluded. A Core Task action/source ambiguity is a STOP, not a
 * reason to add another scheduled task or bypass an existing lock.
 */
import {isMarketSession,latestCompletedSession}
  from '../../lib/market-score/breadth-b1-r3-calendar.mjs';

const REVISION='US_BREADTH_DAILY_SOURCE_SCHEDULER_DECISION_R46';
const DATE=/^\d{4}-\d{2}-\d{2}$/;
const MAX_ATTEMPTS=3;
const RETRY_BASE_MS=30*60_000;
const RATE_LIMIT_BASE_MS=60*60_000;
const BACKOFF_CAP_MS=4*60*60_000;
const CHECKPOINT_FIELDS='attempts,date,lastAttemptAt,status';
const STATES=new Set(['NOT_ATTEMPTED','COMPLETE','RETRYABLE_FAILURE',
  'RATE_LIMITED','PERMANENT_FAILURE','IN_PROGRESS']);

const result=(status,details={})=>({revision:REVISION,mode:'PURE_READ_ONLY_PLAN',
  status,proposeProviderManifestGet:false,sourceWriteAllowed:false,
  publicationAllowed:false,providerCalls:0,localWrites:0,d1Writes:0,
  coreTaskChanges:0,lockPidActions:0,...details});

function nyTime(now){
  const parts=new Intl.DateTimeFormat('en-US',{
    timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit',
    hour:'2-digit',minute:'2-digit',hourCycle:'h23',
  }).formatToParts(now);
  const x=Object.fromEntries(parts.map(part=>[part.type,part.value]));
  return {date:`${x.year}-${x.month}-${x.day}`,
    minutes:Number(x.hour)*60+Number(x.minute)};
}

function validCheckpoint(checkpoint,day,now){
  if(!checkpoint||typeof checkpoint!=='object'||Array.isArray(checkpoint)
    ||Object.keys(checkpoint).sort().join(',')!==CHECKPOINT_FIELDS
    ||!DATE.test(checkpoint.date)||!isMarketSession(checkpoint.date)
    ||checkpoint.date!==day||!STATES.has(checkpoint.status)
    ||!Number.isSafeInteger(checkpoint.attempts)||checkpoint.attempts<0
    ||checkpoint.attempts>MAX_ATTEMPTS)return false;
  if(checkpoint.status==='NOT_ATTEMPTED')
    return checkpoint.attempts===0&&checkpoint.lastAttemptAt===null;
  return checkpoint.attempts>=1
    &&typeof checkpoint.lastAttemptAt==='string'
    &&Number.isFinite(Date.parse(checkpoint.lastAttemptAt))
    &&new Date(checkpoint.lastAttemptAt).toISOString()===checkpoint.lastAttemptAt
    &&Date.parse(checkpoint.lastAttemptAt)<=now;
}

/**
 * The checkpoint is externally supplied for exactly the latest completed
 * session. Absent, older, future, malformed and unknown statuses all fail
 * closed; this planner never silently initializes or advances a checkpoint.
 *
 * To even PROPOSE a provider manifest GET the caller must have separately
 * verified the approved PC source and Core Task action chain and selected an
 * isolated, non-blocking lane. It cannot be used to install that lane.
 */
export function planUsBreadthDailySourceR46({
  now=Date.now(),checkpoint=null,
  executionLane='UNVERIFIED',approvedPcSourceVerified=false,
  coreTaskActionVerified=false,
}={}){
  if(!Number.isSafeInteger(now)||now<=0)return result('INVALID_NOW');
  const instant=new Date(now);
  let date,ny;
  try{date=latestCompletedSession(instant);ny=nyTime(instant);}
  catch{return result('NY_SESSION_CALENDAR_UNAVAILABLE');}
  if(!DATE.test(date)||!isMarketSession(date))
    return result('NY_SESSION_CALENDAR_UNAVAILABLE');
  const scope={latestCompletedDate:date};

  // Protect the 09:30–16:00 IEX session, plus 30 minutes before/after.
  // Even on a DST change, Intl timeZone='America/New_York' stays authoritative.
  if(isMarketSession(ny.date)&&ny.minutes>=9*60
    &&ny.minutes<16*60+30)
    return result('IEX_PROTECTED_NY_WINDOW',scope);
  if(executionLane!=='ISOLATED_NONBLOCKING_DAILY')
    return result('CORE_HOT_PATH_OR_UNKNOWN_LANE_REJECTED',scope);
  if(approvedPcSourceVerified!==true||coreTaskActionVerified!==true)
    return result('APPROVED_PC_SOURCE_OR_TASK_ACTION_UNVERIFIED',scope);
  if(!validCheckpoint(checkpoint,date,now))
    return result('UNKNOWN_OR_MISMATCHED_CHECKPOINT_PRESERVED',scope);
  const attempted={...scope,attempts:checkpoint.attempts};
  if(checkpoint.status==='COMPLETE')return result('ALREADY_COMPLETED_DATE',attempted);
  if(checkpoint.status==='PERMANENT_FAILURE')
    return result('TERMINAL_FAILURE_PRESERVED',attempted);
  if(checkpoint.status==='IN_PROGRESS')
    return result('IN_PROGRESS_NO_CONCURRENT_RETRY',attempted);
  if(checkpoint.attempts>=MAX_ATTEMPTS)
    return result('MAX_DAILY_ATTEMPTS_EXHAUSTED',attempted);

  let nextEligibleAt=null;
  if(checkpoint.status==='RETRYABLE_FAILURE'||checkpoint.status==='RATE_LIMITED'){
    const base=checkpoint.status==='RATE_LIMITED'?RATE_LIMIT_BASE_MS:RETRY_BASE_MS;
    const waitMs=Math.min(BACKOFF_CAP_MS,base*2**(checkpoint.attempts-1));
    const eligible=Date.parse(checkpoint.lastAttemptAt)+waitMs;
    if(!Number.isSafeInteger(eligible))return result('CHECKPOINT_TIME_INVALID',attempted);
    nextEligibleAt=new Date(eligible).toISOString();
    if(now<eligible)return result('BOUNDED_BACKOFF_WAIT',{
      ...attempted,nextEligibleAt});
  }

  // This is ONLY a plan, not a call or permission to download/write anything.
  return result('LATEST_PAIR_MANIFEST_GET_MAY_BE_PROPOSED',{
    ...attempted,nextEligibleAt,
    nextAttempt:checkpoint.attempts+1,proposeProviderManifestGet:true,
    collectionWindow:'DAILY_PAIR',operation:'R45_PLAN_LATEST_PAIR_ONLY',
  });
}
