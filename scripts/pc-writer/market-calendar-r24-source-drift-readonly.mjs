// R24 source mismatch forensic: read-only. No install, collection, publish,
// schedule, config, SQLite, Git commit/push, lock acquisition or mutation.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {coreRootFromTask,worktreeIdentity} from './market-calendar-r19-bea-apply.mjs';

const EXPECTED_R23_SOURCE='8ff396217c9f84578b37c9d422381644c2b8f0e8';
const EXPECTED_WORKTREE='d0a4b3cb8b95';
const protectedPaths=['lib','worker','scripts/pc-writer','package.json','package-lock.json'];
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const isSha=value=>/^[a-f0-9]{40}$/i.test(value??'');
const git=(root,args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',windowsHide:true,timeout:15000,
 stdio:['ignore','pipe','pipe']}).trim();
const taskXml=()=>{
 const raw=execFileSync('schtasks.exe',['/Query','/TN','ZGMINI-PC-Local-Core','/XML'],
  {windowsHide:true,timeout:10000,stdio:['ignore','pipe','ignore']});
 return (raw[0]===255&&raw[1]===254||raw.includes(0)?raw.toString('utf16le'):raw.toString('utf8')).replace(/^\ufeff/,'');
};

export function runR24SourceDriftReadOnly({
 now=Date.now(),dataRoot=process.env.ZGMINI_PC_HOME||String.raw`E:\ZGmini\data\pc-writer`,
 getTaskXml=taskXml,getCoreRoot=coreRootFromTask,gitCall=git,
 expectedWorktreeId=EXPECTED_WORKTREE,
}={}){
 const report={audit:'MARKET_CALENDAR_R24_SOURCE_DRIFT_READONLY',at:new Date(now).toISOString(),
  mode:'READ_ONLY_DIAGNOSIS',expectedR23Source:EXPECTED_R23_SOURCE,
  expectedWorktreeId,coreSourceChanged:false,configChanged:false,
  dbChanged:false,schedulerChanged:false,publisherExecuted:false,
  collectionExecuted:false,gitPushed:false,lockTaken:false,
  decision:'R24_DRIFT_DIAGNOSIS_UNAVAILABLE'};
 try{
  const root=getCoreRoot(getTaskXml());
  report.worktreeId=root?worktreeIdentity(root):null;
  if(!root||report.worktreeId!==expectedWorktreeId){
   report.decision='PC_CORE_IDENTITY_CHANGED_STOP';return report;
  }
  const head=gitCall(root,['rev-parse','HEAD']);
  if(!isSha(head))throw Error('INVALID_HEAD');
  report.observedHead=head;
  report.headMatchesR23=head===EXPECTED_R23_SOURCE;
  const config=JSON.parse(fs.readFileSync(path.join(dataRoot,'config.json'),'utf8'));
  report.configSource=isSha(config.source)?config.source:null;
  report.configEnabled=config.enabled===true;
  report.collectionTarget=config.collectionTarget==='pc'?'pc':'OTHER';
  report.configSourceMatchesHead=report.configSource===head;
  report.cycleLockPresent=fs.existsSync(path.join(dataRoot,'local-cycle.lock'));
  report.installedFileSha256={};
  for(const file of ['lib/release-calendar.mjs','lib/eia-calendar.mjs',
   'lib/usda-calendar.mjs','scripts/pc-writer/release-calendar.mjs']){
   const full=path.join(root,...file.split('/'));
   report.installedFileSha256[file]=fs.existsSync(full)?sha(fs.readFileSync(full)):null;
  }
  const diff=gitCall(root,['diff','--name-only','HEAD','--',...protectedPaths]);
  report.protectedTrackedDirty=diff.length>0;
  report.dirtyTrackedPaths=diff?diff.split(/\r?\n/).slice(0,25):[];
  try{
   gitCall(root,['cat-file','-e',EXPECTED_R23_SOURCE+'^{commit}']);
   report.r23ObjectAvailable=true;
   try{
    gitCall(root,['merge-base','--is-ancestor',EXPECTED_R23_SOURCE,head]);
    report.r23IsAncestor=true;
   }catch{report.r23IsAncestor=false;}
  }catch{
   report.r23ObjectAvailable=false;
   report.r23IsAncestor=null;
  }
  try{
   const delta=gitCall(root,['diff','--name-only',EXPECTED_R23_SOURCE,head,'--',...protectedPaths]);
   report.protectedFilesChangedSinceR23=delta?delta.split(/\r?\n/).slice(0,40):[];
  }catch{report.protectedFilesChangedSinceR23=null;}
  report.decision='R24_SOURCE_DRIFT_READONLY_COMPLETE';
 }catch{
  report.decision='R24_DRIFT_READ_FAILED_STOP';
 }
 return report;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const reportPath=process.argv[2];
 if(!reportPath){console.error('RESULT_FILE_ARGUMENT_REQUIRED');process.exitCode=2;}
 else try{
  const result=runR24SourceDriftReadOnly();
  fs.writeFileSync(reportPath,JSON.stringify(result,null,2)+'\n','utf8');
  console.log(result.decision);
  console.log(`RESULT_FILE=${reportPath}`);
  if(result.decision!=='R24_SOURCE_DRIFT_READONLY_COMPLETE')process.exitCode=1;
 }catch{console.error('R24_DRIFT_RESULT_WRITE_FAILED');process.exitCode=2;}
}
