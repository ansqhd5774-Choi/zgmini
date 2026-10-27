// R17: explicitly approved BLS-only local source transition.
// A guarded operation: exact R38 origin, Git parent, clean protected paths,
// matching candidate hash, a single-file commit and config.source alignment.
// Never collects, publishes, changes scheduled tasks, removes user history or pushes Git.
import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {parseScheduledLauncher} from './market-calendar-r13-runtime-lineage.mjs';
import {extractStaticEntrypoints} from './market-calendar-r14-targeted-runtime.mjs';
import {extractLiteralAssignment,pathIdentity,runR16} from './market-calendar-r16-origin-lineage.mjs';

const APPROVED='7ac573fcf977c5fab97f2aea44c12555fd86dd9f';
const CANDIDATE='54c737218a40fec6482b469f7962fe5e8cd7c040705d58072396cffcdcb74c08';
const BASELINE='f084e2a360b544257bb44a60b97875627c7ca371';
const R14_ID='d0a4b3cb8b95';
const sha=value=>typeof value==='string'&&/^[a-f0-9]{40}$/i.test(value)?value.toLowerCase():null;
const hash=value=>createHash('sha256').update(value).digest('hex');
const json=file=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return null;}};
const cmd=(root,args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',windowsHide:true,timeout:25000,stdio:['ignore','pipe','pipe']}).trim();
const queryTask=()=>{try{
 const b=execFileSync('schtasks.exe',['/Query','/TN','ZGMINI-PC-Local-Core','/XML'],{windowsHide:true,timeout:10000,stdio:['ignore','pipe','ignore']});
 return (b[0]===255&&b[1]===254||b.includes(0)?b.toString('utf16le'):b.toString('utf8')).replace(/^\ufeff/,'');
}catch{return null;}};
const winAbs=value=>/^[a-z]:[\\/]/i.test(value);
const rooted=entry=>{const impl=winAbs(entry)?path.win32:path;return impl.resolve(entry,'..','..','..');};
const protectedFiles=['lib','worker','scripts/pc-writer','package.json','package-lock.json'];
const reportBase=(apply)=>({audit:'MARKET_CALENDAR_R17_BLS_APPLY',at:new Date().toISOString(),
 mode:apply?'EXPLICIT_APPLY':'PREFLIGHT',policy:'NO_TASK_CHANGE_NO_DB_CHANGE_NO_PUBLISH_NO_COLLECT_NO_GIT_PUSH_NO_MAIN_CHANGE',
 approvedSource:APPROVED,expectedCandidateSha256:CANDIDATE,changedFiles:[],backupCreated:false,newSource:null,decision:'PREFLIGHT_INCOMPLETE_STOP'});

export function runR17({
 apply=false,
 dataRoot=process.env.ZGMINI_PC_HOME||String.raw`E:\ZGmini\data\pc-writer`,
 candidatePath=fileURLToPath(new URL('../../staging/market-calendar/r11-bls/lib/release-calendar.mjs',import.meta.url)),
 getTaskXml=queryTask,gitCall=cmd,getLineage=runR16,approvedSource=APPROVED,expectedWorktreeId=R14_ID,
 expectedBaselineBlob=BASELINE,expectedCandidateSha256=CANDIDATE
}={}){
 const output={...reportBase(apply),approvedSource,expectedCandidateSha256};
 const lineage=getLineage({dataRoot,getTaskXml,gitCall,expectedWorktreeId});
 output.lineage={decision:lineage.decision,rootId:lineage.origin.rootId,source:lineage.origin.head,parserBlob:lineage.origin.parserBlob};
 if(lineage.decision!=='ORIGIN_RUNTIME_ALIGNED_BLS_NEXT_STAGE_READY_NO_CHANGES_MADE'||lineage.origin.head!==approvedSource){output.decision='R16_CURRENT_LINEAGE_NOT_APPROVED_STOP';return output;}
 if(lineage.origin.parserBlob!==expectedBaselineBlob){output.decision='BASELINE_PARSER_BLOB_CHANGED_STOP';return output;}
 let candidate;
 try{candidate=fs.readFileSync(candidatePath);}catch{output.decision='STAGED_BLS_FILE_NOT_FOUND_STOP';return output;}
 output.candidateSha256=hash(candidate);
 if(output.candidateSha256!==expectedCandidateSha256){output.decision='STAGED_BLS_CANDIDATE_MISMATCH_STOP';return output;}
 const xml=getTaskXml();
 const wrapperFile=parseScheduledLauncher(xml);
 let wrapper=null;
 try{if(wrapperFile)wrapper=fs.readFileSync(wrapperFile,'utf8');}catch{}
 const origin=extractLiteralAssignment(wrapper,'origin');
 let scripts=[];
 try{if(origin)scripts=extractStaticEntrypoints(fs.readFileSync(origin,'utf8'));}catch{}
 if(scripts.length!==1){output.decision='EXACT_ORIGIN_NODE_SCRIPT_UNRESOLVED_STOP';return output;}
 const root=rooted(scripts[0]);
 if(pathIdentity(root)!==expectedWorktreeId){output.decision='ORIGIN_RUNTIME_ROOT_CHANGED_STOP';return output;}
 const parser=path.join(root,'lib','release-calendar.mjs');
 const configFile=path.join(dataRoot,'config.json');
 const config=json(configFile);
 if(!config||config.source!==approvedSource||config.enabled!==true||config.collectionTarget!=='pc'){
  output.decision='PC_CONFIG_APPROVAL_CHANGED_STOP';return output;
 }
 let original;
 try{original=fs.readFileSync(parser);}catch{output.decision='PARSER_MISSING_STOP';return output;}
 if(gitCall(root,['hash-object','lib/release-calendar.mjs'])!==expectedBaselineBlob||original.equals(candidate)){
  output.decision='PARSER_BASELINE_CHANGED_OR_IDENTICAL_STOP';return output;
 }
 const startHead=sha(gitCall(root,['rev-parse','HEAD']));
 if(startHead!==approvedSource){output.decision='GIT_HEAD_CHANGED_STOP';return output;}
 const existingDiff=gitCall(root,['diff','--name-only','HEAD','--',...protectedFiles]);
 if(existingDiff!==''){output.decision='PROTECTED_WORKTREE_ALREADY_DIRTY_STOP';return output;}
 try{gitCall(root,['var','GIT_AUTHOR_IDENT']);gitCall(root,['var','GIT_COMMITTER_IDENT']);}
 catch{output.decision='GIT_COMMIT_IDENTITY_MISSING_STOP';return output;}
 output.changedFiles=['lib/release-calendar.mjs'];
 if(!apply){output.decision='BLS_SINGLE_FILE_PREFLIGHT_READY_NO_CHANGES_MADE';return output;}

 // The core cycle observes this lock and exits without publication while the
 // Git commit and config.source are transitioned. Never touch a pre-existing lock.
 const lockFile=path.join(dataRoot,'local-cycle.lock');
 let lockOwned=false,backupParser=null,commitCompleted=false,configCompleted=false;
 try{
  const fd=fs.openSync(lockFile,'wx');lockOwned=true;
  try{fs.writeFileSync(fd,JSON.stringify({pid:process.pid,at:Date.now(),purpose:'market-calendar-r17-source-transition'}));}finally{fs.closeSync(fd);}
  // Race guard: an operator or another task may have changed the repo before lock acquisition.
  const lockedLineage=getLineage({dataRoot,getTaskXml,gitCall,expectedWorktreeId});
  if(sha(gitCall(root,['rev-parse','HEAD']))!==approvedSource||gitCall(root,['diff','--name-only','HEAD','--',...protectedFiles])!==''||json(configFile)?.source!==approvedSource||lockedLineage.decision!=='ORIGIN_RUNTIME_ALIGNED_BLS_NEXT_STAGE_READY_NO_CHANGES_MADE'){
   output.decision='STATE_CHANGED_AFTER_LOCK_STOP';return output;
  }
  const backupDir=path.join(dataRoot,'market-calendar-r17-backups','r17-'+new Date().toISOString().replace(/[-:.TZ]/g,'')+'-'+randomUUID().slice(0,8));
  fs.mkdirSync(backupDir,{recursive:true});
  backupParser=path.join(backupDir,'release-calendar.mjs');
  fs.copyFileSync(parser,backupParser);
  fs.copyFileSync(configFile,path.join(backupDir,'config.json'));
  output.backupCreated=true;
  output.backupId=path.basename(backupDir);
  fs.copyFileSync(candidatePath,parser);
  if(hash(fs.readFileSync(parser))!==expectedCandidateSha256)throw new Error('PARSER_COPY_HASH_MISMATCH');
  const stagedDiff=gitCall(root,['diff','--name-only','HEAD','--',...protectedFiles]);
  if(stagedDiff.replaceAll('\\','/').trim()!=='lib/release-calendar.mjs')throw new Error('CHANGED_PROTECTED_FILES_NOT_EXACTLY_ONE');
  gitCall(root,['commit','--only','-m','feat(market-calendar): expand BLS releases only','--','lib/release-calendar.mjs']);
  commitCompleted=true;
  const next=sha(gitCall(root,['rev-parse','HEAD']));
  const parent=sha(gitCall(root,['rev-parse','HEAD^']));
  const changes=gitCall(root,['diff','--name-only',approvedSource,next,'--']).replaceAll('\\','/').trim();
  const newBlob=gitCall(root,['hash-object','lib/release-calendar.mjs']);
  output.newSource=next;
  if(parent!==approvedSource||changes!=='lib/release-calendar.mjs'||newBlob!==gitCall(root,['rev-parse','HEAD:lib/release-calendar.mjs'])||hash(fs.readFileSync(parser))!==expectedCandidateSha256){
   throw new Error('NEW_COMMIT_NOT_BLS_SINGLE_FILE');
  }
  // Commit first: until config.source is advanced, the publication guard blocks
  // the changed lib contract. Existing verified publication data remains intact.
  const nextConfig={...config,source:next};
  const temporary=path.join(backupDir,'config-new.json');
  fs.writeFileSync(temporary,JSON.stringify(nextConfig,null,2)+'\n',{flag:'wx'});
  fs.renameSync(temporary,configFile);
  configCompleted=true;
  if(json(configFile)?.source!==next||sha(gitCall(root,['rev-parse','HEAD']))!==next){
   throw new Error('POST_INSTALL_CONFIG_OR_HEAD_MISMATCH');
  }
  output.decision='BLS_INSTALLED_WAIT_NEXT_REGULAR_VERIFIED_CYCLE';
  output.gitPushed=false;
  output.publisherExecuted=false;
 }catch(error){
  output.decision=commitCompleted?'PARTIAL_SOURCE_COMMIT_MANUAL_RECOVERY_REQUIRED_STOP':'BLS_INSTALL_ABORTED_OR_RESTORED_STOP';
  output.errorCode=typeof error?.message==='string'&&/^[A-Z_]{5,70}$/.test(error.message)?error.message:'LOCAL_OPERATION_FAILED';
  if(!commitCompleted&&backupParser){try{fs.copyFileSync(backupParser,parser);}catch{output.decision='PARSER_RESTORE_FAILED_MANUAL_RECOVERY_REQUIRED_STOP';}}
  if(configCompleted)output.configSourceChanged=true;
 }finally{
  if(lockOwned){try{fs.unlinkSync(lockFile);}catch{output.lockReleaseFailed=true;}}
 }
 return output;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const report=process.argv[2],apply=process.argv.includes('--apply');
 if(!report){console.error('MISSING_REPORT_PATH');process.exitCode=2;}
 else try{const result=runR17({apply});fs.writeFileSync(report,JSON.stringify(result,null,2)+'\n','utf8');console.log('MARKET_CALENDAR_R17_RESULT_WRITTEN');}
 catch{console.error('MARKET_CALENDAR_R17_UNEXPECTED_FAILURE');process.exitCode=2;}
}
