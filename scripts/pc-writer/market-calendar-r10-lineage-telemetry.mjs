// Read-only diagnostic of the task-selected PC project and existing writer ledgers.
// No provider requests, git fetch/checkout, SQLite writes, configuration updates or publication.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const CORE_TASK='ZGMINI-PC-Local-Core';
const safeSha=value=>typeof value==='string'&&/^[a-f0-9]{40}$/i.test(value)?value.toLowerCase():null;
const safeStatus=value=>typeof value==='string'&&/^[A-Z_]{1,64}$/.test(value)?value:null;
const safeTime=value=>typeof value==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(value)?value:null;
const safeWhen=value=>safeTime(value)||(Number.isSafeInteger(value)&&value>0?new Date(value).toISOString():null);
const norm=value=>String(value).replaceAll('/','\\').replace(/\\+$/,'').toLowerCase();
const decodeXml=value=>value.replace(/&(quot|apos|amp|lt|gt);/g,(_,name)=>({quot:'"',apos:"'",amp:'&',lt:'<',gt:'>'})[name]);

function runGit(root,args){
 try{return execFileSync('git',args,{cwd:root,encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','ignore'],timeout:10000,maxBuffer:256000}).trim();}
 catch{return null;}
}

function taskXml(){
 try{
  const bytes=execFileSync('schtasks.exe',['/Query','/TN',CORE_TASK,'/XML'],{windowsHide:true,stdio:['ignore','pipe','ignore'],timeout:12000,maxBuffer:256000});
  return bytes[0]===255&&bytes[1]===254||bytes.includes(0)?bytes.toString('utf16le'):bytes.toString('utf8');
 }catch{return null;}
}

// Matches the source-only protected-file predicate in the historical PC publisher.
export function affectsPublication(file){
 if(file.startsWith('lib/iran-progress/')||file==='worker/iran-progress-public.mjs')return false;
 if(/^(worker\/|lib\/)/.test(file)||/^package(?:-lock)?\.json$/.test(file))return true;
 return file.startsWith('scripts/pc-writer/')&&
  !/(?:^|\/)(?:backfill-|backtest-|inspect-|probe-|check-|verify-|read-)/.test(file)&&!file.endsWith('.test.mjs');
}

export function evaluateLineage({approved,project,ledger,writer}){
 if(!approved||!project)return 'SOURCE_OR_PROJECT_UNRESOLVED_STOP';
 if(!project.sourceObjectPresent||!project.head||!project.diffReadable||!project.statusReadable)return 'SOURCE_COMPARISON_NOT_VERIFIED_STOP';
 if(project.dirtyProtected>0)return 'LOCAL_PROTECTED_EDITS_STOP';
 if(project.protectedChangedCount>0)return 'PROTECTED_SOURCE_DRIFT_STOP';
 if(writer?.mode==='PUBLISH'&&writer?.source&&writer.source!==project.head)return 'WRITER_SOURCE_INCONSISTENT_REVIEW';
 if(ledger?.status==='VERIFIED'&&ledger?.source&&ledger.source!==project.head)return 'LEDGER_SOURCE_INCONSISTENT_REVIEW';
 return 'SOURCE_COMPATIBILITY_ONLY_NO_CHANGE';
}

function readReport(dataRoot,file){
 try{const result=JSON.parse(fs.readFileSync(path.join(dataRoot,file),'utf8'));
  return {
   state:'READ',status:safeStatus(result.status),source:safeSha(result.source),
   at:safeWhen(result.at||result.ranAt),mode:result.mode==='PUBLISH'?'PUBLISH':result.mode==='DRY_RUN'?'DRY_RUN':null,
   error:safeStatus(result.error),
  };
 }catch{return {state:'UNAVAILABLE'};}
}

function inspectProject(root,xml,approved){
 if(!fs.existsSync(path.join(root,'.git'))||
    !fs.existsSync(path.join(root,'lib','release-calendar.mjs'))||
    !fs.existsSync(path.join(root,'scripts','pc-writer','run-local.mjs')))return null;
 const resolved=(()=>{try{return fs.realpathSync.native(root);}catch{return root;}})();
 const related=Boolean(xml)&&(norm(decodeXml(xml)).includes(norm(root))||norm(decodeXml(xml)).includes(norm(resolved)));
 if(!related)return {taskReferenced:false};
 const head=safeSha(runGit(root,['rev-parse','HEAD']));
 const sourceObjectPresent=Boolean(approved)&&runGit(root,['cat-file','-t',approved])==='commit';
 const diff=sourceObjectPresent&&head?runGit(root,['diff','--name-only',approved,head,'--']):null;
 const files=diff!==null?diff.split(/\r?\n/).filter(Boolean).map(v=>v.replaceAll('\\','/')):[];
 const protectedFiles=files.filter(affectsPublication);
 const dirty=runGit(root,['status','--porcelain','--untracked-files=no']);
 const dirtyFiles=dirty===null?[]:dirty.split(/\r?\n/).filter(Boolean).map(v=>v.slice(3).replaceAll('\\','/'));
 return {
  taskReferenced:true,id:createHash('sha256').update(norm(resolved)).digest('hex').slice(0,12),
  head,sourceObjectPresent,diffReadable:diff!==null,
  changedFileCount:diff===null?null:files.length,
  protectedChangedCount:diff===null?null:protectedFiles.length,
  calendarParserChanged:diff===null?null:files.includes('lib/release-calendar.mjs'),
  parserBlob:safeSha(runGit(root,['hash-object','lib/release-calendar.mjs'])),
  dirtyProtected:dirty===null?null:dirtyFiles.filter(affectsPublication).length,
  statusReadable:dirty!==null,
 };
}

function discover(projectRoot,xml,approved){
 try{
  const entries=fs.readdirSync(projectRoot,{withFileTypes:true})
   .filter(e=>e.isDirectory()&&!e.isSymbolicLink()&&e.name!=='legacy').slice(0,256);
  const matched=[];
  let inspected=0;
  for(const e of entries){const p=inspectProject(path.join(projectRoot,e.name),xml,approved);
   if(p){inspected++;if(p.taskReferenced)matched.push(p);}}
  return {state:'SCANNED',inspected,matched};
 }catch{return {state:'PROJECT_ROOT_UNAVAILABLE',inspected:0,matched:[]};}
}

export function runTelemetry({projectRoot=String.raw`E:\ZGmini\projects`,dataRoot=process.env.ZGMINI_PC_HOME||String.raw`E:\ZGmini\data\pc-writer`,getTask=taskXml}={}){
 let config=null;
 try{config=JSON.parse(fs.readFileSync(path.join(dataRoot,'config.json'),'utf8'));}catch{}
 const approved=safeSha(config?.source);
 const xml=getTask();
 const discovered=discover(projectRoot,xml,approved);
 const project=discovered.matched.length===1?discovered.matched[0]:null;
 const writer=readReport(dataRoot,'local-writer-last-run.json');
 const ledger=readReport(dataRoot,'local-publication-ledger.json');
 const collection=readReport(dataRoot,'local-collection-last-run.json');
 const decision=discovered.matched.length!==1?'TASK_PROJECT_UNRESOLVED_STOP':evaluateLineage({approved,project,ledger,writer});
 return {
  audit:'MARKET_CALENDAR_R10_LINEAGE_TELEMETRY',at:new Date().toISOString(),
  policy:'READ_ONLY_NO_CONFIG_NO_DB_NO_COLLECTION_NO_PUBLICATION',
  approvedSource:approved,
  task:{xmlRead:xml!==null,projectsInspected:discovered.inspected,matchingProjects:discovered.matched.length},
  activeProject:project,
  lastWriter:writer,lastPublicationLedger:ledger,lastCollection:collection,
  decision,
 };
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const out=process.argv[2];
 if(!out){console.error('OUTPUT_PATH_REQUIRED');process.exitCode=2;}
 else{try{fs.writeFileSync(out,JSON.stringify(runTelemetry(),null,2)+'\n','utf8');console.log('R10_READONLY_REPORT_WRITTEN');}
 catch{console.error('R10_REPORT_FAILED');process.exitCode=2;}}
}
