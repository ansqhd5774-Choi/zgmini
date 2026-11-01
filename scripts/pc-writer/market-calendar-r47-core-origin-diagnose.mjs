// R47: read-only classification of the Core task origin that blocked R46.
// No source/config/task writes, no provider/network requests, no raw paths.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const sha=x=>createHash('sha256').update(x).digest('hex');
const norm=p=>path.normalize(p).replaceAll('\\','/').toLowerCase();
const win=p=>/^[a-z]:[\\/]/i.test(p);
const abs=p=>win(p)?path.win32.resolve(p):path.resolve(p);
const rootOf=p=>(win(p)?path.win32:path).resolve(p,'..','..','..');
const safeRead=file=>{
 try{
  const stat=fs.statSync(file);
  if(!stat.isFile()||stat.size<1||stat.size>65536)return null;
  return fs.readFileSync(file,'utf8');
 }catch{return null;}
};
const task=()=>{
 const raw=execFileSync('schtasks.exe',['/Query','/TN','ZGMINI-PC-Local-Core','/XML'],
  {windowsHide:true,timeout:12000,maxBuffer:262144,stdio:['ignore','pipe','ignore']});
 if(raw.length>262144)throw Error('TASK_XML_OVERSIZE');
 return ((raw[0]===255&&raw[1]===254||raw.includes(0))?raw.toString('utf16le'):
  raw.toString('utf8')).replace(/^\ufeff/,'');
};
const decode=x=>x.replace(/&quot;|&#34;/gi,'"').replace(/&apos;|&#39;/gi,"'")
 .replace(/&amp;/gi,'&').replace(/&lt;/gi,'<').replace(/&gt;/gi,'>');
const tag=(xml,name)=>[...xml.matchAll(new RegExp(`<${name}(?:\\s+[^>]*)?>([\\s\\S]*?)<\\/${name}>`,'gi'))]
 .map(m=>decode(m[1]));
const actionType=value=>/\b(?:wscript|cscript)(?:\.exe)?\b/i.test(value)?'WSCRIPT':
 /\bcmd(?:\.exe)?\b/i.test(value)?'CMD':
 /\bnode(?:\.exe)?\b/i.test(value)?'NODE':'OTHER';

export function diagnoseR47CoreOrigin({getTaskXml=task}={}){
 const result={audit:'MARKET_CALENDAR_R47_CORE_ORIGIN_READ_ONLY',at:new Date().toISOString(),
  decision:'R47_DIAGNOSIS_INCOMPLETE',noSourceWrites:true,providerCalls:0,
  databaseWrites:0,schedulerChanges:0,gitChanges:0,published:false,
  taskReadable:false,taskActionCount:0,taskArgumentCount:0,taskCommandType:null,
  strictR46WrapperMatches:0,quotedVbsCandidates:0,wrapperReadable:false,
  wrapperR38Marker:false,wrapperOriginAssignments:0,originReadable:false,
  originScriptCandidates:0,rootWorktreeId:null};
 try{
  const xml=getTaskXml();
  if(typeof xml!=='string'||xml.length<50||xml.length>262144)
   throw Error('R47_TASK_XML_NOT_READABLE');
  result.taskReadable=true;
  const commands=tag(xml,'Command'),argumentsTags=tag(xml,'Arguments');
  result.taskActionCount=commands.length;
  result.taskArgumentCount=argumentsTags.length;
  if(commands.length===1)result.taskCommandType=actionType(commands[0]);
  if(argumentsTags.length!==1){result.decision='R47_TASK_ARGUMENT_SHAPE_CHANGED';return result;}
  const args=argumentsTags[0];
  const strict=[...args.matchAll(/"([^"\r\n]*[\\/]run-local-core\.vbs)"/gi)]
   .map(m=>m[1]);
  result.strictR46WrapperMatches=strict.length;
  const quoted=[...args.matchAll(/"([^"\r\n]+\.vbs)"/gi)].map(m=>m[1]);
  const candidates=[...new Set([...strict,...quoted])];
  result.quotedVbsCandidates=quoted.length;
  if(candidates.length!==1){
   result.decision='R47_WRAPPER_ARGUMENT_SHAPE_CHANGED';return result;
  }
  const wrapperFile=abs(candidates[0]);
  const wrapper=safeRead(wrapperFile);
  if(wrapper===null){result.decision='R47_WRAPPER_NOT_READABLE';return result;}
  result.wrapperReadable=true;
  result.wrapperR38Marker=wrapper.includes('ZGMINI_R38_WRAPPER_V1');
  const origins=[...wrapper.matchAll(/^[ \t]*origin[ \t]*=[ \t]*"((?:[^"\r\n]|"")*)"[ \t]*(?:\x27[^\r\n]*)?$/gim)];
  result.wrapperOriginAssignments=origins.length;
  if(origins.length!==1){result.decision='R47_WRAPPER_ORIGIN_SHAPE_CHANGED';return result;}
  const originFile=abs(origins[0][1].replaceAll('""','"'));
  const source=safeRead(originFile);
  if(source===null){result.decision='R47_ORIGIN_FILE_NOT_READABLE';return result;}
  result.originReadable=true;
  const re=/((?:[a-z]:[\\/]|\/)[^"'\r\n<>]*?[\\/]scripts[\\/]pc-writer[\\/](?:local-cycle|quota-runner|run-local|collect-local)\.mjs)/gi;
  const entries=[...new Map([...source.matchAll(re)].map(m=>{
   const entry=abs(m[1].trim());return [norm(entry),entry];
  })).values()];
  result.originScriptCandidates=entries.length;
  if(entries.length!==1){result.decision='R47_ORIGIN_SCRIPT_SHAPE_CHANGED';return result;}
  result.rootWorktreeId=sha(norm(rootOf(entries[0]))).slice(0,12);
  result.decision='R47_CORE_ORIGIN_READONLY_RESOLVED';return result;
 }catch{
  result.decision='R47_TASK_READ_OR_PARSE_FAILED';return result;
 }
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const r=diagnoseR47CoreOrigin();
 console.log(JSON.stringify(r));
 if(r.decision!=='R47_CORE_ORIGIN_READONLY_RESOLVED')process.exitCode=2;
}
