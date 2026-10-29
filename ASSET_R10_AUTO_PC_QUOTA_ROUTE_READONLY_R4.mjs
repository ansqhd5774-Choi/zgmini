// Read-only Core task / quota-runner route audit. Never executes the launcher.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {decodeTaskXml,tag,launcherFromAction,redact} from './ASSET_R10_AUTO_PC_LAUNCHER_READONLY_R3.mjs';

const out=(key,value)=>console.log(`${key}=${String(value??'UNKNOWN').replace(/[\r\n=]/g,'_').slice(0,240)}`);
const readJson=p=>{try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch{return null;}};
const exists=p=>!!p&&fs.existsSync(p);
const git=(cwd,...args)=>{try{return execFileSync('git',['--no-optional-locks',...args],{cwd,encoding:'utf8',windowsHide:true,timeout:15000,stdio:['ignore','pipe','ignore']}).trim();}catch{return null;}};
export function scriptRefs(vbs){
 // Windows paths are input data; don't print script body or command arguments.
 const refs=[...String(vbs).matchAll(/([A-Za-z]:\\[^"'\r\n<>]*?\.(?:mjs|cmd|bat|vbs))/ig)].map(m=>m[1]);
 return [...new Set(refs.map(s=>s.trim().replace(/["']+$/g,'')))];
}
export function gitRootFromScript(p){
 const m=String(p).match(/^([A-Za-z]:\\.+?)\\scripts\\pc-writer\\[^\\]+\.(?:mjs|cmd|bat|vbs)$/i);
 return m?.[1]??null;
}
function run(){
 out('REPORT','ASSET_R10_AUTO_PC_QUOTA_ROUTE_READONLY_R4');
 out('MODE','READ_ONLY_NO_TASK_SOURCE_PROVIDER_OR_D1_WRITES');
 out('CHECKED_AT',new Date().toISOString());
 if(process.platform!=='win32'){out('FINAL_STATUS','STOP_NOT_WINDOWS');return 2;}
 const base=process.env.ZGMINI_PC_HOME??'E:\\ZGmini\\data\\pc-writer';
 const config=readJson(path.win32.join(base,'config.json'));
 if(!config){out('FINAL_STATUS','STOP_CONFIG_UNAVAILABLE');return 2;}
 out('CONFIG_SOURCE_SHA',config.source);
 out('CONFIG_COLLECTION_TARGET',config.collectionTarget);
 let xml;
 try{xml=decodeTaskXml(execFileSync('schtasks.exe',['/Query','/TN','ZGMINI-PC-Local-Core','/XML'],{windowsHide:true,timeout:15000}));}
 catch{out('FINAL_STATUS','STOP_CORE_TASK_UNAVAILABLE');return 2;}
 const wd=tag(xml,'WorkingDirectory'),vbsPath=launcherFromAction(tag(xml,'Arguments'));
 out('TASK_WORKDIR',redact(wd));
 out('TASK_LAUNCHER',redact(vbsPath));
 if(!exists(vbsPath)){out('FINAL_STATUS','STOP_LAUNCHER_MISSING');return 2;}
 const vbs=fs.readFileSync(vbsPath,'utf8');
 const refs=scriptRefs(vbs);
 out('VBS_SCRIPT_REFERENCES',refs.length);
 refs.slice(0,8).forEach((p,i)=>{
  out(`VBS_REF_${i+1}_LOCATION`,redact(p));
  out(`VBS_REF_${i+1}_EXISTS`,exists(p));
 });
 out('VBS_DIRECT_QUOTA_RUNNER',/quota-runner\.mjs/i.test(vbs));
 out('VBS_DIRECT_LOCAL_CYCLE',/local-cycle\.mjs/i.test(vbs));
 out('VBS_DIRECT_RUN_LOCAL',/run-local\.mjs/i.test(vbs));
 out('VBS_PUBLISH_FLAG',/--publish/i.test(vbs));
 out('VBS_REFERENCES_EXTERNAL_BATCH',refs.some(x=>/\.(?:cmd|bat|vbs)$/i.test(x)));
 const candidates=[wd,...refs.map(gitRootFromScript).filter(Boolean)];
 const unique=[...new Set(candidates.filter(Boolean).map(x=>path.win32.normalize(x).toLowerCase()))];
 out('SOURCE_CANDIDATE_COUNT',unique.length);
 const found=[];
 unique.slice(0,6).forEach((candidate,i)=>{
  const n=i+1;
  out(`CANDIDATE_${n}_LOCATION`,redact(candidate));
  const head=git(candidate,'rev-parse','HEAD');
  out(`CANDIDATE_${n}_SHA`,head??'NOT_GIT');
  const dirty=head?git(candidate,'status','--porcelain=v1','--untracked-files=no'):null;
  out(`CANDIDATE_${n}_TRACKED_DIRTY`,dirty===null?'UNKNOWN':dirty.length>0);
  const runLocal=path.win32.join(candidate,'scripts','pc-writer','run-local.mjs');
  const source=exists(runLocal)?fs.readFileSync(runLocal,'utf8'):'';
  const hook=source.includes('publishAssetR10Sidecars')&&source.includes("'asset-r10-sidecars-publication'");
  out(`CANDIDATE_${n}_R10_HOOK`,hook);
  const module=path.win32.join(candidate,'scripts','pc-writer','asset-r10-sidecar-auto-publication-r1.mjs');
  out(`CANDIDATE_${n}_R10_MODULE`,exists(module));
  if(head)found.push({head,hook,dirty});
 });
 const quota=readJson(path.win32.join(base,'quota-runner-last-run.json'));
 out('QUOTA_RUN_STATUS',quota?.status??'NOT_RECORDED');
 out('QUOTA_RUN_AT',quota?.at??'NOT_RECORDED');
 out('QUOTA_RUN_LANE',quota?.lane??'NOT_RECORDED');
 out('QUOTA_RUN_PUBLISH_REQUESTED',quota?.publish??'NOT_RECORDED');
 out('QUOTA_RUN_PUBLISH_ALLOWED',quota?.publishAllowed??'NOT_RECORDED');
 out('QUOTA_RUN_BLOCK',quota?.publishBlock??'NONE');
 out('QUOTA_RUN_CYCLE_STATUS',quota?.publication?.status??'NOT_RECORDED');
 const writer=readJson(path.win32.join(base,'local-writer-last-run.json'));
 out('WRITER_RUN_AT',writer?.at??'NOT_RECORDED');
 out('WRITER_SOURCE_SHA',writer?.source??'NOT_RECORDED');
 out('WRITER_R10_SIDECARS',writer?.assetR10Sidecars?.status??'NOT_RECORDED');
 if(found.some(c=>c.head===config.source)){
  out('CONFIG_APPROVED_SOURCE_FOUND',true);
  const approved=found.find(c=>c.head===config.source);
  out('APPROVED_SOURCE_R10_HOOK',approved.hook);
  out('FINAL_STATUS',approved.hook?'HOOK_PRESENT_REMOTE_READBACK_PENDING':'APPROVED_SOURCE_HOOK_ABSENT_REVIEW_INSTALL');
 }else{
  out('CONFIG_APPROVED_SOURCE_FOUND',false);
  out('FINAL_STATUS','ACTIVE_SOURCE_NEEDS_TARGETED_REVIEW');
 }
 return 0;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 try{process.exitCode=run();}catch(e){out('FINAL_STATUS','STOP_AUDIT_EXCEPTION');out('ERROR_CODE',e?.code??e?.name??'UNKNOWN');process.exitCode=2;}
}
