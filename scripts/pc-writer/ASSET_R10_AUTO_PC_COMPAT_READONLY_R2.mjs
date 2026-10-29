// R10 PC source compatibility inspection. No network, provider, D1, task or source writes.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';

const MAIN_R10_SHA='8a7634a5358cb19280725fe29a977ba4feb44be8';
const REQUIRED=[
 'scripts/pc-writer/ASSET_R10_RAW_PREFLIGHT_R1.mjs',
 'scripts/pc-writer/ASSET_R10_1Y_HISTORY_READONLY_R1.mjs',
 'worker/asset-bubble-r10-raw-r1.mjs',
 'worker/asset-bubble-r10-history-r1.mjs',
 'worker/market-public-projection-store.mjs',
];
const say=(key,value)=>console.log(`${key}=${value}`);
const clean=v=>String(v??'UNKNOWN').replace(/[\r\n=]/g,'_').slice(0,180);

export function decodeTaskXml(bytes){
 const b=Buffer.isBuffer(bytes)?bytes:Buffer.from(bytes);
 if(b.length>=2&&b[0]===0xff&&b[1]===0xfe)return b.subarray(2).toString('utf16le');
 if(b.length>=2&&b[0]===0x3c&&b[1]===0)return b.toString('utf16le');
 return b.toString('utf8');
}
export function taskArguments(xml){
 const text=xml.match(/<Arguments>([\s\S]*?)<\/Arguments>/i)?.[1]??'';
 return text.replace(/&quot;/gi,'"').replace(/&amp;/gi,'&').replace(/&lt;/gi,'<').replace(/&gt;/gi,'>');
}
export function launcherFromTask(xml){
 const args=taskArguments(xml);
 const match=args.match(/"([A-Za-z]:\\[^"\r\n]+\.vbs)"/i);
 return match?.[1]??null;
}
export function cycleFromLauncher(vbs){
 // Normal VBS escaped quotes are doubled; consume only the path up to a quote.
 return vbs.match(/([A-Za-z]:\\[^"\r\n]*?\\scripts\\pc-writer\\local-cycle\.mjs)/i)?.[1]??null;
}
export function classifyInspection({configMatches,taskLinked,trackedDirty,hook,anchorCount,prerequisites}){
 if(!configMatches||!taskLinked||trackedDirty||!prerequisites)return 'STOP_SOURCE_REVIEW_REQUIRED';
 if(hook)return 'HOOK_PRESENT_RUNTIME_VERIFICATION_REQUIRED';
 return anchorCount===1?'READY_FOR_SELECTIVE_INSTALL_REVIEW':'STOP_PATCH_ANCHOR_MISMATCH';
}

function git(root,args){return execFileSync('git',['--no-optional-locks',...args],{cwd:root,encoding:'utf8',windowsHide:true,timeout:20000}).trim();}
function tryGit(root,args){try{return git(root,args);}catch{return null;}}
function safeJson(file){try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return null;}}
function real(file){try{return fs.realpathSync.native(file);}catch{return null;}}
function run(){
 say('REPORT','ASSET_R10_AUTO_PC_COMPAT_READONLY_R2');
 say('MODE','READ_ONLY_NO_PROVIDER_NO_D1_NO_SOURCE_OR_TASK_WRITES');
 say('CHECKED_AT',new Date().toISOString());
 if(process.platform!=='win32'){say('FINAL_STATUS','STOP_NOT_WINDOWS');return 2;}
 const base=process.env.ZGMINI_PC_HOME??'E:\\ZGmini\\data\\pc-writer';
 const config=safeJson(path.join(base,'config.json'));
 if(!config){say('FINAL_STATUS','STOP_CONFIG_UNAVAILABLE');return 2;}
 const approved=/^[a-f0-9]{40}$/.test(config.source??'')?config.source:null;
 say('CONFIG_PRESENT',true);
 say('CONFIG_COLLECTION_TARGET',clean(config.collectionTarget));
 say('CONFIG_ENABLED',config.enabled===true);
 say('CONFIG_SOURCE_SHA',approved??'INVALID');
 let xml;
 try{xml=decodeTaskXml(execFileSync('schtasks.exe',['/Query','/TN','ZGMINI-PC-Local-Core','/XML'],{windowsHide:true,timeout:20000}));}
 catch{say('FINAL_STATUS','STOP_CORE_TASK_UNAVAILABLE');return 2;}
 const taskArgs=taskArguments(xml),launcher=launcherFromTask(xml);
 say('TASK_CORE_HAS_LAUNCHER',!!launcher);
 say('TASK_CORE_VBS_BASENAME',launcher?path.win32.basename(launcher):'UNRESOLVED');
 say('TASK_CORE_PUBLISH_ARGUMENT',taskArgs.includes('run-local-core.vbs'));
 const expectedLauncher=real(path.join(base,'run-local-core.vbs'));
 const actualLauncher=launcher?real(launcher):null;
 const launcherMatches=!!actualLauncher&&!!expectedLauncher&&actualLauncher.toLowerCase()===expectedLauncher.toLowerCase();
 say('TASK_LAUNCHER_MATCHES_PC_HOME',launcherMatches);
 if(!launcherMatches){say('FINAL_STATUS','STOP_TASK_LAUNCHER_MISMATCH');return 2;}
 let vbs;
 try{vbs=fs.readFileSync(actualLauncher,'utf8');}catch{say('FINAL_STATUS','STOP_LAUNCHER_UNREADABLE');return 2;}
 const cycleFile=cycleFromLauncher(vbs);
 const root=cycleFile?path.win32.resolve(path.win32.dirname(cycleFile),'..','..'):null;
 const linked=!!cycleFile&&!!root&&!!real(cycleFile)&&!!real(path.win32.join(root,'AGENTS.md'));
 say('LAUNCHER_POINTS_TO_LOCAL_CYCLE',linked);
 say('RUNNER_PUBLISH_ARGUMENT',vbs.includes('--publish'));
 if(!linked||!vbs.includes('--publish')){say('FINAL_STATUS','STOP_CORE_ENTRY_UNRESOLVED');return 2;}
 const head=tryGit(root,['rev-parse','HEAD']);
 const tracked=tryGit(root,['status','--porcelain=v1','--untracked-files=no']);
 const trackedDirty=tracked===null||tracked.length>0;
 const sourceResolved=approved&&tryGit(root,['cat-file','-t',approved])==='commit';
 say('ACTIVE_SOURCE_SHA',head??'UNKNOWN');
 say('CONFIG_MATCHES_ACTIVE_SHA',approved===head);
 say('APPROVED_COMMIT_LOCAL_OBJECT',!!sourceResolved);
 say('TRACKED_WORKTREE_DIRTY',trackedDirty);
 say('TARGET_MAIN_OBJECT_PRESENT',tryGit(root,['cat-file','-t',MAIN_R10_SHA])==='commit');
 const file=path.win32.join(root,'scripts','pc-writer','run-local.mjs');
 const src=fs.existsSync(file)?fs.readFileSync(file,'utf8'):'';
 const hook=src.includes("'asset-r10-sidecars-publication'")&&src.includes('publishAssetR10Sidecars');
 const anchor='// Reuse the existing public snapshot table; publish only the bounded display score.';
 const anchorCount=src.split(anchor).length-1;
 const missing=REQUIRED.filter(p=>!fs.existsSync(path.win32.join(root,...p.split('/'))));
 const untrackedPrerequisites=REQUIRED.filter(p=>tryGit(root,['ls-files','--error-unmatch','--',p])===null);
 say('SIDECAR_AUTO_HOOK_PRESENT',hook);
 say('HOOK_INSERTION_ANCHOR_COUNT',anchorCount);
 say('DEPENDENCY_FILES_PRESENT',REQUIRED.length-missing.length+'/'+REQUIRED.length);
 say('MISSING_DEPENDENCIES',missing.length?missing.join(','):'NONE');
 say('DEPENDENCIES_TRACKED_IN_GIT',REQUIRED.length-untrackedPrerequisites.length+'/'+REQUIRED.length);
 for(const rel of ['scripts/pc-writer/run-local.mjs','scripts/pc-writer/asset-r10-sidecar-auto-publication-r1.mjs']){
  const exists=fs.existsSync(path.win32.join(root,...rel.split('/')));
  say(rel.endsWith('run-local.mjs')?'RUN_LOCAL_EXISTS':'SIDECAR_MODULE_EXISTS',exists);
 }
 const writer=safeJson(path.join(base,'local-writer-last-run.json'));
 const cycle=safeJson(path.join(base,'local-cycle-last-run.json'));
 say('LAST_WRITER_AT',clean(writer?.at));
 say('LAST_WRITER_STATUS',clean(writer?.status));
 say('LAST_WRITER_SOURCE_SHA',clean(writer?.source));
 say('LAST_WRITER_R10_SIDECARS',clean(writer?.assetR10Sidecars?.status??'NOT_RECORDED'));
 say('LAST_WRITER_RAW_KEY',clean(writer?.assetR10Sidecars?.keys?.raw??'NOT_RECORDED'));
 say('LAST_WRITER_HISTORY_KEY',clean(writer?.assetR10Sidecars?.keys?.history??'NOT_RECORDED'));
 say('LAST_CYCLE_AT',clean(cycle?.at));
 say('LAST_CYCLE_STATUS',clean(cycle?.status));
 const verdict=classifyInspection({
  configMatches:approved===head&&!!sourceResolved&&config.collectionTarget==='pc'&&config.enabled===true,
  taskLinked:linked&&launcherMatches&&vbs.includes('--publish'),trackedDirty,hook,anchorCount,
  prerequisites:missing.length===0&&untrackedPrerequisites.length===0,
 });
 say('FINAL_STATUS',verdict);
 return verdict.startsWith('STOP_')?2:0;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 try{process.exitCode=run();}
 catch(error){say('FINAL_STATUS','STOP_INSPECTION_EXCEPTION');say('ERROR_CODE',clean(error?.code??error?.name));process.exitCode=2;}
}
