// Diagnoses the registered Core launcher without mutating tasks, source or D1.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';

const BASE_DEFAULT='E:\\ZGmini\\data\\pc-writer';
const CORE_TASK='ZGMINI-PC-Local-Core';
const REQUIRED=['scripts/pc-writer/ASSET_R10_RAW_PREFLIGHT_R1.mjs','scripts/pc-writer/ASSET_R10_1Y_HISTORY_READONLY_R1.mjs','worker/asset-bubble-r10-raw-r1.mjs','worker/asset-bubble-r10-history-r1.mjs','worker/market-public-projection-store.mjs'];
const say=(k,v)=>process.stdout.write(`${k}=${String(v??'UNKNOWN').replace(/[\r\n=]/g,'_').slice(0,240)}\n`);
const xmlDecode=s=>String(s??'').replace(/&quot;/gi,'"').replace(/&apos;/gi,"'").replace(/&amp;/gi,'&').replace(/&lt;/gi,'<').replace(/&gt;/gi,'>');
const readJson=p=>{try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch{return null;}};
const digest=s=>crypto.createHash('sha256').update(s).digest('hex');
const exists=p=>!!p&&fs.existsSync(p);
const real=p=>{try{return fs.realpathSync.native(p);}catch{return null;}};
const git=(root,args)=>{try{return execFileSync('git',['--no-optional-locks',...args],{cwd:root,windowsHide:true,timeout:15000,encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();}catch{return null;}};

export function decodeTaskXml(bytes){
 const b=Buffer.isBuffer(bytes)?bytes:Buffer.from(bytes);
 if(b.length>1&&b[0]===0xff&&b[1]===0xfe)return b.subarray(2).toString('utf16le');
 if(b.length>1&&b[0]===0x3c&&b[1]===0)return b.toString('utf16le');
 return b.toString('utf8');
}
export function tag(xml,key){return xmlDecode(xml.match(new RegExp(`<${key}>([\\s\\S]*?)<\\/${key}>`,'i'))?.[1]??'');}
export function launcherFromAction(args){
 const quoted=String(args).match(/"([A-Za-z]:\\[^"\r\n]*?\.vbs)"/i);
 return quoted?.[1]??String(args).match(/([A-Za-z]:\\[^"\r\n]*?\.vbs)/i)?.[1]??null;
}
export function cycleFromVbs(s){return String(s).match(/([A-Za-z]:\\[^"\r\n]*?\\scripts\\pc-writer\\local-cycle\.mjs)/i)?.[1]??null;}
export function canonical(p){return p?path.win32.normalize(String(p).replace(/^\\\\\?\\/,'')).toLowerCase():null;}
export function redact(p){return String(p??'UNRESOLVED').replace(/([a-z]:\\users\\)[^\\]+/gi,'$1[USER]').replace(/[\r\n]/g,'_');}

function run(){
 say('REPORT','ASSET_R10_AUTO_PC_LAUNCHER_READONLY_R3');
 say('MODE','READ_ONLY_NO_PROVIDER_NO_D1_NO_TASK_OR_SOURCE_WRITES');
 say('CHECKED_AT',new Date().toISOString());
 if(process.platform!=='win32'){say('FINAL_STATUS','STOP_NOT_WINDOWS');return 2;}
 const base=process.env.ZGMINI_PC_HOME??BASE_DEFAULT;
 const config=readJson(path.win32.join(base,'config.json'));
 say('CONFIG_PRESENT',!!config);
 say('PC_HOME_LOCATION',redact(base));
 say('PC_HOME_SOURCE_SHA',config?.source??'UNKNOWN');
 say('COLLECTION_TARGET',config?.collectionTarget??'UNKNOWN');
 if(!config){say('FINAL_STATUS','STOP_CONFIG_UNAVAILABLE');return 2;}
 let xml;
 try{xml=decodeTaskXml(execFileSync('schtasks.exe',['/Query','/TN',CORE_TASK,'/XML'],{windowsHide:true,timeout:20000}));}
 catch{say('FINAL_STATUS','STOP_CORE_TASK_UNAVAILABLE');return 2;}
 const command=tag(xml,'Command'),args=tag(xml,'Arguments'),workDir=tag(xml,'WorkingDirectory');
 const actual=launcherFromAction(args),expected=path.win32.join(base,'run-local-core.vbs');
 const actualReal=real(actual),expectedReal=real(expected);
 const pathsMatch=!!actualReal&&!!expectedReal&&canonical(actualReal)===canonical(expectedReal);
 say('TASK_COMMAND_BASENAME',path.win32.basename(command));
 say('TASK_WORKDIR_LOCATION',redact(workDir));
 say('TASK_LAUNCHER_LOCATION',redact(actual));
 say('EXPECTED_LAUNCHER_LOCATION',redact(expected));
 say('TASK_LAUNCHER_EXISTS',exists(actual));
 say('EXPECTED_LAUNCHER_EXISTS',exists(expected));
 say('TASK_LAUNCHER_REALPATH',redact(actualReal));
 say('EXPECTED_LAUNCHER_REALPATH',redact(expectedReal));
 say('TASK_LAUNCHER_REALPATH_MATCHES_PC_HOME',pathsMatch);
 const actualVbs=actualReal?fs.readFileSync(actualReal,'utf8'):null;
 const expectedVbs=expectedReal?fs.readFileSync(expectedReal,'utf8'):null;
 const contentsMatch=!!actualVbs&&!!expectedVbs&&digest(actualVbs)===digest(expectedVbs);
 say('VBS_CONTENT_EQUAL',contentsMatch);
 say('TASK_VBS_HAS_PUBLISH',!!actualVbs&&actualVbs.includes('--publish'));
 const cycle=actualVbs?cycleFromVbs(actualVbs):null;
 const root=cycle?path.win32.resolve(path.win32.dirname(cycle),'..','..'):null;
 say('TASK_VBS_CYCLE_LOCATION',redact(cycle));
 say('TASK_CYCLE_FILE_EXISTS',exists(cycle));
 say('TASK_SOURCE_ROOT',redact(root));
 const head=root&&exists(cycle)?git(root,['rev-parse','HEAD']):null;
 const tracked=head?git(root,['status','--porcelain=v1','--untracked-files=no']):null;
 say('TASK_SOURCE_HEAD',head??'UNRESOLVED');
 say('CONFIG_SOURCE_MATCHES_TASK_HEAD',!!head&&head===config.source);
 say('TASK_SOURCE_TRACKED_DIRTY',tracked===null?'UNKNOWN':tracked.length>0);
 const runLocal=root?path.win32.join(root,'scripts','pc-writer','run-local.mjs'):null;
 const src=exists(runLocal)?fs.readFileSync(runLocal,'utf8'):'';
 const hook=src.includes("'asset-r10-sidecars-publication'")&&src.includes('publishAssetR10Sidecars');
 const deps=root?REQUIRED.filter(rel=>exists(path.win32.join(root,...rel.split('/')))):[];
 say('TASK_SOURCE_R10_HOOK_PRESENT',hook);
 say('TASK_SOURCE_R10_MODULE_PRESENT',root?exists(path.win32.join(root,'scripts','pc-writer','asset-r10-sidecar-auto-publication-r1.mjs')):'UNKNOWN');
 say('TASK_SOURCE_DEPENDENCIES_PRESENT',root?`${deps.length}/${REQUIRED.length}`:'UNKNOWN');
 const writer=readJson(path.win32.join(base,'local-writer-last-run.json'));
 const cycleLast=readJson(path.win32.join(base,'local-cycle-last-run.json'));
 say('WRITER_LAST_AT',writer?.at??'UNKNOWN');
 say('WRITER_LAST_SOURCE_SHA',writer?.source??'UNKNOWN');
 say('WRITER_LAST_R10_SIDECAR_STATUS',writer?.assetR10Sidecars?.status??'NOT_RECORDED');
 say('CORE_CYCLE_LAST_AT',cycleLast?.at??'UNKNOWN');
 say('CORE_CYCLE_LAST_STATUS',cycleLast?.status??'UNKNOWN');
 let verdict='STOP_TASK_PATH_NEEDS_REVIEW';
 if(!actualReal)verdict='STOP_REGISTERED_LAUNCHER_UNAVAILABLE';
 else if(!cycle||!exists(cycle))verdict='STOP_REGISTERED_CYCLE_UNAVAILABLE';
 else if(!head)verdict='STOP_REGISTERED_SOURCE_UNAVAILABLE';
 else if(head!==config.source||tracked===null||tracked.length>0)verdict='STOP_ACTIVE_SOURCE_APPROVAL_MISMATCH';
 else if(hook)verdict='HOOK_PRESENT_CHECK_RUNTIME_READBACK';
 else if(pathsMatch)verdict='READY_FOR_SELECTIVE_HOOK_INSTALL_REVIEW';
 // A path mismatch is never silently fixed or accepted as installation approval.
 say('FINAL_STATUS',verdict);
 return verdict.startsWith('STOP_')?2:0;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 try{process.exitCode=run();}catch(e){say('FINAL_STATUS','STOP_INSPECTION_EXCEPTION');say('ERROR_CODE',e?.code??e?.name??'UNKNOWN');process.exitCode=2;}
}
