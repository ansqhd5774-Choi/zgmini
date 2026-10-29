// Detail-only follow-up to R10 R6 STOP. Never writes PC state.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const DIR=path.dirname(fileURLToPath(import.meta.url));
const RESULT=path.join(DIR,'ASSET_R10_BLOCKER_DETAIL_RESULT.txt');
const HOME='E:\\ZGmini\\data\\pc-writer';
const PROJECTS='E:\\ZGmini\\projects';
const EXPECTED='a477ef304425145f559352af4291e437e3b08a2d';
const TASK='ZGMINI-PC-Local-Core';
const max=20;
const fileHash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function verifyManifest(){
 const m=JSON.parse(fs.readFileSync(path.join(DIR,'package-manifest.json'),'utf8'));
 if(m.version!=='R10-R6-DETAIL-R1'||m.approvedWriterSha!==EXPECTED||!Array.isArray(m.files)
   ||m.files.length!==3)throw Error('STOP_MANIFEST_CONTRACT');
 const required=new Set(['RUN_R10_BLOCKER_DETAIL.cmd','r10-blocker-detail.mjs','README_KO.txt']);
 for(const item of m.files){
  if(!required.has(item.path)||!/^[a-f0-9]{64}$/.test(item.sha256))
   throw Error('STOP_MANIFEST_CONTRACT');
  required.delete(item.path);
  if(fileHash(path.join(DIR,item.path))!==item.sha256)throw Error('STOP_PACKAGE_SHA_MISMATCH');
 }
 if(required.size)throw Error('STOP_MANIFEST_CONTRACT');
}
const exec=(binary,args,options={})=>execFileSync(binary,args,{
 encoding:'utf8',windowsHide:true,timeout:15000,stdio:['ignore','pipe','pipe'],...options,
}).trim();
const readJson=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const clean=x=>String(x??'UNKNOWN').replace(/[\r\n]/g,' ').replace(/[^\p{L}\p{N} ,:._\\\/-]/gu,'').slice(0,260);
const win=s=>path.win32.normalize(String(s).replace(/\\\\/g,'\\')).toLowerCase();
const code=e=>/^[A-Z0-9_]+$/.test(e?.message??'')?e.message:'READ_ONLY_DIAG_ERROR';
const taskTag=(str,tag)=>{
 const m=new RegExp('<(?:[A-Za-z0-9_]+:)?'+tag+'(?:\\s+[^>]*)?>([\\s\\S]*?)<\\/(?:[A-Za-z0-9_]+:)?'+tag+'>','i').exec(str);
 return m?m[1].replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,'&'):'';
};
const splitCsv=line=>{
 const cells=[],re=/"((?:[^"]|"")*)"(?=,|$)/g;let m;
 while((m=re.exec(line)))cells.push(m[1].replace(/""/g,'"'));
 return cells;
};
function readTask(){
 const xml=exec('schtasks',['/Query','/TN',TASK,'/XML']);
 const settings=taskTag(xml,'Settings');
 const enabled=taskTag(settings,'Enabled')||'NOT_EXPLICIT_IN_XML';
 const command=taskTag(xml,'Command'),args=taskTag(xml,'Arguments');
 const workdir=taskTag(xml,'WorkingDirectory');
 let status='UNAVAILABLE',next='UNKNOWN';
 try{
  const raw=exec('schtasks',['/Query','/TN',TASK,'/V','/FO','CSV']);
  const [h,v]=raw.split(/\r?\n/).filter(Boolean);
  const head=splitCsv(h),vals=splitCsv(v);
  for(let i=0;i<head.length;i++){
   if(/^(Status|상태)$/i.test(head[i]))status=vals[i]??status;
   if(/^(Next Run Time|다음 실행 시간)$/i.test(head[i]))next=vals[i]??next;
  }
 }catch{}
 const state=/^(Ready|Running|Disabled|Queued|준비|실행 중|사용 안 함)$/i.test(status)?status:'UNPARSED';
 return {command,args,workdir,enabled,state,next,xml};
}
function candidates(){
 const result=[];
 for(const ent of fs.readdirSync(PROJECTS,{withFileTypes:true})){
  if(!ent.isDirectory()||ent.isSymbolicLink())continue;
  const root=path.join(PROJECTS,ent.name);
  if(!fs.existsSync(path.join(root,'.git')))continue;
  let sha;
  try{sha=exec('git',['rev-parse','HEAD'],{cwd:root})}catch{continue}
  if(sha!==EXPECTED)continue;
  const dirty=exec('git',['status','--porcelain','--untracked-files=no'],{cwd:root});
  let branch='DETACHED';
  try{branch=exec('git',['symbolic-ref','--quiet','--short','HEAD'],{cwd:root})}catch{}
  const run=path.join(root,'scripts','pc-writer','run-local.mjs');
  let hook='MISSING_SOURCE_FILE';
  if(fs.existsSync(run)){
   const code=fs.readFileSync(run,'utf8');
   hook=code.includes("asset-r10-sidecar-auto-publication-r1.mjs")?'PRESENT':'ABSENT';
  }
  result.push({root,sha,dirty:dirty?'YES':'NO',branch,hook});
 }
 return result;
}
function trace(task,candidates){
 const references=[],seen=new Set();
 const queue=[{text:task.command+' '+task.args,dir:task.workdir},
  {text:task.workdir,dir:task.workdir}];
 const allowedRoots=[HOME,PROJECTS];
 let linked=false;
 for(let depth=0;depth<5&&queue.length&&references.length<max;depth++){
  const current=queue.splice(0);
  for(const {text:fragment,dir} of current){
   if(!fragment)continue;
   if(candidates.some(c=>win(fragment).includes(win(c.root))))linked=true;
   const absolute=String(fragment).match(/[A-Za-z]:\\[^\r\n"']+?\.(?:vbs|mjs|cmd)/gi)||[];
   // Trace only script names within the already-known task/script directory.
   // Dynamic paths remain UNCONFIRMED and never authorize an installation.
   const relative=String(fragment).match(/(?:[\w.-]+\\)*[\w.-]+\.(?:vbs|mjs|cmd)/gi)||[];
   const match=[...absolute,...relative.filter(p=>!path.win32.isAbsolute(p))
    .map(p=>dir?path.win32.resolve(dir,p):'').filter(Boolean)];
   for(let p of match){
    p=p.trim().replace(/\\\\/g,'\\');
    if(seen.has(win(p)))continue;
    seen.add(win(p));
    if(!allowedRoots.some(root=>win(p).startsWith(win(root)+'\\')))continue;
    if(!fs.existsSync(p))continue;
    const st=fs.statSync(p);
    if(!st.isFile()||st.size>256000)continue;
    const content=fs.readFileSync(p,'utf8');
    references.push({file:p,sha256:fileHash(p)});
    if(candidates.some(c=>win(content).includes(win(c.root))))linked=true;
    queue.push({text:content,dir:path.win32.dirname(p)});
    if(references.length>=max)break;
   }
  }
 }
 return {references,linked};
}
function processes(){
 const csv=exec('tasklist',['/FO','CSV','/NH']);
 return csv.split(/\r?\n/).filter(Boolean)
  .map(line=>splitCsv(line))
  .filter(([name])=>/^(?:node|nodew|wscript|cscript)(?:\.exe)?$/i.test(name??''))
  .map(([name,pid])=>({name,pid:/^\d+$/.test(pid??'')?pid:'UNKNOWN'}));
}
function locks(){
 const now=Date.now();
 return fs.readdirSync(HOME,{withFileTypes:true})
  .filter(e=>e.isFile()&&/\.lock$/i.test(e.name))
  .slice(0,max).map(e=>{
   const stat=fs.statSync(path.join(HOME,e.name));
   return {name:e.name,ageMinutes:Math.floor((now-stat.mtimeMs)/60000),bytes:stat.size};
  });
}
function main(){
 const data={
  STATUS:'READONLY_DETAIL_COMPLETED',INSTALL_AUTHORIZATION:'NO',
  PC_TIME:new Date().toISOString(),PC_TIMEZONE:Intl.DateTimeFormat().resolvedOptions().timeZone,
  EXPECTED_SOURCE:EXPECTED,
 };
 try{
  verifyManifest();data.MANIFEST_STATUS='HASH_VERIFIED';
  if(process.platform!=='win32')throw Error('STOP_WINDOWS_ONLY');
  const task=readTask();
  data.TASK_COMMAND=path.win32.basename(task.command);
  const actionScript=(task.args.match(/[A-Za-z]:\\[^"\r\n]+?\.(?:vbs|mjs|cmd)/i)||[])[0];
  data.TASK_ARGUMENT_BASENAME=actionScript?path.win32.basename(actionScript):'UNKNOWN';
  data.TASK_WORKDIR=task.workdir;
  data.TASK_ENABLED_XML=task.enabled;data.TASK_QUERY_STATUS=task.state;
  data.TASK_NEXT_RUN=task.next;
  const found=candidates();
  data.APPROVED_CHECKOUTS=found.length;
  for(const [i,c] of found.entries()){
   data['ROOT_'+i]=c.root;data['HEAD_'+i]=c.sha;
   data['BRANCH_'+i]=c.branch;data['TRACKED_DIRTY_'+i]=c.dirty;
   data['HOOK_'+i]=c.hook;
  }
  const t=trace(task,found);
  data.TRACED_FILE_COUNT=t.references.length;
  t.references.forEach((v,i)=>{data['TRACE_'+i]=v.file;
   data['TRACE_SHA256_'+i]=v.sha256});
  data.ROUTE_LITERAL_MATCH=t.linked?'YES':'NO';
  const procs=processes();
  data.PROCESS_COUNT=procs.length;
  data.PROCESS_PIDS=procs.map(x=>x.name+':'+x.pid).join(',');
  const lock=locks();
  data.LOCK_COUNT=lock.length;
  lock.forEach((v,i)=>{data['LOCK_'+i]=v.name;
   data['LOCK_AGE_MIN_'+i]=v.ageMinutes;data['LOCK_BYTES_'+i]=v.bytes});
  const ledger=path.join(HOME,'local-publication-ledger.json');
  data.LEDGER_STATUS=fs.existsSync(ledger)?readJson(ledger).status:'MISSING';
  const last=path.join(HOME,'local-writer-last-run.json');
  data.LAST_WRITER_SOURCE=fs.existsSync(last)?readJson(last).source:'MISSING';
  data.LAST_WRITER_STATUS=fs.existsSync(last)?readJson(last).status:'MISSING';
 }catch(e){data.STATUS='READONLY_DETAIL_INCOMPLETE';data.ERROR_CODE=code(e)}
 const body=Object.entries(data).map(([k,v])=>k+'='+clean(v)).join('\r\n')+'\r\n';
 fs.writeFileSync(RESULT,body,{encoding:'utf8'});
 process.stdout.write('RESULT='+path.basename(RESULT)+'\nSTATUS='+data.STATUS+'\n');
 if(data.STATUS!=='READONLY_DETAIL_COMPLETED')process.exitCode=2;
}
main();
