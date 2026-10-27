// R19: BEA-only parser installation into the already approved PC Core checkout.
// Does not collect, publish, change the schedule, push Git or verify live data.
import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const BLS_SOURCE='e778f58d056e45c515fac95b4ed48295f6a3ed1a';
const BLS_PARSER_SHA256='54c737218a40fec6482b469f7962fe5e8cd7c040705d58072396cffcdcb74c08';
const BEA_PARSER_SHA256='9204ab733b45ad3f01a1b8a0754ce8a3f3e3d5feb4245cd01a081a5da838511f';
const CORE_WORKTREE_ID='d0a4b3cb8b95';
const protection=['lib','worker','scripts/pc-writer','package.json','package-lock.json'];
const hex=v=>typeof v==='string'&&/^[0-9a-f]{40}$/i.test(v)?v.toLowerCase():null;
const digest=v=>createHash('sha256').update(v).digest('hex');
const json=file=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return null;}};
const normalized=p=>path.normalize(p).replaceAll('\\','/').toLowerCase();
export const worktreeIdentity=p=>digest(normalized(p)).slice(0,12);
const windowsPath=p=>/^[a-z]:[\\/]/i.test(p);
const absolute=p=>windowsPath(p)?path.win32.resolve(p):path.resolve(p);
const rooted=p=>(windowsPath(p)?path.win32:path).resolve(p,'..','..','..');
const git=(root,args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',windowsHide:true,timeout:25000,stdio:['ignore','pipe','pipe']}).trim();
const taskXml=()=>{
 const raw=execFileSync('schtasks.exe',['/Query','/TN','ZGMINI-PC-Local-Core','/XML'],{windowsHide:true,timeout:10000,stdio:['ignore','pipe','ignore']});
 return (raw[0]===255&&raw[1]===254||raw.includes(0)?raw.toString('utf16le'):raw.toString('utf8')).replace(/^\ufeff/,'');
};
export function coreRootFromTask(xml){
 if(typeof xml!=='string')return null;
 const fields=[...xml.matchAll(/<Arguments(?:\s+[^>]*)?>([\s\S]*?)<\/Arguments>/gi)];
 if(fields.length!==1)return null;
 const args=fields[0][1].replace(/&quot;|&#34;/gi,'"').replace(/&amp;/gi,'&');
 const matches=[...args.matchAll(/"([^"\r\n]*[\\/]run-local-core\.vbs)"/gi)];
 if(matches.length!==1)return null;
 const wrapperFile=absolute(matches[0][1]);
 if(!path.isAbsolute(wrapperFile)&&!windowsPath(wrapperFile))return null;
 let wrapper;
 try{
  if(fs.statSync(wrapperFile).size>65536)return null;
  wrapper=fs.readFileSync(wrapperFile,'utf8');
 }catch{return null;}
 if(!wrapper.includes('ZGMINI_R38_WRAPPER_V1'))return null;
 const origins=[...wrapper.matchAll(/^[ \t]*origin[ \t]*=[ \t]*"((?:[^"\r\n]|"")*)"[ \t]*(?:\x27[^\r\n]*)?$/gim)];
 if(origins.length!==1)return null;
 const originFile=absolute(origins[0][1].replaceAll('""','"'));
 let source;
 try{
  if(fs.statSync(originFile).size>65536)return null;
  source=fs.readFileSync(originFile,'utf8');
 }catch{return null;}
 const re=/((?:[a-z]:[\\/]|\/)[^"'\r\n<>]*?[\\/]scripts[\\/]pc-writer[\\/](?:local-cycle|quota-runner|run-local|collect-local)\.mjs)/gi;
 const entries=[...new Map([...source.matchAll(re)].map(m=>{const entry=absolute(m[1].trim());return [normalized(entry),entry];})).values()];
 if(entries.length!==1)return null;
 if(!/[\\/]scripts[\\/]pc-writer[\\/][^\\/]+\.mjs$/i.test(entries[0]))return null;
 return rooted(entries[0]);
}

export function runR19({
 apply=false,
 dataRoot=process.env.ZGMINI_PC_HOME||String.raw`E:\ZGmini\data\pc-writer`,
 candidatePath=fileURLToPath(new URL('../../staging/market-calendar/r19-bea/lib/release-calendar.mjs',import.meta.url)),
 getTaskXml=taskXml,gitCall=git,
 approvedSource=BLS_SOURCE,expectedWorktreeId=CORE_WORKTREE_ID,
 expectedBaselineSha256=BLS_PARSER_SHA256,expectedCandidateSha256=BEA_PARSER_SHA256,
 getCoreRoot=coreRootFromTask,
}={}){
 const output={audit:'MARKET_CALENDAR_R19_BEA_APPLY',at:new Date().toISOString(),
  mode:apply?'EXPLICIT_APPLY':'PREFLIGHT',
  policy:'BEA_ONLY_NO_COLLECT_NO_PUBLISH_NO_LIVE_MONITOR_NO_TASK_CHANGE_NO_DB_CHANGE_NO_GIT_PUSH',
  previousSource:approvedSource,expectedCandidateSha256,changedFiles:[],backupCreated:false,
  gitPushed:false,publisherExecuted:false,liveMonitored:false,newSource:null,decision:'BEA_PREFLIGHT_INCOMPLETE_STOP'};
 let candidate,root,parser,configFile,config,configRaw,original;
 try{
  candidate=fs.readFileSync(candidatePath);
  output.candidateSha256=digest(candidate);
  if(output.candidateSha256!==expectedCandidateSha256){output.decision='BEA_CANDIDATE_HASH_MISMATCH_STOP';return output;}
  root=getCoreRoot(getTaskXml());
  output.worktreeId=root?worktreeIdentity(root):null;
  if(!root||output.worktreeId!==expectedWorktreeId){output.decision='EXACT_CORE_ORIGIN_CHANGED_STOP';return output;}
  const head=hex(gitCall(root,['rev-parse','HEAD']));
  if(head!==approvedSource){output.decision='PC_SOURCE_CHANGED_STOP';return output;}
  configFile=path.join(dataRoot,'config.json');
  configRaw=fs.readFileSync(configFile);
  config=json(configFile);
  if(config?.source!==approvedSource||config?.enabled!==true||config?.collectionTarget!=='pc'){
   output.decision='PC_CONFIG_SOURCE_CHANGED_STOP';return output;
  }
  parser=path.join(root,'lib','release-calendar.mjs');
  original=fs.readFileSync(parser);
  output.baselineSha256=digest(original);
  if(output.baselineSha256!==expectedBaselineSha256||
    hex(gitCall(root,['rev-parse','HEAD:lib/release-calendar.mjs']))!==hex(gitCall(root,['hash-object','lib/release-calendar.mjs']))){
   output.decision='INSTALLED_BLS_PARSER_CHANGED_STOP';return output;
  }
  if(gitCall(root,['diff','--name-only','HEAD','--',...protection])!==''){
   output.decision='PROTECTED_SOURCE_ALREADY_DIRTY_STOP';return output;
  }
  gitCall(root,['var','GIT_AUTHOR_IDENT']);gitCall(root,['var','GIT_COMMITTER_IDENT']);
  output.changedFiles=['lib/release-calendar.mjs'];
  if(!apply){output.decision='BEA_SINGLE_FILE_PREFLIGHT_READY_NO_CHANGES_MADE';return output;}
 }catch{output.decision='BEA_PREFLIGHT_READ_FAILED_STOP';return output;}

 const lockFile=path.join(dataRoot,'local-cycle.lock');
 let ownLock=false,backupParser=null,backupVerified=false,parserModified=false,committed=false;
 try{
  output.phase='CORE_LOCK_ACQUIRE';
  const fd=fs.openSync(lockFile,'wx');ownLock=true;
  try{fs.writeFileSync(fd,JSON.stringify({pid:process.pid,at:Date.now(),purpose:'market-calendar-r19-bea-source-transition'}));}finally{fs.closeSync(fd);}
  output.phase='LOCKED_SOURCE_RECHECK';
  const currentRoot=getCoreRoot(getTaskXml());
  if(!currentRoot||normalized(currentRoot)!==normalized(root)||worktreeIdentity(currentRoot)!==expectedWorktreeId||
     hex(gitCall(root,['rev-parse','HEAD']))!==approvedSource||
     gitCall(root,['diff','--name-only','HEAD','--',...protection])!==''||
     digest(fs.readFileSync(parser))!==expectedBaselineSha256||
     !fs.readFileSync(configFile).equals(configRaw)||json(configFile)?.source!==approvedSource){
   output.decision='STATE_CHANGED_AFTER_CORE_LOCK_STOP';return output;
  }
  output.phase='BACKUP_DIRECTORY_CREATE';
  const backupDir=path.join(dataRoot,'market-calendar-r19-backups','r19-'+new Date().toISOString().replace(/[-:.TZ]/g,'')+'-'+randomUUID().slice(0,8));
  fs.mkdirSync(backupDir,{recursive:true});
  backupParser=path.join(backupDir,'release-calendar.mjs');
  output.phase='BACKUP_PARSER';
  fs.copyFileSync(parser,backupParser);
  if(digest(fs.readFileSync(backupParser))!==expectedBaselineSha256)throw Error('BASELINE_BACKUP_HASH_MISMATCH');
  backupVerified=true;
  output.phase='BACKUP_CONFIG';
  fs.copyFileSync(configFile,path.join(backupDir,'config.json'));
  output.backupCreated=true;output.backupId=path.basename(backupDir);
  output.phase='COPY_BEA_PARSER';
  parserModified=true;
  fs.copyFileSync(candidatePath,parser);
  if(digest(fs.readFileSync(parser))!==expectedCandidateSha256)throw Error('BEA_CANDIDATE_COPY_HASH_MISMATCH');
  if(gitCall(root,['diff','--name-only','HEAD','--',...protection]).replaceAll('\\','/').trim()!=='lib/release-calendar.mjs'){
   throw Error('BEA_NOT_EXACTLY_ONE_CHANGED_PROTECTED_FILE');
  }
  output.phase='GIT_SINGLE_FILE_COMMIT';
  gitCall(root,['commit','--only','-m','feat(market-calendar): expand BEA calendar releases only','--','lib/release-calendar.mjs']);
  committed=true;
  const next=hex(gitCall(root,['rev-parse','HEAD']));
  output.newSource=next;
  if(hex(gitCall(root,['rev-parse','HEAD^']))!==approvedSource||
    gitCall(root,['diff','--name-only',approvedSource,next,'--']).replaceAll('\\','/').trim()!=='lib/release-calendar.mjs'||
    digest(fs.readFileSync(parser))!==expectedCandidateSha256){
   throw Error('BEA_COMMIT_PARENT_OR_CONTENT_MISMATCH');
  }
  output.phase='CONFIG_SOURCE_UPDATE';
  if(!fs.readFileSync(configFile).equals(configRaw))throw Error('PC_CONFIG_CHANGED_DURING_INSTALL');
  const nextConfig={...config,source:next};
  const temp=path.join(backupDir,'config-new.json');
  fs.writeFileSync(temp,JSON.stringify(nextConfig,null,2)+'\n',{flag:'wx'});
  fs.renameSync(temp,configFile);
  if(json(configFile)?.source!==next)throw Error('PC_CONFIG_SOURCE_READBACK_FAILED');
  output.phase='INSTALLED';
  output.decision='BEA_INSTALLED_IN_EXISTING_PC_SOURCE_NO_FORCED_COLLECTION';
 }catch(error){
  output.decision=committed?'PARTIAL_BEA_COMMIT_MANUAL_RECOVERY_REQUIRED_STOP':'BEA_INSTALL_ABORTED_OR_RESTORED_STOP';
  const fsError={EEXIST:'CORE_LOCK_ALREADY_EXISTS',EACCES:'FILESYSTEM_ACCESS_DENIED',EPERM:'FILESYSTEM_PERMISSION_DENIED',ENOSPC:'DISK_FULL',ENOENT:'REQUIRED_FILE_DISAPPEARED',EBUSY:'FILE_IN_USE',EROFS:'READ_ONLY_FILESYSTEM'};
  output.errorCode=fsError[error?.code]??(typeof error?.message==='string'&&/^[A-Z_]{5,70}$/.test(error.message)?error.message:'LOCAL_OPERATION_FAILED');
  if(!committed&&parserModified&&backupVerified){
   try{fs.copyFileSync(backupParser,parser);}catch{output.decision='BEA_PARSER_RESTORE_FAILED_MANUAL_RECOVERY_STOP';}
  }
 }finally{
  if(ownLock){try{fs.unlinkSync(lockFile);}catch{output.lockReleaseFailed=true;}}
 }
 return output;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const report=process.argv[2],apply=process.argv.includes('--apply');
 if(!report){console.error('MISSING_REPORT_PATH');process.exitCode=2;}
 else try{
  fs.writeFileSync(report,JSON.stringify(runR19({apply}),null,2)+'\n','utf8');
  console.log('MARKET_CALENDAR_R19_RESULT_WRITTEN');
 }catch{console.error('MARKET_CALENDAR_R19_EXECUTION_ERROR');process.exitCode=2;}
}
