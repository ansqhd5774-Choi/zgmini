// R15: inspect syntax of the exact scheduled Core VBS after redacting string
// values and absolute paths. Does not execute VBS, edit files or publish.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {parseScheduledLauncher} from './market-calendar-r13-runtime-lineage.mjs';

const json=p=>{try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch{return null;}};
const sha=s=>typeof s==='string'&&/^[0-9a-f]{40}$/i.test(s)?s:null;
const taskXml=()=>{try{
 const b=execFileSync('schtasks.exe',['/Query','/TN','ZGMINI-PC-Local-Core','/XML'],{windowsHide:true,timeout:10000,stdio:['ignore','pipe','ignore']});
 return (b[0]===255&&b[1]===254||b.includes(0)?b.toString('utf16le'):b.toString('utf8')).replace(/^\ufeff/,'');
}catch{return null;}};
function literalKind(raw){
 const s=raw.slice(1,-1).replaceAll('""','"').trim();
 if(/^WScript\.Shell$/i.test(s))return 'PROGID_SHELL';
 if(/^Scripting\.FileSystemObject$/i.test(s))return 'PROGID_FILESYSTEM';
 if(/^WScript\.Network$/i.test(s))return 'PROGID_NETWORK';
 if(/local-cycle\.mjs/i.test(s))return 'ENTRY_LOCAL_CYCLE';
 if(/quota-runner\.mjs/i.test(s))return 'ENTRY_QUOTA_RUNNER';
 if(/run-local\.mjs/i.test(s))return 'ENTRY_RUN_LOCAL';
 if(/collect-local\.mjs/i.test(s))return 'ENTRY_COLLECT_LOCAL';
 if(/node(?:\.exe)?/i.test(s))return 'NODE_LITERAL';
 if(/--publish/i.test(s))return 'PUBLISH_FLAG';
 if(/scripts/i.test(s))return 'SCRIPTS_FRAGMENT';
 if(/pc-writer/i.test(s))return 'PC_WRITER_FRAGMENT';
 if(/\.mjs/i.test(s))return 'MJS_FRAGMENT';
 if(/[\\/]/.test(s))return 'PATH_FRAGMENT';
 if(s===' ')return 'SPACE';
 if(!s)return 'EMPTY';
 return `OTHER_${Math.min(s.length,999)}CH`;
}
export function redactVbsStructure(text){
 if(typeof text!=='string')return[];
 const lines=text.replace(/\r\n/g,'\n').split('\n').slice(0,80);
 return lines.map((line,index)=>{
  if(/\b(?:password|passwd|api[_-]?key|secret|bearer|credential|authorization|access[_-]?token)\b/i.test(line))
   return {line:index+1,shape:'<SENSITIVE_LINE_REDACTED>'};
  let shape=line.replace(/"(?:[^"]|"")*"/g,match=>`<STR:${literalKind(match)}>`);
  shape=shape.replace(/\\\\[^\s"'<>]+/g,'<UNC_PATH>');
  shape=shape.replace(/[a-z]:[\\/][^\s"'<>]*/gi,'<ABS_PATH>');
  shape=shape.replace(/%[a-z_][a-z0-9_]*%/gi,'<ENV>');
  shape=shape.replace(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi,'<EMAIL>');
  shape=shape.replace(/[\u0000-\u001f\u007f]/g,'');
  return {line:index+1,shape:shape.slice(0,200)};
 }).filter(row=>row.shape.trim());
}
export function runR15({dataRoot=process.env.ZGMINI_PC_HOME||String.raw`E:\ZGmini\data\pc-writer`,getTaskXml=taskXml}={}){
 const config=json(path.join(dataRoot,'config.json'));
 const writer=json(path.join(dataRoot,'local-writer-last-run.json'));
 const ledger=json(path.join(dataRoot,'local-publication-ledger.json'));
 const approved=sha(config?.source),xml=getTaskXml(),vbsPath=parseScheduledLauncher(xml);
 let vbs=null;
 try{if(vbsPath)vbs=fs.readFileSync(vbsPath,'utf8');}catch{}
 const skeleton=redactVbsStructure(vbs);
 const verified=approved&&config?.enabled===true&&config?.collectionTarget==='pc'&&writer?.mode==='PUBLISH'&&writer?.status==='VERIFIED'&&sha(writer?.source)===approved&&ledger?.status==='VERIFIED'&&sha(ledger?.source)===approved;
 const words=vbs??'';
 const categories={
  createObject:/\bCreateObject\s*\(/i.test(words),
  shellObject:/WScript\.Shell/i.test(words),
  fileSystemObject:/FileSystemObject/i.test(words),
  wscriptScriptFullName:/WScript\.ScriptFullName/i.test(words),
  getParentFolderName:/GetParentFolderName/i.test(words),
  specialFolder:/SpecialFolders/i.test(words),
  expandEnvironment:/ExpandEnvironmentStrings/i.test(words),
  runMember:/\.\s*Run\b/i.test(words),
  execMember:/\.\s*Exec\b/i.test(words),
  parenthesizedCall:/\.\s*(?:Run|Exec)\s*\(/i.test(words),
  nodeToken:/node(?:\.exe)?/i.test(words),
  mjsToken:/\.mjs\b/i.test(words),
  concatOperator:/\s&\s/.test(words),
  chrQuote:/\bChr\s*\(\s*34\s*\)/i.test(words)
 };
 let decision='REDACTED_TASK_VBS_STRUCTURE_READY_NO_CHANGES_MADE';
 if(!verified)decision='APPROVED_PUBLISHER_NOT_VERIFIED_STOP';
 else if(!vbsPath||vbs===null)decision='EXACT_TASK_VBS_MISSING_STOP';
 return {audit:'MARKET_CALENDAR_R15_VBS_STRUCTURE',at:new Date().toISOString(),
  policy:'READ_ONLY_NO_SCRIPT_EXECUTION_NO_GIT_WRITE_NO_CONFIG_NO_DB_NO_TASK_NO_COLLECT_NO_PUBLISH',
  approvedSource:approved,writer:{status:writer?.status==='VERIFIED'?'VERIFIED':'OTHER',source:sha(writer?.source),at:writer?.at??null},
  task:{xmlRead:Boolean(xml),exactVbsPathParsed:Boolean(vbsPath),vbsRead:vbs!==null,vbsBytes:vbs?.length??null,lineCount:vbs?.replace(/\r\n/g,'\n').split('\n').length??null,categories},
  redactedStructure:skeleton,decision};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const out=process.argv[2];
 if(!out){console.error('MISSING_REPORT_PATH');process.exitCode=2;}
 else try{fs.writeFileSync(out,JSON.stringify(runR15(),null,2)+'\n','utf8');console.log('MARKET_CALENDAR_R15_RESULT_WRITTEN');}
 catch{console.error('MARKET_CALENDAR_R15_EXECUTION_ERROR');process.exitCode=2;}
}
