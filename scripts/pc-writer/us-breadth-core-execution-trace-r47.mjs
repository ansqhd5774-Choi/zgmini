/**
 * R47: strictly read-only Windows Core Task action -> executed launcher trace.
 * Unlike R39's broad textual project candidates, examine executable script
 * statements only. Never print XML, paths, commands, config, credentials or
 * wrapper bodies. This is static provenance, NOT evidence of a live run.
 */
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {decodeTaskXml,parseCoreTaskXml,extractStaticScriptPaths}
  from './us-breadth-core-action-readonly-r39.mjs';

const TASK='ZGMINI-PC-Local-Core';
const HOME=String.raw`E:\ZGmini\data\pc-writer`;
const PROJECTS=String.raw`E:\ZGmini\projects`;
const SHA=/^[a-f0-9]{40}$/i;
const normalized=value=>path.win32.normalize(String(value??'').replaceAll('/','\\'));
const result=(status,detail={})=>({revision:'US_BREADTH_CORE_EXECUTION_TRACE_R47',
  mode:'READ_ONLY_TASK_EXECUTABLE_STATEMENTS',status,staticChainVerified:false,
  liveExecutionVerified:false,providerCalls:0,d1Reads:0,d1Writes:0,
  localWrites:0,taskChanges:0,lockPidActions:0,...detail});

