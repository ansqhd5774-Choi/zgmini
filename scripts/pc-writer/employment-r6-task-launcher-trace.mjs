#!/usr/bin/env node
// R6 read-only Core Task/VBS structure evidence. No Core DB, lock, provider,
// scheduler or deployment mutations. Never emit private paths or script text.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';

const TASK='ZGMINI-PC-Local-Core';
const W=path.win32;
const MAX_XML=2*1024*1024;
const MAX_FILE=64*1024;
const MAX_DEPTH=3;
const MAX_WRAPPERS=8;
const scriptReference=/([a-z]:[\\/][^"'\r\n<>|*?%!]+?\.(?:vbs|cmd|mjs))/gi;
const namedRunner=/^(?:local-cycle|quota-runner|run-local|collect-local)\.mjs$/i;
const auxiliaryRunner=/^(?:archive-run|archive-core)\.mjs$/i;
const safeStatus=(code)=>/^[A-Z][A-Z_0-9]{2,72}$/.test(code)?code:'TRACE_UNCLASSIFIED';
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const fail=code=>{throw Object.assign(new Error(code),{code});};

function decode(bytes){
  if(typeof bytes==='string')return bytes.replace(/^\uFEFF/,'');
  if(!Buffer.isBuffer(bytes))fail('TASK_XML_UNREADABLE');
  if(bytes.length>MAX_XML)fail('TASK_XML_TOO_LARGE');
  if(bytes[0]===0xff&&bytes[1]===0xfe)return bytes.subarray(2).toString('utf16le').replace(/^\uFEFF/,'');
  if(bytes[0]===0xfe&&bytes[1]===0xff)fail('TASK_XML_UNREADABLE');
  return (bytes[1]===0?bytes.toString('utf16le'):bytes.toString('utf8')).replace(/^\uFEFF/,'');
}
function contentOf(xml,tag){
  const found=[...xml.matchAll(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}\\s*>`,'gi'))];
  if(found.length!==1)fail('TASK_ACTION_UNRESOLVED');
  return found[0][1];
}
function xmlDecode(value){
  return value.replace(/&quot;|&#34;/gi,'"').replace(/&apos;|&#39;/gi,"'")
    .replace(/&amp;/gi,'&').replace(/&lt;/gi,'<').replace(/&gt;/gi,'>');
}
function absoluteWin(value){
  return typeof value==='string'&&/^[a-z]:[\\/]/i.test(value)&&W.isAbsolute(value)
    &&!/[<>"|*?%!\r\n]/.test(value);
}
const kindOf=value=>/\.vbs$/i.test(value)?'VBS':/\.cmd$/i.test(value)?'CMD':/\.mjs$/i.test(value)?'MJS':'OTHER';
function scriptRefs(value){
  const refs=new Map();
  for(const match of value.matchAll(scriptReference)){
    const p=W.normalize(match[1]);
    if(!absoluteWin(p))continue;
    refs.set(p.toLowerCase(),p);
  }
  return [...refs.values()];
}
const counts=items=>({VBS:items.filter(p=>kindOf(p)==='VBS').length,
  CMD:items.filter(p=>kindOf(p)==='CMD').length,
  MJS:items.filter(p=>kindOf(p)==='MJS').length});

function parseTask(xml){
  const actionBodies=[...xml.matchAll(/<Actions(?:\s[^>]*)?>([\s\S]*?)<\/Actions\s*>/gi)];
  if(actionBodies.length!==1)fail('TASK_ACTION_UNRESOLVED');
  const actions=actionBodies[0][1];
  const execs=[...actions.matchAll(/<Exec(?:\s[^>]*)?>([\s\S]*?)<\/Exec\s*>/gi)];
  if(execs.length!==1||actions.replace(/<Exec(?:\s[^>]*)?>[\s\S]*?<\/Exec\s*>/gi,'').trim())
    fail('TASK_ACTION_UNRESOLVED');
  const body=execs[0][1];
  const command=xmlDecode(contentOf(body,'Command'));
  const args=/<Arguments(?:\s[^>]*)?>/i.test(body)?xmlDecode(contentOf(body,'Arguments')):'';
  const commandKind=kindOf(command);
  const binary=W.basename(command).toLowerCase();
  let launcher;
  if(commandKind!=='OTHER')launcher=command;
  else if(['wscript.exe','cscript.exe','cmd.exe','node.exe'].includes(binary)){
    const refs=scriptRefs(args);
    if(refs.length!==1)fail('TASK_ENTRY_AMBIGUOUS');
    launcher=refs[0];
  }else fail('TASK_ENTRY_UNRECOGNIZED');
  if(!absoluteWin(launcher))fail('TASK_ENTRY_UNVERIFIED');
  return {runnerType:binary==='wscript.exe'||binary==='cscript.exe'?'WSCRIPT':
    binary==='cmd.exe'?'CMD':binary==='node.exe'?'NODE':commandKind,
    launcher,argumentScriptReferences:counts(scriptRefs(args))};
}

function analyzeWrapper(text,extension){
  const lines=text.split(/\r?\n/).filter(line=>!/^[\s]*(?:'|::|rem\b)/i.test(line));
  const cleaned=lines.join('\n');
  const refs=scriptRefs(cleaned);
  const known=[...new Set(refs.filter(p=>namedRunner.test(W.basename(p)))
    .map(p=>W.basename(p).toLowerCase()))].sort();
  const auxiliary=[...new Set(refs.filter(p=>auxiliaryRunner.test(W.basename(p)))
    .map(p=>W.basename(p).toLowerCase()))].sort();
  const runParen=(cleaned.match(/\.Run\s*\(/gi)??[]).length;
  const runAny=(cleaned.match(/\.Run\b/gi)??[]).length;
  const execAny=(cleaned.match(/\.Exec\b/gi)??[]).length;
  const cmdCall=(cleaned.match(/(?:^|\n)\s*call\b/gim)??[]).length;
  const nodeMentions=(cleaned.match(/\bnode(?:\.exe)?\b/gi)??[]).length;
  return {extension,contentSha256:digest(Buffer.from(text,'utf8')),
    runCalls:runAny,runParenCalls:runParen,runBareCalls:runAny-runParen,
    execCalls:execAny,cmdCalls:cmdCall,nodeMentions,
    referenceCounts:counts(refs),knownCoreRunnerBasenames:known,
    knownAuxiliaryRunnerBasenames:auxiliary,
    markerR38:text.includes('ZGMINI_R38_WRAPPER_V1'),
    markerR7:/\bR7\b|R7[_ -](?:WRAPPER|CORE)|(?:WRAPPER|CORE)[_ -]R7/i.test(text),
    variableInvocation:runAny+execAny+cmdCall>0&&refs.length===0,
    ambiguousStaticReferences:refs.length>1,
    // Internal only; excluded before saving and never logged.
    _refs:refs};
}

/**
 * Purely structural task/wrapper inspection. All returned fields are bounded
 * classifications, counts or content digests; never return raw paths/text.
 */
export function inspectEmploymentR6TaskLauncher({taskXml,readFile,
  fileExists=file=>fs.existsSync(file)}={}){
  const report={kind:'EMPLOYMENT_R6_TASK_LAUNCHER_READONLY_R1',
    taskName:TASK,status:'TASK_QUERY_UNAVAILABLE',actionKind:null,
    argumentScriptReferences:{VBS:0,CMD:0,MJS:0},
    inspectedWrappers:[],knownCoreRunners:[],knownAuxiliaryRunners:[],unresolvedDynamic:false,
    truncated:false,pcCoreWrites:0,taskMutations:0,d1Writes:0,providerCalls:0};
  try{
    const xml=decode(taskXml);
    if(xml.length>MAX_XML)fail('TASK_XML_TOO_LARGE');
    const action=parseTask(xml);
    report.actionKind=action.runnerType;
    report.argumentScriptReferences=action.argumentScriptReferences;
    const candidates=[{file:action.launcher,depth:1}];
    const seen=new Set(),runners=new Set(),auxiliaries=new Set();
    while(candidates.length){
      const {file,depth}=candidates.shift();
      if(!absoluteWin(file))fail('TASK_ENTRY_UNVERIFIED');
      const identity=W.normalize(file).toLowerCase();
      if(seen.has(identity))continue;
      seen.add(identity);
      const ext=kindOf(file);
      if(ext==='MJS'){
        if(namedRunner.test(W.basename(file)))runners.add(W.basename(file).toLowerCase());
        if(auxiliaryRunner.test(W.basename(file)))auxiliaries.add(W.basename(file).toLowerCase());
        continue;
      }
      if(!['VBS','CMD'].includes(ext))fail('TASK_ENTRY_UNRECOGNIZED');
      if(report.inspectedWrappers.length>=MAX_WRAPPERS){report.truncated=true;break;}
      const present=Boolean(fileExists(file));
      if(!present){
        report.inspectedWrappers.push({depth,extension:ext,status:'FILE_NOT_FOUND'});
        continue;
      }
      const raw=readFile(file);
      const bytes=Buffer.isBuffer(raw)?raw:Buffer.from(raw);
      if(bytes.length>MAX_FILE){
        report.inspectedWrappers.push({depth,extension:ext,status:'FILE_TOO_LARGE'});
        continue;
      }
      const content=decode(bytes),analyzed=analyzeWrapper(content,ext),refs=analyzed._refs;
      delete analyzed._refs;
      report.inspectedWrappers.push({depth,bytes:bytes.length,status:'INSPECTED',...analyzed});
      for(const known of analyzed.knownCoreRunnerBasenames)runners.add(known);
      for(const known of analyzed.knownAuxiliaryRunnerBasenames)auxiliaries.add(known);
      report.unresolvedDynamic ||= analyzed.variableInvocation;
      if(depth>=MAX_DEPTH){
        if(refs.some(p=>['VBS','CMD'].includes(kindOf(p))))report.truncated=true;
        continue;
      }
      for(const ref of refs){
        if(['VBS','CMD'].includes(kindOf(ref)))candidates.push({file:ref,depth:depth+1});
      }
    }
    report.knownCoreRunners=[...runners].sort();
    report.knownAuxiliaryRunners=[...auxiliaries].sort();
    report.status=report.truncated?'TRACE_DEPTH_OR_FILE_LIMIT':
      report.inspectedWrappers.length?'WRAPPER_STRUCTURE_INSPECTED':'ENTRY_WITHOUT_WRAPPER';
  }catch(error){
    const recognized=['TASK_QUERY_UNAVAILABLE','TASK_XML_TOO_LARGE','TASK_XML_UNREADABLE',
      'TASK_ACTION_UNRESOLVED','TASK_ENTRY_AMBIGUOUS','TASK_ENTRY_UNRECOGNIZED',
      'TASK_ENTRY_UNVERIFIED'];
    report.status=recognized.includes(error?.code)?error.code:'TASK_READONLY_UNAVAILABLE';
  }
  return report;
}

function queryTask(){
  return execFileSync('schtasks.exe',['/Query','/TN',TASK,'/XML'],{
    windowsHide:true,timeout:15000,maxBuffer:MAX_XML,stdio:['ignore','pipe','ignore'],
  });
}
export function saveEmploymentR6TaskTrace(dir,report,{clock=()=>new Date()}={}){
  if(typeof dir!=='string'||!path.isAbsolute(dir)||!fs.statSync(dir).isDirectory())
    fail('OUTPUT_DIRECTORY_REQUIRED');
  const at=clock().toISOString().replace(/[-:.]/g,'')+'_'+process.pid;
  const basename='EMPLOYMENT_R6_TASK_LAUNCHER_'+at;
  const text=[
    'ZGMINI R6 CORE TASK LAUNCHER - READ ONLY',
    'STATUS: '+report.status,
    'ACTION: '+(report.actionKind??'UNAVAILABLE'),
    'INSPECTED_WRAPPERS: '+report.inspectedWrappers.length,
    'KNOWN_CORE_RUNNERS: '+(report.knownCoreRunners.join(',')||'NONE'),
    'KNOWN_AUXILIARY_RUNNERS: '+(report.knownAuxiliaryRunners.join(',')||'NONE'),
    'DYNAMIC_COMMAND: '+(report.unresolvedDynamic?'YES':'NO'),
    'TRUNCATED: '+(report.truncated?'YES':'NO'),
    ...report.inspectedWrappers.map(w=>[
      'WRAPPER_HOP_'+w.depth+': '+w.extension+' '+w.status,
      'HOP_'+w.depth+'_RUN_CALLS: '+(w.runCalls??0),
      'HOP_'+w.depth+'_RUN_PARENS: '+(w.runParenCalls??0),
      'HOP_'+w.depth+'_RUN_BARE: '+(w.runBareCalls??0),
      'HOP_'+w.depth+'_EXEC_CALLS: '+(w.execCalls??0),
      'HOP_'+w.depth+'_CMD_CALLS: '+(w.cmdCalls??0),
      'HOP_'+w.depth+'_STATIC_VBS: '+(w.referenceCounts?.VBS??0),
      'HOP_'+w.depth+'_STATIC_CMD: '+(w.referenceCounts?.CMD??0),
      'HOP_'+w.depth+'_STATIC_MJS: '+(w.referenceCounts?.MJS??0),
      'HOP_'+w.depth+'_MARKER_R38: '+(w.markerR38?'YES':'NO'),
      'HOP_'+w.depth+'_MARKER_R7: '+(w.markerR7?'YES':'NO'),
    ].join('\n')),
    'PC_CORE_WRITES: 0', 'TASK_MUTATIONS: 0',
    'D1_WRITES: 0','PROVIDER_CALLS: 0',
  ].join('\n')+'\n';
  const txtPath=path.join(dir,basename+'.txt');
  const jsonPath=path.join(dir,basename+'.json');
  fs.writeFileSync(txtPath,text,{encoding:'utf8',flag:'wx'});
  fs.writeFileSync(jsonPath,JSON.stringify(report,null,2)+'\n',{encoding:'utf8',flag:'wx'});
  return {txtPath,jsonPath};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const outputDir=process.argv[2];
  if(!outputDir||process.argv.length!==3){
    process.stderr.write('TRACE_OUTPUT_DIRECTORY_REQUIRED\n');
    process.exitCode=2;
  }else{
    let result;
    try{result=inspectEmploymentR6TaskLauncher({taskXml:queryTask(),
      readFile:p=>fs.readFileSync(p),fileExists:p=>fs.existsSync(p)});}
    catch{
      result=inspectEmploymentR6TaskLauncher({taskXml:''});
      result.status='TASK_QUERY_UNAVAILABLE';
    }
    try{
      const saved=saveEmploymentR6TaskTrace(outputDir,result);
      process.stdout.write('RESULT_TXT: '+path.basename(saved.txtPath)+'\n'+
        'RESULT_JSON: '+path.basename(saved.jsonPath)+'\n'+
        'STATUS: '+safeStatus(result.status)+'\n');
      if(!['WRAPPER_STRUCTURE_INSPECTED','ENTRY_WITHOUT_WRAPPER'].includes(result.status))process.exitCode=2;
    }catch{process.stderr.write('TRACE_REPORT_SAVE_FAILED\n');process.exitCode=2;}
  }
}
