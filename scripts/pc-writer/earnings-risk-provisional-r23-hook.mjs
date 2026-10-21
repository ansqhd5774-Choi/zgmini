import fs from "node:fs";
import path from "node:path";
import {spawn,execFileSync} from "node:child_process";

const SHA40=/^[a-f0-9]{40}$/;
const SIDECAR_FILES=Object.freeze([
 "ZGMINI_EARNINGS_R20_PROVISIONAL_SHADOW_READONLY.mjs",
 "ZGMINI_EARNINGS_R21_OBSERVATION_LEDGER.mjs",
 "ZGMINI_EARNINGS_R22_CHANGE_GATE.mjs",
]);

// Runs only on the existing Core PC lane; never executes a provider call,
// creates a task, edits config, publishes, or touches the official scorer.
export function dispatchEarningsRiskProvisionalR23({
 base,
 here,
 platform=process.platform,
 spawnImpl=spawn,
 gitImpl=execFileSync,
 fsImpl=fs,
 node=process.execPath,
}={}){
 if(platform!=="win32")return {status:"SKIPPED_NON_WINDOWS"};
 if(!base||!here)return {status:"BLOCKED_PATH_MISSING"};
 const root=path.resolve(here,"..","..");
 const directory=path.join(base,"earnings-risk-provisional-r23");
 const runner=path.join(directory,SIDECAR_FILES[2]);
 const cfgFile=path.join(base,"config.json");
 try{
  if(!fsImpl.existsSync(cfgFile))return {status:"BLOCKED_CONFIG_MISSING"};
  // File presence is the explicit installation gate. No implicit Downloads,
  // worktree fallback or automatic task/config source switch.
  if(!fsImpl.existsSync(directory)||!SIDECAR_FILES.every(name=>fsImpl.existsSync(path.join(directory,name))))
   return {status:"NOT_INSTALLED"};
  // Never start a second heavy scan while R22 holds the observation lock.
  // A possibly stale lock must be investigated, not bypassed automatically.
  if(fsImpl.existsSync(path.join(base,"local-earnings-risk-provisional-r22.lock")))
   return {status:"PREVIOUS_OBSERVATION_RUNNING_OR_UNKNOWN"};
  for(const name of SIDECAR_FILES){
   const stat=fsImpl.lstatSync(path.join(directory,name));
   if(!stat.isFile()||stat.isSymbolicLink())return {status:"BLOCKED_SIDECAR_FILE_UNSAFE"};
  }
  const cfg=JSON.parse(fsImpl.readFileSync(cfgFile,"utf8"));
  const expected=cfg?.source;
  if(!SHA40.test(expected??"")||cfg.collectionTarget!=="pc"||cfg.enabled!==true)
   return {status:"BLOCKED_APPROVAL_CONFIG"};
  // R25 proven read-only Git status options; avoid long fsmonitor hangs.
  // A timeout is AUTOMATION_BLOCKED for this observer only, not Core health.
  const gitOptions={cwd:root,encoding:"utf8",windowsHide:true,timeout:6000,
   env:{...process.env,GIT_OPTIONAL_LOCKS:"0",GIT_TERMINAL_PROMPT:"0",
    GCM_INTERACTIVE:"Never",GIT_LFS_SKIP_SMUDGE:"1"}};
  const sha=String(gitImpl("git",["rev-parse","HEAD"],gitOptions)).trim();
  const dirty=String(gitImpl("git",["-c","core.fsmonitor=false","-c",
   "core.untrackedCache=false","status","--porcelain","--untracked-files=no"],gitOptions)).trim();
  if(expected!==sha||dirty)return {status:"BLOCKED_RUNTIME_SHA_DRIFT"};
  const child=spawnImpl(node,[runner],{
   cwd:directory,windowsHide:true,detached:true,stdio:"ignore",
   env:{...process.env,ZGMINI_PC_HOME:base,ZGMINI_EARNINGS_R23_ROOT:root,ZGMINI_EARNINGS_R23_SOURCE:sha},
  });
  child.on?.("error",()=>{ /* The sidecar never blocks the official Core lane. */ });
  child.unref?.();
  // Dispatch is NOT an observation append or publication PASS. Inspect R22's
  // local result/ledger before claiming either.
  return {status:"DISPATCHED_UNVERIFIED",pid:child.pid??null};
 }catch(error){
  return {status:"DISPATCH_FAILED",reason:String(error?.code??error?.message??"UNKNOWN").slice(0,100)};
 }
}
