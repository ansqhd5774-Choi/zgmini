// R50: adapt the guarded R46 installer to the current SHA-pinned Core VBS.
// R46 retains source/config equality, lock, backup, exact patch and git gates.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {runR46PcApply} from './market-calendar-r46-pc-apply.mjs';
import {resolveR50CoreOrigin} from './market-calendar-r50-core-origin.mjs';

const taskXml=()=>{
 const raw=execFileSync('schtasks.exe',['/Query','/TN','ZGMINI-PC-Local-Core','/XML'],
  {windowsHide:true,timeout:12000,maxBuffer:262144,stdio:['ignore','pipe','ignore']});
 if(raw.length>262144)throw Error('R50_TASK_SIZE_LIMIT');
 return ((raw[0]===255&&raw[1]===254||raw.includes(0))?raw.toString('utf16le'):
  raw.toString('utf8')).replace(/^\ufeff/,'');
};

export function runR50PcApply({
 apply=false,base=process.env.ZGMINI_PC_HOME||String.raw`E:\ZGmini\data\pc-writer`,
 getTaskXml=taskXml,resolveOrigin=resolveR50CoreOrigin,install=runR46PcApply,
 ...installerOptions
}={}){
 const result={audit:'MARKET_CALENDAR_R50_PC_R45_INSTALL',at:new Date().toISOString(),
  mode:apply?'APPLY':'PREFLIGHT',decision:'R50_PREFLIGHT_INCOMPLETE_STOP',
  sourceWrites:0,changedFiles:[],backupCreated:false,providerCallsAdded:0,
  forcedCollection:false,published:false,dbWrites:0,schedulerChanged:false,
  gitPushed:false,newSource:null,originMode:null,worktreeId:null};
 let verified;
 try{verified=resolveOrigin(getTaskXml());}
 catch{result.decision='R50_SCHEDULED_TASK_READ_FAILED_STOP';return result;}
 if(verified?.status!=='R50_SCHEDULED_ORIGIN_RESOLVED'||!verified.root||!verified.rootWorktreeId){
  result.decision=String(verified?.status??'R50_ORIGIN_UNKNOWN')+'_STOP';
  result.wrapperHashMatched=verified?.wrapperHashMatched??false;
  result.scheduledEntryName=verified?.scheduledEntryName??null;
  result.entryEvidence=verified?.entryEvidence??null;
  return result;
 }
 result.originMode=verified.mode;
 result.worktreeId=verified.rootWorktreeId;
 result.scheduledEntryName=verified.scheduledEntryName;
 if(fs.existsSync(path.join(base,'quota-runner.lock'))){
  result.decision='R50_QUOTA_RUNNER_ACTIVE_STOP';return result;
 }
 const lockedRoot=xml=>{
  const current=resolveOrigin(xml);
  if(current?.status!=='R50_SCHEDULED_ORIGIN_RESOLVED')return null;
  return current.root;
 };
 const installed=install({apply,base,getTaskXml,getRoot:lockedRoot,
  expectedWorktreeId:verified.rootWorktreeId,...installerOptions});
 return {...installed,audit:result.audit,originMode:verified.mode,
  scheduledEntryName:verified.scheduledEntryName,originVerified:true};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2),baseArg=args.find(v=>v.startsWith('--base='));
 const opts={apply:args.includes('--apply')};if(baseArg)opts.base=baseArg.slice(7);
 const result=runR50PcApply(opts);
 console.log(JSON.stringify(result));
 if(result.decision!=='R46_R45_PC_INSTALLED_NO_FORCED_COLLECTION'&&
  result.decision!=='R46_PREFLIGHT_READY_NO_CHANGES')process.exitCode=2;
}
