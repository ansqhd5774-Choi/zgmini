// R48: R45 PC install via the CURRENT scheduled Core wrapper, not a fixed
// historical R38 wrapper marker or C:/E: checkout assumption.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {runR46PcApply} from './market-calendar-r46-pc-apply.mjs';
import {resolveR48CoreOrigin} from './market-calendar-r48-core-origin.mjs';

const taskXml=()=>{
 const raw=execFileSync('schtasks.exe',['/Query','/TN','ZGMINI-PC-Local-Core','/XML'],
  {windowsHide:true,timeout:12000,maxBuffer:262144,stdio:['ignore','pipe','ignore']});
 if(raw.byteLength>262144)throw Error('TASK_XML_SIZE_LIMIT');
 return ((raw[0]===255&&raw[1]===254||raw.includes(0))?raw.toString('utf16le'):
  raw.toString('utf8')).replace(/^\ufeff/,'');
};

export function runR48PcApply({
 apply=false,base=process.env.ZGMINI_PC_HOME||String.raw`E:\ZGmini\data\pc-writer`,
 getTaskXml=taskXml,resolveOrigin=resolveR48CoreOrigin,install=runR46PcApply,
 ...installerOptions
}={}){
 const initial={audit:'MARKET_CALENDAR_R48_PC_R45_INSTALL',at:new Date().toISOString(),
  mode:apply?'APPLY':'PREFLIGHT',decision:'R48_PREFLIGHT_INCOMPLETE_STOP',
  sourceWrites:0,changedFiles:[],backupCreated:false,providerCallsAdded:0,
  forcedCollection:false,published:false,dbWrites:0,schedulerChanged:false,
  gitPushed:false,newSource:null,originMode:null,worktreeId:null};
 let verified;
 try{verified=resolveOrigin(getTaskXml());}
 catch{initial.decision='R48_SCHEDULED_TASK_READ_FAILED_STOP';return initial;}
 if(verified?.status!=='R48_SCHEDULED_ORIGIN_RESOLVED'||!verified.root||!verified.rootWorktreeId){
  initial.decision='R48_ORIGIN_'+String(verified?.status??'UNKNOWN')+'_STOP';
  initial.originMode=verified?.mode??null;
  initial.wrapperScriptReferences=verified?.wrapperScriptReferences??0;
  initial.originFileCandidates=verified?.originFileCandidates??0;
  initial.originScriptReferences=verified?.originScriptReferences??0;
  return initial;
 }
 initial.originMode=verified.mode;initial.worktreeId=verified.rootWorktreeId;
 // quota-runner owns the whole collection cycle; respect its outer lock too.
 if(fs.existsSync(path.join(base,'quota-runner.lock'))){
  initial.decision='R48_QUOTA_RUNNER_ACTIVE_STOP';return initial;
 }
 const findRoot=xml=>{
  const current=resolveOrigin(xml);
  if(current?.status!=='R48_SCHEDULED_ORIGIN_RESOLVED')return null;
  return current.root;
 };
 const r=install({apply,base,getTaskXml,getRoot:findRoot,
  expectedWorktreeId:verified.rootWorktreeId,...installerOptions});
 return {...r,audit:initial.audit,originMode:verified.mode,
  originVerified:true};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2),baseArg=args.find(x=>x.startsWith('--base='));
 const options={apply:args.includes('--apply')};if(baseArg)options.base=baseArg.slice(7);
 const result=runR48PcApply(options);
 console.log(JSON.stringify(result));
 if(result.decision!=='R46_R45_PC_INSTALLED_NO_FORCED_COLLECTION'&&
  result.decision!=='R46_PREFLIGHT_READY_NO_CHANGES')process.exitCode=2;
}
