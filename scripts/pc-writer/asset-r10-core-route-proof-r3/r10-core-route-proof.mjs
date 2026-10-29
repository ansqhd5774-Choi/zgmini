// Precise, read-only VBS/lock follow-up. Writes only its own diagnostic result.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const DIR=path.dirname(fileURLToPath(import.meta.url));
const OUT=path.join(DIR,'ASSET_R10_CORE_ROUTE_PROOF_RESULT.txt');
const HOME='E:\\ZGmini\\data\\pc-writer';
const WRITER='E:\\ZGmini\\projects\\zgmini-earnings-history-pc-release';
const CORE='E:\\ZGmini\\data\\pc-writer\\cutover-evidence\\inflation-r37-2026-10-20T19-39-19-549Z\\run-local-core.vbs';
const KOREA='E:\\ZGmini\\data\\pc-writer\\cutover-evidence\\inflation-r37-2026-10-20T19-39-19-549Z\\run-local-korea.vbs';
const APPROVED='a477ef304425145f559352af4291e437e3b08a2d';
const CORE_SHA='bb3e11c0b5c8da07162b1c824e7b52e7a7c2f987c079f29713211a2413932b01';
const KOREA_SHA='df55814939bd285d206fdf5682ee743fe9c8d3127eec1f1471a658f8538f1b25';
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const readJson=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const safe=x=>String(x??'UNKNOWN').replace(/[\r\n\0]/g,' ').replace(/[^\p{L}\p{N} ,:._\\/\-]/gu,'').slice(0,230);
const code=e=>/^[A-Z0-9_]+$/.test(e?.message??'')?e.message:'STOP_READONLY_ERROR';
const run=(bin,args,opts={})=>execFileSync(bin,args,{encoding:'utf8',windowsHide:true,
 timeout:12000,stdio:['ignore','pipe','pipe'],...opts}).trim();
const xmlTag=(s,key)=>new RegExp('<(?:[A-Za-z0-9_]+:)?'+key+
 '(?:\\s+[^>]*)?>([\\s\\S]*?)<\\/(?:[A-Za-z0-9_]+:)?'+key+'>','i')
 .exec(s)?.[1]?.replace(/&quot;/g,'"').replace(/&amp;/g,'&')||'';
