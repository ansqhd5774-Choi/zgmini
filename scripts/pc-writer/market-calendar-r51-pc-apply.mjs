// Guarded R45 install that follows the first scheduled VBS Core chain.
// Unresolved chains produce redacted read-only shape data, no source writes.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {resolveR51CoreOrigin} from './market-calendar-r51-core-origin.mjs';
import {runR46PcApply} from './market-calendar-r46-pc-apply.mjs';

const taskXml=()=>{
 const bytes=execFileSync('schtasks.exe',['/Query','/TN','ZGMINI-PC-Local-Core','/XML'],
  {windowsHide:true,timeout:12000,maxBuffer:262144,stdio:['ignore','pipe','ignore']});
 if(bytes.length>262144)throw Error('TASK_TOO_LARGE');
 return ((bytes[0]===255&&bytes[1]===254||bytes.includes(0))?
  bytes.toString('utf16le'):bytes.toString('utf8')).replace(/^\ufeff/,'');
};
export function runR51PcApply({
 apply=false,base=process.env.ZGMINI_PC_HOME||String.raw`E:\ZGmini\data\pc-writer`,
 getTaskXml=taskXml,resolveOrigin=resolveR51CoreOrigin,install=runR46PcApply,
 ...installOptions
}={}){
 const output={audit:'MARKET_CALENDAR_R51_PC_R45_INSTALL',at:new Date().toISOString(),
  mode:apply?'APPLY':'PREFLIGHT',decision:'R51_UNVERIFIED_STOP',
  sourceWrites:0,changedFiles:[],backupCreated:false,forcedCollection:false,
  providerCallsAdded:0,published:false,dbWrites:0,schedulerChanged:false,
  gitPushed:false,newSource:null,worktreeId:null};
 let state;
 try{state=resolveOrigin(getTaskXml());}
 catch{output.decision='R51_TASK_READ_FAILED_STOP';return output;}
 if(state?.status!=='R51_SCHEDULED_CORE_ORIGIN_RESOLVED'||!state.root||!state.rootWorktreeId){
  output.decision=String(state?.status??'R51_ORIGIN_MISSING')+'_STOP';
  output.outerHashMatched=state?.outerHashMatched??false;
  output.archiveEntrypointRecognized=state?.archiveEntrypointRecognized??false;
  output.coreVbsCount=state?.coreVbsCount??0;
  output.coreChain=state?.coreChain??[];
  return output;
 }
 output.worktreeId=state.rootWorktreeId;
 if(fs.existsSync(path.join(base,'quota-runner.lock'))){
  output.decision='R51_QUOTA_RUNNER_ACTIVE_STOP';return output;
 }
 const recheck=xml=>{
  const fresh=resolveOrigin(xml);
  return fresh?.status==='R51_SCHEDULED_CORE_ORIGIN_RESOLVED'?fresh.root:null;
 };
 const installed=install({apply,base,getTaskXml,getRoot:recheck,
  expectedWorktreeId:state.rootWorktreeId,...installOptions});
 return {...installed,audit:output.audit,originMode:state.mode,
  worktreeId:state.rootWorktreeId,coreVbsCount:state.coreVbsCount,
  sourceChainVerified:true};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2),baseArg=args.find(x=>x.startsWith('--base='));
 const opts={apply:args.includes('--apply')};if(baseArg)opts.base=baseArg.slice(7);
 const result=runR51PcApply(opts);
 console.log(JSON.stringify(result));
 if(result.decision!=='R46_R45_PC_INSTALLED_NO_FORCED_COLLECTION'&&
  result.decision!=='R46_PREFLIGHT_READY_NO_CHANGES')process.exitCode=2;
}
