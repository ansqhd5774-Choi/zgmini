// R82: inspect the already-installed ten-theme PC lanes without mutating
// schedules, provider checkpoints, prices, D1, or production.
// Output is deliberately limited to status, SHA, date, and safe file basenames.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const DATA='E:/ZGmini/data';
const SPACE='space-satellite';
const DC='data-center-power';
const R54='ZGMINI-PC-Theme-Nine-R54-Public';
const R47='ZGMINI-PC-Theme-Nine-R47-Private';
const TASKS=Object.freeze([
 'ZGMINI-PC-Theme-Data-Center-Power',
 'ZGMINI-PC-Theme-Biotech',
 R47,R54,
]);
const hash=b=>createHash('sha256').update(b).digest('hex');
const safe=x=>/^[A-Z0-9_]{2,120}$/.test(String(x??''))?String(x):'UNSPECIFIED';
const iso=x=>typeof x==='string'&&/^20\d\d-\d\d-\d\d$/.test(x)?x:null;
const xmlValue=(xml,tag)=>String(xml).match(
 new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`,'i'))?.[1]?.trim()??null;

export function decodeR82Windows(bytes){
 if(!Buffer.isBuffer(bytes))return String(bytes??'');
 if(bytes[0]===255&&bytes[1]===254)return bytes.subarray(2).toString('utf16le');
 if(bytes[0]===239&&bytes[1]===187&&bytes[2]===191)
  return bytes.subarray(3).toString('utf8');
 const sample=bytes.subarray(0,Math.min(128,bytes.length));
 if(sample.length>20&&sample.filter((v,i)=>i%2===1&&v===0).length>8)
  return bytes.toString('utf16le');
 const utf8=new TextDecoder('utf-8',{fatal:true});
 try{return utf8.decode(bytes);}catch{}
 try{return new TextDecoder('euc-kr',{fatal:true}).decode(bytes);}catch{}
 return '';
}

// Never return raw scheduler XML. Its user identity or arguments may contain
// private information; the sanitized report names only approved CMD basenames.
export function summarizeR82Xml(xml){
 if(!/<Task\b/i.test(xml))return {xmlReadable:false};
 const exec=[...String(xml).matchAll(/<Exec(?:\s[^>]*)?>([\s\S]*?)<\/Exec>/gi)];
 const one=exec.length===1?exec[0][1]:'';
 const cmd=(xmlValue(one,'Command')??'').replaceAll('/','\\');
 const args=(xmlValue(one,'Arguments')??'')
  .replaceAll('&quot;','"').replaceAll('&apos;',"'")
  .replaceAll('&amp;','&').replaceAll('/','\\');
 const combined=cmd+' '+args;
 const known=[
  'DATA_CENTER_POWER_R5_SCHEDULED.cmd',
  'THEME_NINE_R73_SCHEDULED_PRIVATE.cmd',
  'THEME_NINE_R48_PRIVATE_CYCLE.cmd',
  'THEME_NINE_R54_PUBLIC_CYCLE.cmd',
  'BIOTECH_R8_SCHEDULED.cmd',
 ];
 const action=known.find(name=>new RegExp(
  name.replaceAll('.','\\.')+'(?:"|\\s|$)','i').test(combined))??'UNRECOGNIZED_ACTION';
 const start=xmlValue(xml,'StartBoundary');
 const value=x=>x===null?'UNSPECIFIED':x.toLowerCase()==='true';
 const settings=xmlValue(xml,'Settings')??'';
 const triggers=xmlValue(xml,'Triggers')??'';
 const possible=combined.match(/([A-Za-z]:\\[^"<\r\n]*?DATA_CENTER_POWER_R5_SCHEDULED\.cmd)/i);
 return {xmlReadable:true,execCount:exec.length,action,
  // Internal only, removed before reporting.
  _runner:possible?possible[1].replace(/^\s+/,'').trim():null,
  scheduledTime:start?.slice(11,16)??null,
  triggerCount:[...xml.matchAll(/<\w+Trigger(?:\s|>)/g)].length,
  settingsEnabled:value(xmlValue(settings,'Enabled')),
  firstTriggerEnabled:value(xmlValue(triggers,'Enabled')),
  startWhenAvailable:value(xmlValue(settings,'StartWhenAvailable')),
  disallowOnBattery:value(xmlValue(settings,'DisallowStartIfOnBatteries')),
  stopOnBattery:value(xmlValue(settings,'StopIfGoingOnBatteries')),
  logonType:['InteractiveToken','S4U','ServiceAccount'].includes(
   xmlValue(xml,'LogonType'))?xmlValue(xml,'LogonType'):'OTHER',
 };
}

export function summarizeR82Verbose(raw){
 const out={lastRun:null,lastResult:null,nextRun:null};
 for(const line of String(raw).split(/\r?\n/)){
  const m=line.match(/^([^:：]+)[:：]\s*(.*)$/);if(!m)continue;
  const key=m[1].trim(),value=m[2].trim();
  if(/^(?:Last Result|마지막 결과|마지막 실행 결과)$/i.test(key)&&
   /^(?:0x[0-9a-f]+|\d+)$/i.test(value))out.lastResult=value;
  if(value.length>0&&value.length<80&&
    /^[0-9\s\/.\-:,+APMapm\u3130-\u318f\uac00-\ud7af]+$/.test(value)){
   if(/^(?:Last Run Time|마지막 실행 시간|마지막 실행 시각)$/i.test(key))
    out.lastRun=value;
   if(/^(?:Next Run Time|다음 실행 시간|다음 실행 시각)$/i.test(key))
    out.nextRun=value;
  }
 }
 return out;
}

const safeFile=(file,maximum=1_500_000)=>{
 try{const st=fs.lstatSync(file);
  if(!st.isFile()||st.isSymbolicLink()||st.size>maximum)return null;
  return fs.readFileSync(file);
 }catch{return null;}
};

export function summarizeR82Manifest({dataRoot=DATA,themeId,symbols=[]}={}){
 const file=path.join(dataRoot,'themes',themeId,'raw-manifest.json');
 const bytes=safeFile(file,8_000_000);
 if(!bytes)return {status:'MANIFEST_NOT_READABLE'};
 let manifest;try{manifest=JSON.parse(bytes.toString('utf8'));}catch{
  return {status:'MANIFEST_JSON_INVALID'};}
 if(manifest?.version!==1||manifest.themeId!==themeId||
   !Array.isArray(manifest.files))return {status:'MANIFEST_CONTRACT_INVALID'};
 const rows=Object.fromEntries(symbols.map(symbol=>{
  const matching=manifest.files.filter(f=>
   typeof f.path==='string'&&f.path.startsWith('raw/'+symbol+'_'));
  const dates=matching.map(f=>iso(f.observationThrough)).filter(Boolean);
  return [symbol,{pages:matching.length,latestObservationDate:dates.sort().at(-1)??null}];
 }));
 return {status:'MANIFEST_METADATA_READ_ONLY',manifestSha256:hash(bytes),
  totalPages:manifest.files.length,rawFilesIndividuallyRehashed:false,symbols:rows};
}

export function summarizeR82Checkpoint({dataRoot=DATA,themeId}={}){
 const state=path.join(dataRoot,'themes',themeId,'state');
 let names;try{names=fs.readdirSync(state);}catch{
  return {status:'STATE_FOLDER_UNAVAILABLE'};}
 const matches=names.filter(n=>n==='collection-space-r14-missing-only.json'||
  /^collection-[a-f0-9]{16}\.json$/.test(n));
 let recent=null,blocked=0;
 for(const n of matches){
  const f=path.join(state,n),b=safeFile(f,3_000_000);
  if(!b)continue;
  let obj;try{obj=JSON.parse(b.toString('utf8'));}catch{continue;}
  const at=obj.failedAt??obj.recoveredTransient?.at??null;
  if(obj.failedAt)blocked++;
  const stat=fs.statSync(f);
  const item={kind:n==='collection-space-r14-missing-only.json'?'SPACE_R14':'OPTIONAL',
   start:iso(obj.start),end:iso(obj.end),
   failed:!!obj.failedAt,reason:safe(obj.reason),
   modifiedAt:stat.mtime.toISOString(),failedAt:typeof at==='string'&&
    !Number.isNaN(Date.parse(at))?new Date(at).toISOString():null,
   symbolCount:Object.keys(obj.symbols??{}).length};
  if(!recent||stat.mtimeMs>recent.mtimeMs)recent={...item,mtimeMs:stat.mtimeMs};
 }
 if(recent)delete recent.mtimeMs;
 return {status:'CHECKPOINT_METADATA_READ_ONLY',total:matches.length,
  blockedCount:blocked,latest:recent};
}

export function summarizeR82Log(file){
 const bytes=safeFile(file,5_000_000);
 if(!bytes)return {status:'NOT_FOUND'};
 const text=bytes.toString('utf8'),tail=text.slice(-24000);
 const flags=[...new Set((tail.match(/\b(?:STOP|BLOCKED|WAIT|PRIVATE|COLLECTION|PUBLIC|R\d+)_?[A-Z0-9_]{4,110}\b/g)??[])
  .filter(x=>/^(?:STOP_|BLOCKED|WAIT_|PRIVATE_|COLLECTION_|PUBLIC_|R\d+_)/.test(x))
  .slice(-15))];
 const result=tail.match(/RESULT=([A-Z0-9_]{3,120})/g)?.at(-1)?.split('=')[1]??null;
 const exit=tail.match(/CMD_EXIT_CODE=(\d+)/g)?.at(-1)?.split('=')[1]??null;
 const stat=fs.statSync(file);
 return {status:'LOG_SUMMARY_READ_ONLY',bytes:stat.size,
  modifiedAt:stat.mtime.toISOString(),result,exit,flags};
}

function candidateScheduledLog({runner}={}){
 if(!runner||path.win32.basename(runner).toUpperCase()!==
   'DATA_CENTER_POWER_R5_SCHEDULED.CMD')return {status:'RUNNER_NOT_RESOLVED'};
 const absolute=path.win32.normalize(runner);
 if(!path.win32.isAbsolute(absolute)||absolute.includes('..'))
  return {status:'RUNNER_PATH_UNTRUSTED'};
 const file=safeFile(absolute,100_000);
 const report={status:file?'RUNNER_FOUND_READ_ONLY':'RUNNER_MISSING',
  runnerSha256:file?hash(file):null,
  file:'DATA_CENTER_POWER_R5_SCHEDULED.cmd'};
 const log=path.win32.join(path.win32.dirname(absolute),
  'DATA_CENTER_POWER_R5_SCHEDULED_RESULT.txt');
 report.scheduledLog=summarizeR82Log(log);
 return report;
}

const scanSpaceTaskList=raw=>[...new Set(String(raw).split(/\r?\n/)
 .flatMap(line=>(line.match(/ZGMINI-PC-[A-Za-z0-9_-]*(?:Space|Satellite)[A-Za-z0-9_-]*/gi)??[])
  .filter(x=>x.length<=100)))].slice(0,10);

export function collectR82({platform=process.platform,dataRoot=DATA,
 run=(file,args)=>spawnSync(file,args,{
  encoding:null,timeout:24000,maxBuffer:1_500_000,windowsHide:true})}={}){
 const report={report:'THEME_TEN_R82_OPTIONAL_RUNTIME_READONLY',
  inspectedAt:new Date().toISOString(),taskWrites:0,rawWrites:0,
  providerCalls:0,d1Writes:0,scheduleChanges:0,publicationWrites:0};
 if(platform!=='win32')return {...report,status:'STOP_WINDOWS_PC_REQUIRED'};
 const exe=path.win32.join(process.env.SystemRoot||'C:\\Windows',
  'System32','schtasks.exe');
 report.tasks=TASKS.map(name=>{
  const x=run(exe,['/Query','/TN',name,'/XML']);
  const v=run(exe,['/Query','/TN',name,'/V','/FO','LIST']);
  const summary=x?.status===0?summarizeR82Xml(decodeR82Windows(x.stdout)):{xmlReadable:false};
  const runner=summary._runner??null;delete summary._runner;
  const result={task:name,queryXmlExit:x?.status??null,
   queryVerboseExit:v?.status??null,xml:summary,
   run:v?.status===0?summarizeR82Verbose(decodeR82Windows(v.stdout)):null};
  if(name==='ZGMINI-PC-Theme-Data-Center-Power')
   result.approvedRunner=candidateScheduledLog({runner});
  return result;
 });
 const all=run(exe,['/Query','/FO','CSV','/NH']);
 report.possibleSpaceTasks=all?.status===0?
  scanSpaceTaskList(decodeR82Windows(all.stdout)):[];
 report.spaceTaskEnumerationComplete=all?.status===0;
 report.manifests={
  space:summarizeR82Manifest({dataRoot,themeId:SPACE,
   symbols:['UFO','NASA','WARP','ROKT']}),
  dataCenter:summarizeR82Manifest({dataRoot,themeId:DC,
   symbols:['DTCR','GRID','SPY']}),
 };
 report.checkpoints={
  space:summarizeR82Checkpoint({dataRoot,themeId:SPACE}),
  dataCenter:summarizeR82Checkpoint({dataRoot,themeId:DC}),
 };
 report.status='R82_READ_ONLY_COMPLETED_REVIEW_ACTION_AND_CHECKPOINT';
 return report;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  if(process.argv.slice(2).join(' ')!=='--read-only')
   throw Object.assign(new Error('R82_ARGS_INVALID'),{code:'R82_ARGS_INVALID'});
  const result=collectR82();
  console.log(JSON.stringify(result,null,2));
  if(result.status!=='R82_READ_ONLY_COMPLETED_REVIEW_ACTION_AND_CHECKPOINT')
   process.exitCode=1;
 }catch(e){
  console.log(JSON.stringify({report:'THEME_TEN_R82_OPTIONAL_RUNTIME_READONLY',
   status:'STOP_R82',reason:safe(e.code),taskWrites:0,rawWrites:0,
   providerCalls:0,d1Writes:0,scheduleChanges:0}));
  process.exitCode=1;
 }
}