function manifest(){
 const m=readJson(path.join(DIR,'package-manifest.json'));
 if(m.version!=='R10-CORE-ROUTE-PROOF-R3'||m.approvedWriterSha!==APPROVED||m.files?.length!==3)
  throw Error('STOP_MANIFEST_CONTRACT');
 const required=new Set(['RUN_R10_CORE_ROUTE_PROOF.cmd','r10-core-route-proof.mjs','README_KO.txt']);
 for(const item of m.files){
  if(!required.delete(item.path)||!/^[a-f0-9]{64}$/.test(item.sha256))
   throw Error('STOP_MANIFEST_CONTRACT');
  if(sha(path.join(DIR,item.path))!==item.sha256)throw Error('STOP_PACKAGE_SHA_MISMATCH');
 }
 if(required.size)throw Error('STOP_MANIFEST_CONTRACT');
}
function content(file){
 const raw=fs.readFileSync(file);
 if(raw[0]===0xff&&raw[1]===0xfe)return raw.subarray(2).toString('utf16le');
 return raw.toString('utf8');
}
function structure(prefix,file,expected,out){
 if(!fs.existsSync(file))throw Error('STOP_EXPECTED_VBS_MISSING');
 const got=sha(file);
 out[prefix+'_SHA']=got;
 out[prefix+'_HASH_MATCH']=got===expected?'YES':'NO';
 if(got!==expected)throw Error('STOP_VBS_DRIFT');
 const text=content(file);
 out[prefix+'_HAS_LOCAL_CYCLE_NAME']=/local-cycle\.mjs/i.test(text)?'YES':'NO';
 out[prefix+'_HAS_RUN_LOCAL_NAME']=/run-local\.mjs/i.test(text)?'YES':'NO';
 out[prefix+'_HAS_PUBLISH_FLAG']=/--publish/i.test(text)?'YES':'NO';
 out[prefix+'_HAS_KOREA_FLAG']=/--korea/i.test(text)?'YES':'NO';
 out[prefix+'_HAS_WRITER_ROOT_LITERAL']=/zgmini-earnings-history-pc-release/i.test(text)?'YES':'NO';
 out[prefix+'_HAS_PC_WRITER_DIR']=/pc-writer/i.test(text)?'YES':'NO';
 out[prefix+'_HAS_NODE_PROCESS']=/node(?:\.exe)?/i.test(text)?'YES':'NO';
 out[prefix+'_HAS_WSCRIPT_RUN']=/\.Run\b|\.Exec\b/i.test(text)?'YES':'NO';
 out[prefix+'_MJS_BASENAMES']=[...new Set((text.match(/[\w.-]+\.mjs/gi)||[]))].slice(0,20).join(',')||'NONE';
}
function lockInfo(out){
 const lock=path.win32.join(HOME,'local-cycle.lock');
 if(!fs.existsSync(lock)){out.LOCK_STATUS='ABSENT';return}
 const stat=fs.statSync(lock);
 out.LOCK_STATUS='PRESENT';
 out.LOCK_AGE_MIN=Math.floor((Date.now()-stat.mtimeMs)/60000);
 out.LOCK_BYTES=stat.size;
 if(stat.size>4096){out.LOCK_PID='UNREADABLE';return}
 let pid;
 try{pid=readJson(lock)?.pid}catch{out.LOCK_PID='UNPARSED';return}
 if(!Number.isSafeInteger(pid)||pid<=0){out.LOCK_PID='INVALID';return}
 out.LOCK_PID=pid;
 try{process.kill(pid,0);out.LOCK_PID_PROCESS='PID_EXISTS_IDENTITY_UNVERIFIED'}
 catch(e){out.LOCK_PID_PROCESS=e.code==='ESRCH'?'NOT_FOUND':'UNVERIFIED'}
}
function main(){
 const out={STATUS:'READONLY_CORE_ROUTE_COMPLETED',INSTALL_AUTHORIZATION:'NO',
  PC_TIME:new Date().toISOString(),PC_TIMEZONE:Intl.DateTimeFormat().resolvedOptions().timeZone,
  APPROVED_SOURCE:APPROVED};
 try{
  manifest();out.MANIFEST_STATUS='HASH_VERIFIED';
  if(process.platform!=='win32')throw Error('STOP_WINDOWS_ONLY');
  const config=readJson(path.win32.join(HOME,'config.json'));
  const last=readJson(path.win32.join(HOME,'local-writer-last-run.json'));
  out.CONFIG_SOURCE=config.source;out.LAST_WRITER_SOURCE=last.source;
  out.LAST_WRITER_AT=last.at??'UNKNOWN';out.LAST_WRITER_STATUS=last.status;
  out.CHECKOUT_SHA=run('git',['rev-parse','HEAD'],{cwd:WRITER});
  out.CHECKOUT_TRACKED_DIRTY=run('git',['status','--porcelain','--untracked-files=no'],{cwd:WRITER})?'YES':'NO';
  const task=run('schtasks',['/Query','/TN','ZGMINI-PC-Local-Core','/XML']);
  out.CORE_TASK_EXE=path.win32.basename(xmlTag(task,'Command'));
  out.CORE_TASK_ARGUMENT_SCRIPT=path.win32.basename(
   (xmlTag(task,'Arguments').match(/[\w.\\:\/-]+\.vbs/i)||[])[0]||'UNKNOWN');
  structure('CORE_VBS',CORE,CORE_SHA,out);
  structure('KOREA_VBS',KOREA,KOREA_SHA,out);
  const cycle=content(path.win32.join(WRITER,'scripts','pc-writer','local-cycle.mjs'));
  out.CYCLE_KOREA_GUARD_PRESENT=/lane==='core'&&publishAllowed/.test(cycle)?'YES':'NO';
  out.CYCLE_PUBLISH_REQUEST_GUARD=/process\.argv\.includes\('--publish'\)/.test(cycle)?'YES':'NO';
  out.CYCLE_HAS_WRITER_SPAWN=/run-local\.mjs/.test(cycle)?'YES':'NO';
  lockInfo(out);
 }catch(e){out.STATUS='READONLY_CORE_ROUTE_INCOMPLETE';out.ERROR_CODE=code(e)}
 fs.writeFileSync(OUT,Object.entries(out).map(([key,value])=>key+'='+safe(value)).join('\r\n')+'\r\n','utf8');
 process.stdout.write('RESULT='+path.basename(OUT)+'\nSTATUS='+out.STATUS+'\n');
 if(out.STATUS!=='READONLY_CORE_ROUTE_COMPLETED')process.exitCode=2;
}
main();