function allowedScript(file){
  const value=normalized(file),lower=value.toLowerCase();
  return /^[a-z]:\\/i.test(value)&&value.length<=350&&!/[\r\n*?%$]/.test(value)
    &&/\.(?:vbs|cmd|bat)$/i.test(value)
    &&(lower.startsWith(HOME.toLowerCase()+'\\')
      ||lower.startsWith(PROJECTS.toLowerCase()+'\\'));
}
const activeLines=source=>String(source).split(/\r?\n/)
  .map(x=>x.trim()).filter(x=>x&&!/^(?:'|rem(?:\s|$)|::)/i.test(x));
function declaredOrigin(source){
  const matches=activeLines(source).map(line=>line.match(/^origin\s*=\s*"([a-z]:\\[^"\r\n]+)"(?:\s*'.*)?$/i))
    .filter(Boolean);
  return matches.length===1?normalized(matches[0][1]):null;
}
function executionEvidence(source){
  const lines=activeLines(source);
  // A URL, quoted comment, or unused string is not an executed entry point.
  const invocations=lines.filter(line=>/\.(?:Run|Exec)\s*\(|\.(?:Run|Exec)\s+|\bcall\s+/i.test(line)
    &&!/\b(?:WScript\.Echo|MsgBox)\b/i.test(line));
  // Installed direct VBS launchers use exactly this unconditional form.
  // Conditional, indirect, or branching forms require human review.
  const recognizedDirectLaunch=invocations.length===1
    &&/^WScript\.Quit\s+shell\.Run\s*\(/i.test(invocations[0])
    &&/E:\\ZGmini\\runtime\\node\.exe/i.test(invocations[0]);
  const hasDynamic=lines.some(line=>/(?:ExpandEnvironmentStrings|\bEnviron\s*\(|%[a-z_]+%|\$\{)/i.test(line));
  const paths=invocations.flatMap(extractStaticScriptPaths)
    .map(normalized);
  const unique=[...new Set(paths.map(x=>x.toLowerCase()))];
  const executablePaths=unique.map(key=>paths.find(p=>p.toLowerCase()===key));
  const textual=extractStaticScriptPaths(source).map(normalized);
  const commentOrNonExecutingReferences=textual.filter(p=>
    !executablePaths.some(x=>x.toLowerCase()===p.toLowerCase())).length;
  return {executionLines:invocations.length,executablePaths,
    commentOrNonExecutingReferences,hasDynamic,recognizedDirectLaunch};
}
function projectForEntry(file){
  const normalizedPath=normalized(file);
  const escaped=normalizedPath.replaceAll('\\','/');
  const match=escaped.match(/^E:\/ZGmini\/projects\/([a-zA-Z0-9._-]+)\/scripts\/pc-writer\/local-cycle\.mjs$/i);
  return match?path.win32.join(PROJECTS,match[1]):null;
}

/** Injection points are test-only. Runtime sources are read from Task action. */
export function traceCoreExecutionR47({taskXml,config,readScript=()=>null,
  readGit=()=>null}={}){
  const task=parseCoreTaskXml(taskXml);
  if(task.status!=='TASK_XML_READ')return result('TASK_XML_NOT_VERIFIED');
  const taskOK=task.triggerPT5M===true&&task.ignoreNew===true;
  if(!taskOK)return result('CORE_TASK_POLICY_UNVERIFIED',{taskPolicyVerified:false});
  if(!['wscript.exe','cscript.exe'].includes(path.win32.basename(task.command).toLowerCase()))
    return result('TASK_ACTION_NOT_WINDOWS_SCRIPT_HOST',{taskPolicyVerified:true});
  const wrappers=extractStaticScriptPaths(task.arguments).filter(x=>/\.vbs$/i.test(x));
  if(wrappers.length!==1||!allowedScript(wrappers[0]))
    return result('REGISTERED_LAUNCHER_NOT_UNIQUE_OR_UNAPPROVED',{taskPolicyVerified:true});

  let wrapper;
  try{wrapper=readScript(wrappers[0]);}catch{}
  if(typeof wrapper!=='string'||wrapper.length<1||wrapper.length>65_536)
    return result('REGISTERED_LAUNCHER_UNREADABLE',{taskPolicyVerified:true});
  const r38=wrapper.includes('ZGMINI_R38_WRAPPER_V1');
  let executed=wrapper;
  let wrapperOrigin='DIRECT_REGISTERED_WRAPPER';
  if(r38){
    const origin=declaredOrigin(wrapper);
    if(!origin||!allowedScript(origin)||origin.toLowerCase()===normalized(wrappers[0]).toLowerCase())
      return result('R38_ORIGIN_NOT_STATICALLY_APPROVED',{taskPolicyVerified:true});
    // R38 origin is a candidate until its launcher action is itself proven.
    try{executed=readScript(origin);}catch{executed=null;}
    if(typeof executed!=='string'||!executed||executed.length>65_536)
      return result('R38_ORIGIN_UNREADABLE',{taskPolicyVerified:true});
    wrapperOrigin='R38_LITERAL_ORIGIN';
  }
  const scan=executionEvidence(executed);
  const evidence={taskPolicyVerified:true,launcherOrigin:wrapperOrigin,
    executableInvocationLines:scan.executionLines,
    executableScriptReferences:scan.executablePaths.length,
    nonExecutingScriptReferences:scan.commentOrNonExecutingReferences,
    dynamicCommandPresent:scan.hasDynamic,
    approvedShaMatch:null,gitClean:null,projectFingerprint:null};
  if(scan.hasDynamic)return result('DYNAMIC_EXECUTION_NOT_PROVEN',evidence);
  if(scan.executionLines!==1||scan.executablePaths.length!==1)
    return result('EXECUTABLE_ENTRY_NOT_UNIQUE',evidence);
  if(!scan.recognizedDirectLaunch)
    return result('INDIRECT_OR_CONDITIONAL_LAUNCH_NOT_PROVEN',evidence);
  const project=projectForEntry(scan.executablePaths[0]);
  if(!project)return result('EXECUTABLE_ENTRY_NOT_CORE_LOCAL_CYCLE',evidence);
  evidence.projectFingerprint=createHash('sha256')
    .update(project.toLowerCase()).digest('hex').slice(0,12);
  let git;
  try{git=readGit(project);}catch{}
  evidence.approvedShaMatch=SHA.test(config?.source??'')&&SHA.test(git?.head??'')
    ?config.source.toLowerCase()===git.head.toLowerCase():null;
  evidence.gitClean=typeof git?.clean==='boolean'?git.clean:null;
  const configOK=config?.enabled===true&&config.collectionTarget==='pc';
  if(evidence.approvedShaMatch!==true||evidence.gitClean!==true||!configOK)
    return result('PC_SOURCE_CONFIG_OR_CLEAN_NOT_VERIFIED',{...evidence,
      configEnabled:config?.enabled===true,configTargetPc:config?.collectionTarget==='pc'});
  // R38 origin relation may be dynamically dispatched; do not assert it ran.
  if(r38)return result('R38_ORIGIN_CANDIDATE_NEEDS_LAUNCH_PROOF',evidence);
  return result('APPROVED_CORE_STATIC_ACTION_CHAIN',{
    ...evidence,staticChainVerified:true});
}

function readSmall(file){
  if(!allowedScript(file))return null;
  try{const st=fs.lstatSync(file);if(!st.isFile()||st.isSymbolicLink()||st.size>65_536)
      return null;
    return fs.readFileSync(file,'utf8');}catch{return null;}
}
function localConfig(){
  try{const name=path.win32.join(HOME,'config.json');
    const st=fs.lstatSync(name);if(!st.isFile()||st.size>2_000_000)return null;
    const config=JSON.parse(fs.readFileSync(name,'utf8'));
    return {enabled:config?.enabled,collectionTarget:config?.collectionTarget,
      source:config?.source};}catch{return null;}
}
function readGit(root){
  const opts={cwd:root,encoding:'utf8',windowsHide:true,timeout:12_000,
    maxBuffer:1_000_000,env:{...process.env,GIT_OPTIONAL_LOCKS:'0'}};
  const head=execFileSync('git.exe',['rev-parse','HEAD'],opts).trim();
  const clean=execFileSync('git.exe',['--no-optional-locks','status','--porcelain'],opts).trim()==='';
  return {head,clean};
}
export function inspectCoreExecutionR47(){
  if(process.platform!=='win32')return result('WINDOWS_PC_REQUIRED');
  let taskXml;
  try{taskXml=decodeTaskXml(execFileSync('schtasks.exe',['/Query','/TN',TASK,'/XML'],
    {windowsHide:true,timeout:20_000,maxBuffer:1_000_000}));}
  catch{return result('TASK_XML_QUERY_FAILED');}
  return traceCoreExecutionR47({taskXml,config:localConfig(),readScript:readSmall,readGit});
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const output=process.argv.length===3&&process.argv[2]==='--inspect-only'
    ?inspectCoreExecutionR47():result('EXPLICIT_INSPECT_ONLY_FLAG_REQUIRED');
  process.stdout.write(JSON.stringify(output)+'\n');
  if(!['APPROVED_CORE_STATIC_ACTION_CHAIN',
    'R38_ORIGIN_CANDIDATE_NEEDS_LAUNCH_PROOF'].includes(output.status))process.exitCode=2;
}
