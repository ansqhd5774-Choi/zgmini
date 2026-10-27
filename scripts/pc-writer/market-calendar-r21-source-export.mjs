// R21 recovery: read-only export of the exact scheduled PC Core collector.
// No source/config/git/task/DB changes, no collection, no lock acquisition.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {coreRootFromTask,worktreeIdentity} from './market-calendar-r19-bea-apply.mjs';

const APPROVED_SOURCE='97a38c7cdfbb7e0d30eaeacea27b9605bbfa2b3b';
const APPROVED_R20_PARSER='20d6c99cc7621e08c06598e51f4c9dc8a6f945952905351287b46d2c65a1551c';
const APPROVED_WORKTREE_ID='d0a4b3cb8b95';
const COLLECTOR_REL='scripts/pc-writer/release-calendar.mjs';
const sha256=value=>createHash('sha256').update(value).digest('hex');
const hex40=value=>typeof value==='string'&&/^[0-9a-f]{40}$/i.test(value)?value.toLowerCase():null;
const git=(root,args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',windowsHide:true,timeout:25000,stdio:['ignore','pipe','pipe']}).trim();
const taskXml=()=>{
 const bytes=execFileSync('schtasks.exe',['/Query','/TN','ZGMINI-PC-Local-Core','/XML'],{
  windowsHide:true,timeout:10000,stdio:['ignore','pipe','ignore']});
 return (bytes[0]===255&&bytes[1]===254||bytes.includes(0)?bytes.toString('utf16le'):bytes.toString('utf8')).replace(/^\ufeff/,'');
};

export function runR21SourceExport({
 reportPath,
 dataRoot=process.env.ZGMINI_PC_HOME||String.raw`E:\ZGmini\data\pc-writer`,
 getTaskXml=taskXml,getCoreRoot=coreRootFromTask,gitCall=git,
 approvedSource=APPROVED_SOURCE,expectedWorktreeId=APPROVED_WORKTREE_ID,
 expectedParserSha256=APPROVED_R20_PARSER,
}={}){
 const output={audit:'MARKET_CALENDAR_R21_PC_SOURCE_EXPORT',at:new Date().toISOString(),
  mode:'READ_ONLY',previousSource:approvedSource,readOnly:true,
  coreSourceChanged:false,configChanged:false,schedulerChanged:false,
  dbChanged:false,collectionExecuted:false,gitPushed:false,
  exportedFile:null,collectorSourceBase64:null,decision:'PREFLIGHT_NOT_COMPLETE_STOP'};
 try{
  if(!reportPath||typeof reportPath!=='string')throw Error('MISSING_REPORT_PATH');
  const root=getCoreRoot(getTaskXml());
  output.worktreeId=root?worktreeIdentity(root):null;
  if(!root||output.worktreeId!==expectedWorktreeId){output.decision='CORE_WORKTREE_MISMATCH_STOP';return output;}
  output.pcHead=hex40(gitCall(root,['rev-parse','HEAD']));
  if(output.pcHead!==approvedSource){output.decision='PC_HEAD_CHANGED_STOP';return output;}
  const config=JSON.parse(fs.readFileSync(path.join(dataRoot,'config.json'),'utf8'));
  if(config?.source!==approvedSource||config?.collectionTarget!=='pc'||config?.enabled!==true){
   output.decision='PC_CONFIG_CHANGED_STOP';return output;
  }
  output.installedParserSha256=sha256(fs.readFileSync(path.join(root,'lib','release-calendar.mjs')));
  if(output.installedParserSha256!==expectedParserSha256){output.decision='R20_PARSER_MISMATCH_STOP';return output;}
  const collector=path.join(root,'scripts','pc-writer','release-calendar.mjs');
  const stat=fs.statSync(collector);
  if(!stat.isFile()||stat.size===0||stat.size>4*1024*1024){output.decision='COLLECTOR_INVALID_SIZE_STOP';return output;}
  const content=fs.readFileSync(collector);
  output.pcCollectorSha256=sha256(content);
  const trackedBlob=hex40(gitCall(root,['rev-parse',`HEAD:${COLLECTOR_REL}`]));
  const currentBlob=hex40(gitCall(root,['hash-object',COLLECTOR_REL]));
  output.collectorMatchesTrackedHead=Boolean(trackedBlob&&currentBlob&&trackedBlob===currentBlob);
  if(!fs.readFileSync(collector).equals(content)){output.decision='COLLECTOR_CHANGED_DURING_EXPORT_STOP';return output;}
  // One uploadable TXT is the entire handoff. No companion .mjs file to locate.
  output.collectorSourceBase64=content.toString('base64');
  if(sha256(Buffer.from(output.collectorSourceBase64,'base64'))!==output.pcCollectorSha256){
   output.collectorSourceBase64=null;
   output.decision='SOURCE_ENCODING_MISMATCH_STOP';return output;
  }
  output.decision=output.collectorMatchesTrackedHead?'PC_COLLECTOR_EMBEDDED_READONLY':'PC_COLLECTOR_EMBEDDED_WITH_TRACKED_DRIFT';
 }catch(error){
  output.decision='READ_ONLY_EXPORT_FAILED_STOP';
  output.errorCode=typeof error?.code==='string'?error.code:'LOCAL_READ_OR_EXPORT_ERROR';
 }
 return output;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const report=process.argv[2];
 if(!report){console.error('REPORT_PATH_REQUIRED');process.exitCode=2;}
 else try{
  const outcome=runR21SourceExport({reportPath:report});
  fs.writeFileSync(report,JSON.stringify(outcome,null,2)+'\n','utf8');
  console.log(`R21_SOURCE_EXPORT=${outcome.decision}`);
  console.log(`RESULT_FILE=${report}`);
  if(!outcome.collectorSourceBase64)process.exitCode=1;
 }catch{console.error('EXPORT_REPORT_WRITE_FAILED');process.exitCode=2;}
}
