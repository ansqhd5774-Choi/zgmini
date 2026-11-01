import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {runOfficialRefreshR1} from "./earnings-r5-official-refresh-r1.mjs";

export const E1_R5_OFFICIAL_REFRESH_CYCLE_R1_VERSION="E1-R5-OFFICIAL-REFRESH-CYCLE-R1";
export const E1_R5_OFFICIAL_REFRESH_CYCLE_R1_CONTRACT=Object.freeze({
  researchOnly:true,
  productionActivation:false,
  dbWrites:0,
  schedulerMutation:false,
  runtimeSourceMutation:false,
  formulaChanged:false,
  weightChanged:false,
  normalizationChanged:false,
  productionBaseline:"E1-R4",
  timeZone:"Asia/Seoul",
  earliestKstHour:18,
  maxAttemptsPerKstDate:1,
  maxOfficialRequestsPerAttempt:2,
  failedAttemptConsumesKstDate:true,
  failurePolicy:"KEEP_LAST_VALID_INPUTS",
  callerNonBlocking:true,
});

const BASE=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),".zgmini","pc-writer");
const STATE_NAME="local-earnings-r5-official-refresh-cycle-last-run.json";
const clean=v=>String(v??"").trim();
const safeIso=value=>{const ms=Date.parse(clean(value));return Number.isFinite(ms)?new Date(ms).toISOString():null;};

function writeJsonAtomic(file,value){
  fs.mkdirSync(path.dirname(file),{recursive:true});
  const part=`${file}.${process.pid}.part`;
  fs.writeFileSync(part,JSON.stringify(value,null,2)+"\n","utf8");
  fs.renameSync(part,file);
}
function readJsonSafe(file){
  try{return JSON.parse(fs.readFileSync(file,"utf8"));}catch{return null;}
}
export function kstClock(now=new Date().toISOString()){
  const iso=safeIso(now);
  if(!iso)throw Object.assign(new Error("NOW_INVALID"),{code:"NOW_INVALID"});
  const shifted=new Date(Date.parse(iso)+9*60*60*1000).toISOString();
  return {now:iso,kstDate:shifted.slice(0,10),kstHour:Number(shifted.slice(11,13))};
}
export function evaluateOfficialRefreshCycle({now=new Date().toISOString(),state=null}={}){
  const clock=kstClock(now);
  if(clock.kstHour<E1_R5_OFFICIAL_REFRESH_CYCLE_R1_CONTRACT.earliestKstHour){
    return {...clock,run:false,reason:"BEFORE_KST_18"};
  }
  if(clean(state?.lastAttemptKstDate)===clock.kstDate){
    return {...clock,run:false,reason:"ALREADY_ATTEMPTED_KST_DATE"};
  }
  return {...clock,run:true,reason:"DUE"};
}

export async function runOfficialRefreshCycleR1({
  base=BASE,
  now=new Date().toISOString(),
  runRefresh=runOfficialRefreshR1,
  writeState=true,
}={}){
  const stateFile=path.join(base,STATE_NAME);
  const previous=readJsonSafe(stateFile);
  const decision=evaluateOfficialRefreshCycle({now,state:previous});
  const common={
    version:E1_R5_OFFICIAL_REFRESH_CYCLE_R1_VERSION,
    at:decision.now,
    kstDate:decision.kstDate,
    kstHour:decision.kstHour,
    researchOnly:true,
    productionBaseline:"E1-R4",
    productionActivation:false,
    dbWrites:0,
    schedulerMutation:false,
    formulaChanged:false,
    weightChanged:false,
    normalizationChanged:false,
  };
  if(!decision.run){
    const report={
      ...previous,
      ...common,
      status:decision.reason,
      decision,
      lastAttemptKstDate:previous?.lastAttemptKstDate??null,
      officialNetworkCalls:0,
      stateFile,
    };
    if(writeState)writeJsonAtomic(stateFile,report);
    return report;
  }

  // Persist the attempt before the network call. If the process crashes or times out,
  // the 5-minute Core cadence will not hammer SEC/BEA again on the same KST date.
  const attempting={
    ...previous,
    ...common,
    status:"ATTEMPTING",
    decision,
    lastAttemptKstDate:decision.kstDate,
    attemptAt:decision.now,
    officialNetworkCalls:0,
    stateFile,
  };
  if(writeState)writeJsonAtomic(stateFile,attempting);

  try{
    const updater=await runRefresh({base,execute:true});
    const results=Array.isArray(updater?.results)?updater.results:[];
    const updatedSources=results.filter(x=>x?.status==="UPDATED").map(x=>x.source);
    const report={
      ...attempting,
      at:new Date().toISOString(),
      status:updater?.status==="COMPLETE"?"COMPLETE":"PARTIAL",
      updater,
      updatedSources,
      officialNetworkCalls:Number.isInteger(updater?.officialNetworkCalls)?updater.officialNetworkCalls:null,
    };
    if(writeState)writeJsonAtomic(stateFile,report);
    return report;
  }catch(error){
    const report={
      ...attempting,
      at:new Date().toISOString(),
      status:"FAILED",
      code:clean(error?.code??error?.message??"OFFICIAL_REFRESH_CYCLE_FAILED"),
      updater:null,
      updatedSources:[],
      officialNetworkCalls:Number.isInteger(error?.officialNetworkCalls)?error.officialNetworkCalls:null,
    };
    if(writeState)writeJsonAtomic(stateFile,report);
    return report;
  }
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    const report=await runOfficialRefreshCycleR1();
    console.log(JSON.stringify(report));
    if(report.status==="FAILED"||report.status==="PARTIAL")process.exitCode=1;
  }catch(error){
    console.log(JSON.stringify({version:E1_R5_OFFICIAL_REFRESH_CYCLE_R1_VERSION,status:"FAILED",code:clean(error?.code??error?.message??"OFFICIAL_REFRESH_CYCLE_FAILED"),productionActivation:false,dbWrites:0,schedulerMutation:false}));
    process.exitCode=1;
  }
}
