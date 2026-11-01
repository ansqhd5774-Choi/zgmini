// Read-only inventory of the ACTUAL scheduled PC Core launcher and R45 state.
// This file never executes a Task command, collects, publishes or modifies PC data.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
// The tiny literal-only VBS parser is kept self-contained for a portable,
// read-only CMD package. It preserves R50's literal-only restrictions, while
// recognizing both valid VBScript Run syntaxes without approving source drift.
const R50_APPROVED_WRAPPER_SHA256='f05deb73cbadf831d7d3a9875bfbd13356d4ab21803fe9b7944a3f2ae6a5499d';
function literalVbsRun(line){
 // Keep the historical R50 parenthesized matching rule byte-for-byte in
 // meaning: real wrappers can prefix Run with an assignment/other statement.
 const original=line.match(/\.\s*Run\s*\(\s*("(?:""|[^"])*")\s*,\s*\d+\s*,\s*True\s*\)/i);
 if(original)return {command:original[1].slice(1,-1).replaceAll('""','"'),
  syntax:'PAREN_LITERAL'};
 // A non-parenthesized Run statement is admitted only when the entire
 // active line has an exact literal command and fixed numeric/True args.
 const m=line.match(/^\s*[a-z_][a-z0-9_]*\s*\.\s*Run\s+("(?:""|[^"])*")\s*,\s*\d+\s*,\s*True\s*(?:'.*)?$/i);
 if(!m)return null;
 const literal=m[1];
 return {command:literal.slice(1,-1).replaceAll('""','"'),
  syntax:'BARE_LITERAL'};
}
// A deliberately tiny constant-expression interpreter. No VBScript is run:
// only strings, already-known string assignments, '&', and printable Chr(n)
// are allowed. Unsupported expressions remain UNKNOWN.
function staticVbsString(expression,vars){
 if(typeof expression!=='string'||expression.length>8192)return null;
 let pos=0,value='',pieces=0,needValue=true;
 const token=/\s*(?:"((?:""|[^"])*)"|Chr\s*\(\s*(\d+)\s*\)|([a-z_][a-z0-9_]*)|(&))\s*/iy;
 while(pos<expression.length){
  token.lastIndex=pos;
  const m=token.exec(expression);
  if(!m||m.index!==pos)return null;
  pos=token.lastIndex;
  if(m[4]){if(needValue)return null;needValue=true;continue;}
  if(!needValue)return null;
  let part;
  if(m[1]!==undefined)part=m[1].replaceAll('""','"');
  else if(m[2]!==undefined){
   const code=Number(m[2]);
   if(!Number.isInteger(code)||code<32||code>126)return null;
   part=String.fromCharCode(code);
  }else part=vars.get(m[3].toLowerCase());
  if(typeof part!=='string')return null;
  value+=part;pieces++;needValue=false;
  if(value.length>4096||pieces>96)return null;
 }
 return needValue?null:value;
}
function staticVbsRunCandidates(body){
 const vars=new Map(),runs=[];
 const active=body.split(/\r?\n/).filter(l=>!/^\s*(?:'|Rem\b)/i.test(l));
 for(const line of active){
  const assignment=line.match(/^\s*(?:Const\s+)?([a-z_][a-z0-9_]*)\s*=\s*(.*?)\s*(?:'.*)?$/i);
  if(assignment){
   const name=assignment[1].toLowerCase();
   const evaluated=staticVbsString(assignment[2],vars);
   if(evaluated===null)vars.delete(name);else vars.set(name,evaluated);
  }
  if(!/\.\s*Run\b/i.test(line))continue;
  const strict=literalVbsRun(line);
  if(strict){runs.push({...strict,staticResolution:false});continue;}
  const expr=line.match(/\.\s*Run\s*(?:\(\s*(.*?)\s*,\s*\d+\s*,\s*True\s*\)|\s+(.+?)\s*,\s*\d+\s*,\s*True)\s*(?:'.*)?$/i);
  const resolved=expr?staticVbsString(expr[1]??expr[2],vars):null;
  runs.push(resolved===null?null:{command:resolved,syntax:'STATIC_CONST_EXPRESSION',staticResolution:true});
 }
 return runs;
}
function anonymousVbsOutline(body){
 const names=new Map();let next=0;
 const words=new Set(['set','dim','const','if','then','else','end','on','error','resume','next',
  'createobject','wscript','shell','run','exec','quit','chr','replace','environ','call',
  'true','false','not','and','or','exit','function','sub']);
 return body.split(/\r?\n/).filter(x=>x.trim()).slice(0,32).map(line=>{
  const output=[];
  for(const m of line.matchAll(/"(?:""|[^"])*"|[a-z_][a-z0-9_]*|\d+|\S/gi)){
   const v=m[0];
   if(v.startsWith('"')){
    const s=v.toLowerCase();
    output.push(/\.mjs/.test(s)?'STRING_MJS':/\.vbs/.test(s)?'STRING_VBS':
     /\.exe/.test(s)?'STRING_EXE':/[\\/]/.test(s)?'STRING_PATH':'STRING_LITERAL');
   }else if(/^[a-z_]/i.test(v)){
    const key=v.toLowerCase();
    if(key==='rem'&&output.length===0){output.push('COMMENT');break;}
    if(words.has(key))output.push(key.toUpperCase());
    else{if(!names.has(key))names.set(key,`VAR${++next}`);output.push(names.get(key));}
   }else if(/^\d/.test(v))output.push('N');
   else if(v==="'"){output.push('COMMENT');break;}
   else output.push(/[=():.,&+\-\\/]/.test(v)?v:'SYMBOL');
   if(output.length>=60){output.push('TRUNCATED');break;}
  }
  return output.join(' ').slice(0,210);
 });
}
function safeVbsShape(body){
 const active=body.split(/\r?\n/).filter(l=>!/^\s*(?:'|Rem\b)/i.test(l));
 const runLines=active.filter(x=>/\.\s*Run\b/i.test(x));
 const strict=runLines.map(literalVbsRun);
 const derived=staticVbsRunCandidates(body);
 return {
  sourceLineCount:body.split(/\r?\n/).length,
  runCount:runLines.length,
  literalRunCount:strict.filter(Boolean).length,
  staticResolvedRunCount:derived.filter(x=>x?.staticResolution).length,
  unresolvedRunCount:derived.filter(x=>!x).length,
  bareLiteralRunCount:strict.filter(x=>x?.syntax==='BARE_LITERAL').length,
  execMethodCount:active.filter(x=>/\.\s*Exec\b/i.test(x)).length,
  dynamicRunPresent:strict.some(x=>!x),
  nodeExeMentioned:/node\.exe/i.test(body),
  projectScriptsMentioned:/scripts[\\/]pc-writer/i.test(body),
  localCycleMentioned:/local-cycle/i.test(body),
  quotaRunnerMentioned:/quota-runner/i.test(body),
  cmdMentioned:/\.cmd\b/i.test(body),
  environMentioned:/\bEnviron\s*\(/i.test(body),
  chrMentioned:/\bChr\s*\(/i.test(body),
  hasConcat:body.includes('&'),
  anonymousOutline:derived.some(x=>!x)?anonymousVbsOutline(body):null,
  commands:derived,
 };
}
function tokenizeR50Command(value){
 if(typeof value!=='string'||!value||value.length>4096||/[\r\n;&|<>%!^]/.test(value))return null;
 const out=[];let token='',quoted=false,active=false;
 for(const ch of value){
  if(ch==='"'){quoted=!quoted;active=true;continue;}
  if(/\s/.test(ch)&&!quoted){
   if(active){out.push(token);token='';active=false;}
  }else{token+=ch;active=true;}
 }
 if(quoted)return null;
 if(active)out.push(token);
 return out;
}

const PC_HOME=String.raw`E:\ZGmini\data\pc-writer`;
const COLLECTOR='scripts/pc-writer/collect-local.mjs';
const OLD_BLOB='f940b9b3bdd32dc5cddba1ce97e5f048a52710ce';
const OFF_BLOB='40bd7edd08d2ff42bf2290e7955fc8318f1183f4';
const R56_SOURCE='154c5ac25120ecf8292b630ca9b1e30edad1ed75';
const PROTECTED=['lib','worker','scripts/pc-writer','package.json','package-lock.json'];
const hash=b=>createHash('sha256').update(b).digest('hex');
const gitBlob=b=>createHash('sha1').update(Buffer.from(`blob ${b.length}\0`)).update(b).digest('hex');
const source=x=>/^[a-f0-9]{40}$/i.test(String(x??''))?String(x).toLowerCase():null;
const isWin=p=>/^[a-z]:[\\/]/i.test(p);
const pmod=p=>isWin(p)?path.win32:path;
const absolute=p=>isWin(p)?path.win32.resolve(p):path.resolve(p);
const norm=p=>pmod(p).normalize(p).replaceAll('\\','/').toLowerCase();
const decode=v=>v.replace(/&quot;|&#34;/gi,'"').replace(/&amp;/gi,'&');

function readLimited(file,max=65536){
 try{
  const stat=fs.lstatSync(file);
  if(!stat.isFile()||stat.size<1||stat.size>max)return null;
  return fs.readFileSync(file);
 }catch{return null;}
}
function queryCoreTask(){
 const b=execFileSync('schtasks.exe',['/Query','/TN','ZGMINI-PC-Local-Core','/XML'],
  {windowsHide:true,timeout:15000,maxBuffer:262144,stdio:['ignore','pipe','ignore']});
 return ((b[0]===255&&b[1]===254)||b.includes(0)?b.toString('utf16le'):
  b.toString('utf8')).replace(/^\ufeff/,'');
}
const git=(root,args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',windowsHide:true,
 timeout:20000,stdio:['ignore','pipe','pipe']}).trim();

function taskWrapper(xml){
 if(typeof xml!=='string'||xml.length<40||xml.length>262144)
  return {status:'TASK_XML_UNVERIFIED'};
 const execs=[...xml.matchAll(/<Exec(?:\s[^>]*)?>[\s\S]*?<\/Exec>/gi)];
 if(execs.length!==1)return {status:'TASK_ACTION_COUNT_UNVERIFIED'};
 const content=execs[0][0];
 const commands=[...content.matchAll(/<Command(?:\s[^>]*)?>([\s\S]*?)<\/Command>/gi)];
 const argumentsList=[...content.matchAll(/<Arguments(?:\s[^>]*)?>([\s\S]*?)<\/Arguments>/gi)];
 if(commands.length!==1||argumentsList.length!==1)
  return {status:'TASK_COMMAND_UNVERIFIED'};
 if(!/(?:^|[\\/])(?:wscript|cscript)\.exe$/i.test(decode(commands[0][1]).trim()))
  return {status:'TASK_COMMAND_NOT_SCRIPT_HOST'};
 const args=decode(argumentsList[0][1]);
 const wrappers=[...args.matchAll(/"([^"\r\n<>]+\.vbs)"/gi)];
 if(wrappers.length!==1||!/^(?:[a-z]:[\\/]|\/)/i.test(wrappers[0][1]))
  return {status:'TASK_WRAPPER_UNVERIFIED'};
 const interval=[...xml.matchAll(/<Interval(?:\s[^>]*)?>([^<]*)<\/Interval>/gi)]
  .map(x=>x[1].trim());
 return {status:'TASK_SCRIPT_HOST_OBSERVED',wrapper:absolute(wrappers[0][1]),
  pt5mInTaskXml:interval.includes('PT5M'),intervalObserved:interval.length>0};
}

function coreCommand(command){
 const tokens=tokenizeR50Command(command);
 if(!tokens?.length)return {type:'UNRECOGNIZED'};
 const host=/(?:^|[\\/])(?:wscript|cscript)\.exe$/i.test(tokens[0]);
 if(host||/\.vbs$/i.test(tokens[0])){
  const scripts=(host?tokens.slice(1):tokens).filter(x=>/\.vbs$/i.test(x));
  if(scripts.length===1&&/^(?:[a-z]:[\\/]|\/)/i.test(scripts[0]))
   return {type:'VBS',file:absolute(scripts[0])};
 }
 if(/(?:^|[\\/])node\.exe$/i.test(tokens[0])){
  const scripts=tokens.slice(1).filter(x=>/\.mjs$/i.test(x));
  if(scripts.length===1&&scripts[0]===tokens[1]&&
   /^(?:[a-z]:[\\/]|\/)/i.test(scripts[0])&&
   /[\\/]scripts[\\/]pc-writer[\\/][a-z0-9._-]+\.mjs$/i.test(scripts[0]))
   return {type:'NODE',file:absolute(scripts[0])};
 }
 return {type:'UNRECOGNIZED'};
}

export function traceLiveCore(xml,{readFile=readLimited,maxDepth=4}={}){
 const parsed=taskWrapper(xml);
 const out={status:parsed.status,pt5mInTaskXml:parsed.pt5mInTaskXml??null,
  intervalObserved:parsed.intervalObserved??null,outerSha256:null,
  legacyR50OuterHashMatched:null,coreVbsCount:0,coreChain:[],
  auxiliaryRunCount:0,knownArchiveRunSeen:false,entryName:null,root:null,
  rootWorktreeId:null};
 if(!parsed.wrapper)return out;
 let active=parsed.wrapper;
 const seen=new Set();
 for(let depth=0;depth<maxDepth;depth++){
  if(seen.has(norm(active))){out.status='CORE_VBS_CYCLE_STOP';return out;}
  seen.add(norm(active));
  const bytes=readFile(active,65536);
  if(!Buffer.isBuffer(bytes)||bytes.length<1||bytes.length>65536){
   out.status='CORE_VBS_UNREADABLE';return out;
  }
  const digest=hash(bytes);
  if(depth===0){
   out.outerSha256=digest;
   out.legacyR50OuterHashMatched=digest===R50_APPROVED_WRAPPER_SHA256;
  }
  const body=bytes.toString('utf8');
  const shape=safeVbsShape(body);
  const runs=shape.commands.map(x=>x?.command??null);
  out.coreVbsCount++;
  const {commands:unused,...safeShape}=shape;
  out.coreChain.push({depth,sha256:digest,...safeShape});
  if(shape.runCount===0||!runs[0]){
   out.status='CORE_RUN_SHAPE_UNVERIFIED';return out;
  }
  out.auxiliaryRunCount+=shape.runCount-1;
  out.knownArchiveRunSeen||=runs.slice(1).some(x=>typeof x==='string'&&/archive-run\.mjs/i.test(x));
  const first=coreCommand(runs[0]);
  if(first.type==='VBS'){active=first.file;continue;}
  if(first.type!=='NODE'){
   out.status='CORE_FIRST_RUN_UNRECOGNIZED';return out;
  }
  const nodeBytes=readFile(first.file,5242880);
  if(!Buffer.isBuffer(nodeBytes)||nodeBytes.length<1||nodeBytes.length>5242880){
   out.status='CORE_ENTRY_UNREADABLE';return out;
  }
  const mod=pmod(first.file);
  const root=mod.resolve(first.file,'..','..','..');
  out.entryName=mod.basename(first.file);
  out.root=root;
  out.rootWorktreeId=hash(norm(root)).slice(0,12);
  out.status=out.coreChain.some(s=>s.staticResolvedRunCount>0||s.unresolvedRunCount>0)?
   'CORE_CHAIN_STATICALLY_TRACED_REVIEW_REQUIRED':'CORE_CHAIN_TRACED_READ_ONLY';
  return out;
 }
 out.status='CORE_VBS_DEPTH_LIMIT';return out;
}

function lockSummary(file){
 let stat;
 try{stat=fs.lstatSync(file);}catch(e){return e?.code==='ENOENT'?'FREE':'UNKNOWN';}
 if(!stat.isFile()||stat.size<1||stat.size>4096)return 'UNKNOWN';
 let lock;
 try{lock=JSON.parse(fs.readFileSync(file,'utf8'));}catch{return 'UNKNOWN';}
 if(!Number.isSafeInteger(lock?.pid)||lock.pid<=0||!Number.isFinite(lock?.at)||
  lock.at>Date.now()+120000)return 'UNKNOWN';
 try{process.kill(lock.pid,0);return 'PID_EXISTS_NOT_PROVEN_ACTIVE';}
 catch(e){return e?.code==='ESRCH'?'ORPHAN_NOT_REMOVED':'UNKNOWN';}
}

export function runLiveR45Inventory({
 base=process.env.ZGMINI_PC_HOME||PC_HOME,
 taskXml=queryCoreTask,readFile=readLimited,gitCall=git,
 allowNonWindows=false,lockCheck=lockSummary,
}={}){
 const result={audit:'MARKET_CALENDAR_R45_PC_LIVE_INVENTORY_R4',
  at:new Date().toISOString(),decision:'INVENTORY_INCOMPLETE_REVIEW_REQUIRED',
  readOnly:true,pcFilesChanged:0,schedulerChanged:false,providerCalls:0,
  dbWrites:0,published:false,taskStatus:null,launcherStatus:null,
  legacyR50OuterHashMatched:null,actualOuterSha256:null,
  pt5mInTaskXml:null,intervalObserved:null,coreVbsCount:0,
  coreChainShape:[],
  auxiliaryRunCount:0,knownArchiveRunSeen:false,entryName:null,
  worktreeId:null,sourceHead:null,configSource:null,configMatchesHead:null,
  oldR56SourceMatched:null,protectedTrackedClean:null,collectorBlob:null,
  collectorMatchesHead:null,r45Observer:'UNKNOWN',coreLock:'NOT_CHECKED'};
 if(process.platform!=='win32'&&!allowNonWindows){
  result.taskStatus='WINDOWS_ONLY';return result;
 }
 let xml;
 try{xml=taskXml();}catch{result.taskStatus='TASK_QUERY_FAILED';return result;}
 const chain=traceLiveCore(xml,{readFile});
 result.taskStatus='TASK_QUERY_OK';
 result.launcherStatus=chain.status;
 result.actualOuterSha256=chain.outerSha256;
 result.legacyR50OuterHashMatched=chain.legacyR50OuterHashMatched;
 result.pt5mInTaskXml=chain.pt5mInTaskXml;
 result.intervalObserved=chain.intervalObserved;
 result.coreVbsCount=chain.coreVbsCount;
 result.coreChainShape=chain.coreChain;
 result.auxiliaryRunCount=chain.auxiliaryRunCount;
 result.knownArchiveRunSeen=chain.knownArchiveRunSeen;
 result.entryName=chain.entryName;
 result.worktreeId=chain.rootWorktreeId;
 try{result.coreLock=lockCheck(path.join(base,'local-cycle.lock'));}
 catch{result.coreLock='UNKNOWN';}
 try{
  const configBytes=readFile(path.join(base,'config.json'),65536);
  if(Buffer.isBuffer(configBytes)){
   const config=JSON.parse(configBytes.toString('utf8'));
   result.configSource=source(config?.source);
  }
 }catch{/* Missing/invalid private config is not copied to a diagnostic. */}
 if(!chain.root)return result;
 try{
  if(norm(gitCall(chain.root,['rev-parse','--show-toplevel']))!==norm(chain.root))
   throw Error('GIT_ROOT_MISMATCH');
  result.sourceHead=source(gitCall(chain.root,['rev-parse','HEAD']));
  if(!result.sourceHead)throw Error('INVALID_HEAD');
  result.oldR56SourceMatched=result.sourceHead===R56_SOURCE;
  result.configMatchesHead=result.configSource===result.sourceHead;
  result.protectedTrackedClean=!gitCall(chain.root,
   ['status','--porcelain','--untracked-files=no','--',...PROTECTED]);
  const collectorBytes=readFile(path.join(chain.root,...COLLECTOR.split('/')),5242880);
  if(!Buffer.isBuffer(collectorBytes))throw Error('COLLECTOR_UNREADABLE');
  result.collectorBlob=gitBlob(collectorBytes);
  result.collectorMatchesHead=result.collectorBlob===source(gitCall(chain.root,
   ['rev-parse',`HEAD:${COLLECTOR}`]));
  const marker=collectorBytes.toString('utf8');
  const hasObserver=/R45_MARKETPARQUET_SNAPSHOT_OBSERVER|captureR45MarketParquetPair|marketCalendarR45/.test(marker);
  result.r45Observer=result.collectorBlob===OLD_BLOB&&hasObserver?'PRESENT_EXACT_R56':
   result.collectorBlob===OFF_BLOB&&!hasObserver?'OFF_EXACT_BRANCH':
   hasObserver?'PRESENT_DIFFERENT_BLOB_REVIEW':'UNRECOGNIZED_REVIEW';
  if(result.configMatchesHead&&result.protectedTrackedClean&&result.collectorMatchesHead){
   result.decision=chain.status==='CORE_CHAIN_STATICALLY_TRACED_REVIEW_REQUIRED'?
    'INVENTORY_STATIC_ORIGIN_REVIEW_REQUIRED':
    result.r45Observer==='OFF_EXACT_BRANCH'?
     'OBSERVER_ALREADY_OFF_NO_PC_CHANGE':'INVENTORY_TRACED_REVIEW_REQUIRED';
  }
 }catch{result.decision='INVENTORY_GIT_OR_COLLECTOR_UNVERIFIED_REVIEW_REQUIRED';}
 return result;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.some(a=>a==='--apply'||a.startsWith('--write')||a.startsWith('--delete'))||
  process.argv.slice(2).some(a=>!a.startsWith('--base='))){
  console.log(JSON.stringify({audit:'MARKET_CALENDAR_R45_PC_LIVE_INVENTORY_R4',
   decision:'READ_ONLY_ARGUMENTS_ONLY_STOP',readOnly:true,pcFilesChanged:0}));
  process.exitCode=2;
 }else{
  const arg=process.argv.find(a=>a.startsWith('--base='));
  const result=runLiveR45Inventory(arg?{base:arg.slice(7)}:{});
  console.log(JSON.stringify(result));
  if(!['INVENTORY_TRACED_REVIEW_REQUIRED','OBSERVER_ALREADY_OFF_NO_PC_CHANGE',
   'INVENTORY_STATIC_ORIGIN_REVIEW_REQUIRED'].includes(result.decision))
   process.exitCode=2;
 }
}
