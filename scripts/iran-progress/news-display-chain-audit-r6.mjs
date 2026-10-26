// Read-only R13 scheduler -> VBS -> Node source lineage inspection.
// No file contents, absolute paths, arguments or credentials are printed.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const home=process.env.ZGMINI_IRAN_HOME??path.join(os.homedir(),'.zgmini','iran-progress-r13');
const task='ZGMINI-PC-Iran-Progress-R13';
const digest=s=>createHash('sha256').update(s).digest('hex');
function xmlText(xml,tag){
 const match=xml.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`,'i'));
 return match?.[1]?.replace(/&(amp|lt|gt|quot|apos);/g,(_,n)=>({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"})[n])??'';
}
export function decodeTaskXml(buffer){
 if(!Buffer.isBuffer(buffer))throw Error('TASK_NOT_BUFFER');
 if(buffer[0]===255&&buffer[1]===254)return buffer.subarray(2).toString('utf16le');
 if(buffer[0]===254&&buffer[1]===255){const swapped=Buffer.from(buffer.subarray(2));swapped.swap16();return swapped.toString('utf16le');}
 if(buffer[1]===0&&buffer[3]===0)return buffer.toString('utf16le');
 return buffer.toString('utf8');
}
export function describeSchedulerXml(xml){
 if(!/<Task\b/.test(xml))throw Error('NOT_TASK_XML');
 const command=xmlText(xml,'Command'),args=xmlText(xml,'Arguments');
 const hours=[...xml.matchAll(/<StartBoundary>(?:\d{4}-\d{2}-\d{2})T(\d{2}):\d{2}/gi)].map(x=>Number(x[1]));
 const pathMatch=args.match(/"([^"\r\n]+\.vbs)"/i);
 return {executable:path.win32.basename(command),launcherPath:pathMatch?.[1]??null,
  scheduleHours:[...new Set(hours)].sort((a,b)=>a-b),
  originalScheduleUntouched:true};
}
export function parseLauncherScript(vbs){
 if(typeof vbs!=='string'||vbs.length>20000||!vbs.includes('WScript'))throw Error('LAUNCHER_FORMAT_UNVERIFIED');
 const calls=[...vbs.matchAll(/shell\.Run\s*\(/gi)];
 if(calls.length!==1)throw Error('LAUNCHER_SHELL_RUN_COUNT_UNVERIFIED');
 // The first .mjs after node.exe is the entrypoint. Later .mjs paths may be
 // --legacy-runner=, --collector=, etc. They are inputs, not extra entrypoints.
 const command=vbs.slice(calls[0].index);
 const scripts=[...command.matchAll(/([a-z]:\\[^"\r\n]+?\.mjs)/gi)].map(m=>({path:m[1],index:m.index}));
 if(scripts.length===0)throw Error('LAUNCHER_NODE_ENTRY_NOT_FOUND');
 if(!/node\.exe/i.test(command.slice(0,scripts[0].index)))throw Error('LAUNCHER_NODE_BINARY_NOT_VERIFIED');
 return {scriptPath:scripts[0].path,scriptBase:path.win32.basename(scripts[0].path),otherScriptReferenceCount:scripts.length-1};
}
function safeRead(file,max){
 const stat=fs.lstatSync(file);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.size>max)throw Error('FILE_UNSAFE_OR_TOO_LARGE');
 return fs.readFileSync(file,'utf8');
}
function repositorySha(scriptPath){
 const project=path.resolve(path.dirname(scriptPath),'../..');
 const run=spawnSync('git.exe',['-C',project,'rev-parse','HEAD'],{encoding:'utf8',windowsHide:true,timeout:5000,maxBuffer:8192});
 const sha=run.status===0?run.stdout.trim():'';
 return /^[a-f0-9]{40}$/.test(sha)?sha:null;
}
export function auditChain({taskXml,newsHome=home}={}){
 const result={status:'NEEDS_REVIEW',readOnly:true,task};
 const info=describeSchedulerXml(taskXml);
 result.scheduler={found:true,executable:info.executable,scheduleHours:info.scheduleHours,modified:false};
 if(info.executable.toLowerCase()!=='wscript.exe'||!info.launcherPath)throw Error('SCHEDULER_ACTION_UNRECOGNIZED');
 const launcher=info.launcherPath;
 if(!['run.vbs','run-articles.vbs'].includes(path.win32.basename(launcher).toLowerCase()))throw Error('LAUNCHER_NAME_UNEXPECTED');
 // Resolve C: compatibility junction vs E: target before reading the VBS.
 const actual=fs.realpathSync.native(path.dirname(launcher));
 const expected=fs.realpathSync.native(newsHome);
 if(actual.toLowerCase()!==expected.toLowerCase())throw Error('LAUNCHER_NEWS_HOME_MISMATCH');
 const vbs=safeRead(launcher,20000);
 const parsed=parseLauncherScript(vbs);
 result.launcher={found:true,name:path.win32.basename(launcher),sha256:digest(vbs),homeMatched:true,modified:false};
 if(!['run-reference-flow-r3.mjs','run-reference-flow.mjs'].includes(parsed.scriptBase.toLowerCase()))throw Error('ACTIVE_NODE_RUNNER_UNEXPECTED');
 const script=safeRead(parsed.scriptPath,200000);
 result.runner={found:true,name:parsed.scriptBase,sha256:digest(script),gitHead:repositorySha(parsed.scriptPath),otherScriptReferenceCount:parsed.otherScriptReferenceCount,
  directR3Wrapper:parsed.scriptBase.toLowerCase()==='run-reference-flow-r3.mjs',
  referencesR3Operation:script.includes('operate-r3.mjs'),
  referencesNewsDisplayMaintenance:script.includes('news-display-maintenance-r1.mjs'),modified:false};
 result.status='PASS_RUNNER_CHAIN_READ_ONLY';
 return result;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.length!==3||process.argv[2]!=='--read-only')throw Error('READ_ONLY_FLAG_REQUIRED');
 try{
  const query=spawnSync('schtasks.exe',['/Query','/TN',task,'/XML'],{encoding:'buffer',windowsHide:true,timeout:20000,maxBuffer:1024*1024});
  if(query.error||query.status!==0)throw Error('SCHEDULER_QUERY_FAILED');
  const report=auditChain({taskXml:decodeTaskXml(query.stdout)});
  console.log(JSON.stringify(report));
 }catch(error){console.error(JSON.stringify({status:'STOP_RUNNER_CHAIN_READ_ONLY',reason:error.message,readOnly:true}));process.exitCode=1;}
}
