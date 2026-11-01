/** Portable, strictly read-only Windows Core Task -> launcher -> source inspection.
 *  No provider, D1, E: writes, Task changes, locks, or PID operations.
 *  Never print Task XML, source paths, config contents, or command lines.
 */
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const TASK_NAME='ZGMINI-PC-Local-Core';
const PC_HOME='E:\\ZGmini\\data\\pc-writer';
const PROJECTS_ROOT='E:\\ZGmini\\projects\\';
const SCRIPT_EXT=/\.(?:vbs|cmd|bat|mjs|js|ps1)$/i;
const SAFE_STATUS=/^[A-Z][A-Z0-9_]{1,63}$/;
const SHA=/^[a-f0-9]{40}$/i;
const ISO=value=>typeof value==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(value)&&Number.isFinite(Date.parse(value));
const status=value=>typeof value==='string'&&SAFE_STATUS.test(value)?value:null;
const cleanWindowsPath=value=>String(value??'').trim().replace(/^["']+|["']+$/g,'');
const compare=(a,b)=>a?.toLowerCase()===b?.toLowerCase();

export function decodeTaskXml(raw){
 if(typeof raw==='string')return raw.replace(/^\ufeff/,'');
 if(!Buffer.isBuffer(raw))return '';
 const utf16=raw[0]===0xff&&raw[1]===0xfe || raw.length>4&&raw[1]===0&&raw[3]===0;
 return raw.toString(utf16?'utf16le':'utf8').replace(/^\ufeff/,'');
}

function decodeEntity(value){
 return value.replace(/&(?:quot|apos|lt|gt|amp|#\d+|#x[\da-f]+);/gi,entity=>{
  const token=entity.slice(1,-1).toLowerCase();
  const fixed={quot:'"',apos:"'",lt:'<',gt:'>',amp:'&'};
  if(Object.hasOwn(fixed,token))return fixed[token];
  const digit=token.startsWith('#x')?Number.parseInt(token.slice(2),16):Number.parseInt(token.slice(1),10);
  return Number.isInteger(digit)&&digit>=32&&digit<=65535?String.fromCharCode(digit):'';
 });
}

function xmlTag(xml,tag){
 const match=xml.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`,'i'));
 return match?decodeEntity(match[1]).trim():null;
}

export function parseCoreTaskXml(raw){
 const xml=decodeTaskXml(raw);
 if(!/<Task\b/i.test(xml)||!/<\/Task\s*>/i.test(xml))return {status:'TASK_XML_INVALID'};
 const execs=[...xml.matchAll(/<Exec\s*>([\s\S]*?)<\/Exec\s*>/gi)];
 if(execs.length!==1)return {status:'TASK_EXEC_COUNT_UNEXPECTED',triggerPT5M:null,ignoreNew:null};
 const command=xmlTag(execs[0][1],'Command');
 if(!command)return {status:'TASK_ACTION_COMMAND_MISSING'};
 return {status:'TASK_XML_READ',command,arguments:xmlTag(execs[0][1],'Arguments')??'',
  workingDirectory:xmlTag(execs[0][1],'WorkingDirectory'),
  triggerPT5M:xmlTag(xml,'Interval')==='PT5M',
  ignoreNew:xmlTag(xml,'MultipleInstancesPolicy')==='IgnoreNew'};
}

function projectRoot(file){
 const normalized=cleanWindowsPath(file).replaceAll('/','\\');
 const match=normalized.match(/^E:\\ZGmini\\projects\\([a-zA-Z0-9._-]+)(?:\\|$)/i);
 return match?PROJECTS_ROOT+match[1]:null;
}

function authorizedWrapper(file){
 const normalized=cleanWindowsPath(file).replaceAll('/','\\');
 const lower=normalized.toLowerCase();
 return !/[\r\n*?%]/.test(normalized)&&normalized.length<=300&&SCRIPT_EXT.test(normalized)&&
  (lower.startsWith(PC_HOME.toLowerCase()+'\\')||lower.startsWith(PROJECTS_ROOT.toLowerCase()));
}

export function extractStaticScriptPaths(commandText){
 const found=[];
 // Matches literal Windows paths, including paths surrounded by doubled VBS quotes.
 for(const match of String(commandText??'').matchAll(/[a-z]:\\[^\r\n"'<>|&]*?\.(?:vbs|cmd|bat|ps1|mjs|js)(?![\w.])/gi)){
  const value=cleanWindowsPath(match[0]);
  if(!value.includes('%')&&!value.includes('$')&&!found.some(p=>compare(p,value)))found.push(value);
 }
 return found;
}

function launcherClass(file){
 const name=path.win32.basename(cleanWindowsPath(file)).toLowerCase();
 if(['wscript.exe','cscript.exe'].includes(name))return 'WINDOWS_SCRIPT_HOST';
 if(['cmd.exe','command.com'].includes(name))return 'CMD_HOST';
 if(['powershell.exe','pwsh.exe'].includes(name))return 'POWERSHELL_HOST';
 if(['node.exe','node'].includes(name))return 'NODE_HOST';
 if(SCRIPT_EXT.test(name))return 'DIRECT_SCRIPT';
 return 'OTHER';
}

export function summarizeCoreActionR39({taskXml,config,readWrapper=()=>null,readGit=()=>null,
 sidecar,early,cycle,taskError}={}){
 const task=parseCoreTaskXml(taskXml);
 const taskOk=task.status==='TASK_XML_READ';
 const summary={revision:'US_BREADTH_CORE_ACTION_R39',mode:'READ_ONLY_LOCAL_PROVENANCE',
  status:'REVIEW_REQUIRED',task:{status:taskError??task.status,triggerPT5M:taskOk?task.triggerPT5M:null,
   ignoreNew:taskOk?task.ignoreNew:null,launcherClass:taskOk?launcherClass(task.command):null},
  chain:{staticLauncherRead:false,staticLocalCycleReference:false,projectCandidates:'NONE',
   approvedShaMatch:null,gitClean:null,configEnabled:config?.enabled===true,
   configTargetPc:config?.collectionTarget==='pc',staticChainVerified:false,
   liveExecutionVerified:false},
  latest:{slotEndUtc:ISO(sidecar?.output?.slotEndUtc)?sidecar.output.slotEndUtc:null,
   collectionStatus:status(sidecar?.output?.collectionStatus),
   earlySlotEndUtc:ISO(early?.slotEndUtc)?early.slotEndUtc:null,
   earlyStatus:status(early?.status),
   earlyCompletedAt:ISO(early?.completedAt)?early.completedAt:null,
   cycleStatus:status(cycle?.status)},
  natural15MinSlots:'THREE_CONSECUTIVE_REAL_NY_SLOTS_NOT_VERIFIED_BY_ONE_SNAPSHOT',
  remoteReadback:'NOT_ATTEMPTED',providerCalls:0,d1Reads:0,d1Writes:0,
  eSourceWrites:0,taskChanges:0,lockPidActions:0};
 if(!taskOk){summary.status='TASK_XML_NOT_VERIFIED';return summary;}

 // Registered WorkingDirectory, literal Task arguments, and the *actual* task
 // launcher are the only starting points. Never search E: project directories.
 const paths=extractStaticScriptPaths(task.arguments);
 if(SCRIPT_EXT.test(task.command)&&/^[A-Z]:\\/i.test(task.command))paths.unshift(task.command);
 const queue=[...new Set(paths)];
 const seen=new Set();
 const projects=new Map();
 let failedWrapper=false;
 let dynamic=false;
 const wdProject=projectRoot(task.workingDirectory);
 if(wdProject)projects.set(wdProject.toLowerCase(),wdProject);

 for(let i=0;i<queue.length&&i<8;i++){
  const candidate=queue[i];
  const project=projectRoot(candidate);
  if(project)projects.set(project.toLowerCase(),project);
  if(seen.has(candidate.toLowerCase()))continue;
  seen.add(candidate.toLowerCase());
  // The launched .mjs is a leaf: reading its imports is neither necessary
  // nor evidence that a second launcher runs. Never interpret JS strings.
  if(/\\local-cycle\.mjs$/i.test(candidate)){
   summary.chain.staticLocalCycleReference=true;
   continue;
  }
  if(/\.(?:mjs|js)$/i.test(candidate))continue;
  if(!authorizedWrapper(candidate)){failedWrapper=true;continue;}
  let contents;
  try{contents=readWrapper(candidate);}catch{contents=null;}
  if(typeof contents!=='string'||contents.length>100_000){failedWrapper=true;continue;}
  summary.chain.staticLauncherRead=true;
  const references=extractStaticScriptPaths(contents);
  if(references.some(p=>/\\scripts\\pc-writer\\local-cycle\.mjs$/i.test(p)))
   summary.chain.staticLocalCycleReference=true;
  if(/(?:%[A-Za-z_]+%|\$\{|\b(?:Environ|ExpandEnvironmentStrings)\s*\()/i.test(contents))dynamic=true;
  for(const reference of references){
   const nested=projectRoot(reference);
   if(nested)projects.set(nested.toLowerCase(),nested);
   if(!queue.some(p=>compare(p,reference)))queue.push(reference);
  }
 }

 // A project root in a dynamic command is only a candidate; it is not proof.
 const projectValues=[...projects.values()];
 summary.chain.projectCandidates=projectValues.length===0?'NONE':projectValues.length===1?'SINGLE':'MULTIPLE';
 if(projectValues.length===1){
  let git;
  try{git=readGit(projectValues[0]);}catch{}
  const approved=SHA.test(config?.source??'');
  const headValid=SHA.test(git?.head??'');
  summary.chain.approvedShaMatch=approved&&headValid?compare(config.source,git.head):null;
  summary.chain.gitClean=typeof git?.clean==='boolean'?git.clean:null;
 }
 const chain=summary.chain;
 chain.staticChainVerified=task.triggerPT5M&&task.ignoreNew&&chain.staticLauncherRead&&
  chain.staticLocalCycleReference&&chain.projectCandidates==='SINGLE'&&
  chain.approvedShaMatch===true&&chain.gitClean===true&&chain.configEnabled&&
  chain.configTargetPc&&!dynamic&&!failedWrapper;
 summary.status=chain.staticChainVerified?'APPROVED_SOURCE_STATIC_CHAIN':
  chain.projectCandidates==='MULTIPLE'?'MULTIPLE_PROJECTS_REVIEW_REQUIRED':
  dynamic?'DYNAMIC_LAUNCHER_REVIEW_REQUIRED':
  failedWrapper?'WRAPPER_UNREADABLE_OR_UNAPPROVED':
  !chain.staticLocalCycleReference?'LOCAL_CYCLE_LINK_NOT_PROVED':
  chain.approvedShaMatch===false?'SOURCE_SHA_MISMATCH':
  chain.gitClean===false?'SOURCE_DIRTY':
  'APPROVAL_CHAIN_INCOMPLETE';
 return summary;
}

function readSmall(file,maxBytes){
 try{const info=fs.statSync(file);if(!info.isFile()||info.size>maxBytes)return null;
  return fs.readFileSync(file,'utf8');}catch{return null;}
}
function readJson(file){try{return JSON.parse(readSmall(file,2_000_000)??'null');}catch{return null;}}
function safeGit(root){
 const options={cwd:root,encoding:'utf8',windowsHide:true,timeout:12_000,
  maxBuffer:1_000_000,env:{...process.env,GIT_OPTIONAL_LOCKS:'0'}};
 const head=execFileSync('git.exe',['rev-parse','HEAD'],options).trim();
 const clean=execFileSync('git.exe',['--no-optional-locks','status','--porcelain'],options).trim()==='';
 return {head,clean};
}
export function inspectCoreActionR39(){
 if(process.platform!=='win32')return summarizeCoreActionR39({taskError:'WINDOWS_PC_REQUIRED'});
 let taskXml=null,taskError=null;
 try{taskXml=decodeTaskXml(execFileSync('schtasks.exe',['/Query','/TN',TASK_NAME,'/XML'],
  {windowsHide:true,timeout:20_000,maxBuffer:1_000_000}));}
 catch{taskError='TASK_XML_QUERY_FAILED';}
 const pcHome=PC_HOME;
 return summarizeCoreActionR39({taskXml,taskError,
  config:readJson(path.win32.join(pcHome,'config.json')),
  readWrapper:file=>readSmall(file,100_000),
  readGit:root=>safeGit(root),
  sidecar:readJson(path.win32.join(pcHome,'local-us-breadth-iex-provisional.json')),
  early:readJson(path.win32.join(pcHome,'local-us-breadth-provisional-early-last-run.json')),
  cycle:readJson(path.win32.join(pcHome,'local-cycle-last-run.json'))});
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.length!==3||process.argv[2]!=='--inspect-only'){
  process.stdout.write(JSON.stringify({revision:'US_BREADTH_CORE_ACTION_R39',
   status:'INSPECT_ONLY_ARGUMENT_REQUIRED',d1Writes:0,eSourceWrites:0,taskChanges:0})+'\n');
  process.exitCode=2;
 }else process.stdout.write(JSON.stringify(inspectCoreActionR39())+'\n');
}
