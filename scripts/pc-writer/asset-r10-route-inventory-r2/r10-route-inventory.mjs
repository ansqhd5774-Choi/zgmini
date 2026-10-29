// Read-only task inventory for an R10 install blocked by unknown scheduled dispatch.
// Never executes the scheduled action, Writer, D1, or any referenced script.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const DIR=path.dirname(fileURLToPath(import.meta.url));
const OUTPUT=path.join(DIR,'ASSET_R10_ROUTE_INVENTORY_RESULT.txt');
const EXPECTED='a477ef304425145f559352af4291e437e3b08a2d';
const WRITER_ROOT='E:\\ZGmini\\projects\\zgmini-earnings-history-pc-release';
const HOME='E:\\ZGmini\\data\\pc-writer';
const MAX_TASKS=60,MAX_TRACES=300;
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const normalize=s=>path.win32.normalize(String(s)).toLowerCase();
const safe=v=>String(v??'UNKNOWN').replace(/[\r\n\0]/g,' ').replace(/[^\p{L}\p{N} ,:._\\/\-]/gu,'').slice(0,230);
const call=(bin,args)=>execFileSync(bin,args,{encoding:'utf8',windowsHide:true,
  timeout:30000,maxBuffer:8*1024*1024,stdio:['ignore','pipe','pipe']}).replace(/\0/g,'');
const git=(...args)=>execFileSync('git',args,{encoding:'utf8',windowsHide:true,
  cwd:WRITER_ROOT,timeout:10000,stdio:['ignore','pipe','pipe']}).trim();
const errorCode=e=>/^[A-Z0-9_]+$/.test(e?.message??'')?e.message:'STOP_DIAGNOSTIC_ERROR';
const xmlTag=(s,key)=>new RegExp('<(?:[A-Za-z0-9_]+:)?'+key+
  '(?:\\s+[^>]*)?>([\\s\\S]*?)<\\/(?:[A-Za-z0-9_]+:)?'+key+'>','i')
  .exec(s)?.[1]?.replace(/&quot;/g,'"').replace(/&apos;/g,"'")
  .replace(/&amp;/g,'&')||'';

function csvLine(line){
 const values=[];let field='',quoted=false;
 for(let i=0;i<line.length;i++){
  const c=line[i];
  if(c==='"'&&quoted&&line[i+1]==='"'){field+='"';i++;continue}
  if(c==='"'){quoted=!quoted;continue}
  if(c===','&&!quoted){values.push(field);field='';continue}
  field+=c;
 }
 values.push(field);return values;
}
function taskRows(){
 const lines=call('schtasks',['/Query','/V','/FO','CSV']).split(/\r?\n/)
  .map(x=>x.replace(/^\uFEFF/,''))
  .filter(x=>x.startsWith('"'));
 if(lines.length<2)throw Error('STOP_NO_SCHEDULED_TASK_ROWS');
 const header=csvLine(lines[0]);
 const col=(rx,fallback)=>{const at=header.findIndex(x=>rx.test(x));return at>=0?at:fallback};
 const index={name:col(/^(TaskName|작업 이름)$/i,1),action:col(/^(Task To Run|실행할 작업)$/i,8),
  last:col(/^(Last Run Time|마지막 실행 시간)$/i,5),
  next:col(/^(Next Run Time|다음 실행 시간)$/i,2),
  status:col(/^(Status|상태)$/i,3),
  state:col(/^(Scheduled Task State|예약된 작업 상태)$/i,11)};
 return lines.slice(1).map(csvLine).map(v=>Object.fromEntries(Object.entries(index)
  .map(([key,i])=>[key,v[i]||'UNKNOWN'])));
}
const allowed=p=>['E:\\ZGmini\\data','E:\\ZGmini\\projects'].some(root=>
  normalize(p).startsWith(normalize(root)+'\\'));
function inspectChain(action,argumentsText,workdir,globalSeen){
 const found=[];let literal=false,writerWord=false;
 const queue=[{text:action+' '+argumentsText,dir:workdir}];
 for(let depth=0;depth<5&&queue.length&&found.length<15;depth++){
  const batch=queue.splice(0);
  for(const {text,dir} of batch){
   if(normalize(text).includes(normalize(WRITER_ROOT)))literal=true;
   if(/pc-writer|run-local\.mjs/i.test(text))writerWord=true;
   const abs=String(text).match(/[A-Za-z]:\\[^"'\r\n]+?\.(?:vbs|mjs|cmd)/gi)||[];
   const rel=(String(text).match(/(?:[\w.-]+\\)*[\w.-]+\.(?:vbs|mjs|cmd)/gi)||[])
    .filter(p=>!path.win32.isAbsolute(p)).map(p=>dir?path.win32.resolve(dir,p):'').filter(Boolean);
   for(let p of [...abs,...rel]){
    p=p.replace(/\\\\/g,'\\').trim();
    const norm=normalize(p);
    if(globalSeen.has(norm)||!allowed(p)||!fs.existsSync(p))continue;
    globalSeen.add(norm);
    const st=fs.statSync(p);
    if(!st.isFile()||st.size>256000)continue;
    const contents=fs.readFileSync(p,'utf8');
    found.push({path:p,sha256:hash(p)});
    queue.push({text:contents,dir:path.win32.dirname(p)});
    if(found.length>=15)break;
   }
  }
 }
 return {found,literal,writerWord};
}
function taskDetails(task,seen){
 const xml=call('schtasks',['/Query','/TN',task.name,'/XML']);
 const action=xmlTag(xml,'Command'),args=xmlTag(xml,'Arguments');
 const workdir=xmlTag(xml,'WorkingDirectory');
 const settings=xmlTag(xml,'Settings');
 const chain=inspectChain(action,args,workdir,seen);
 return {task,exe:path.win32.basename(action),script:path.win32.basename(
   ((args.match(/[\w.\\:\/-]+\.(?:vbs|mjs|cmd)/i)||[])[0]||'')),
  workdir:workdir||'UNKNOWN',settingsEnabled:xmlTag(settings,'Enabled')||'NOT_EXPLICIT_IN_XML',...chain};
}
function wmic(){
 try{
  const raw=call('wmic',['process','where',
   "name='node.exe' or name='wscript.exe' or name='cscript.exe'",
   'get','CommandLine,ParentProcessId,ProcessId','/FORMAT:CSV']);
  const rows=raw.split(/\r?\n/).map(x=>x.trim()).filter(x=>x&&!x.startsWith('Node,'));
  const found=[];
  for(const row of rows){
   const m=/^[^,]*,(.*),(\d+),(\d+)$/.exec(row);
   if(!m)continue;
   const cmd=m[1],pid=m[3],parent=m[2];
   const pathMatch=cmd.match(/[A-Za-z]:\\[^"'\r\n]*?\.(?:mjs|js|vbs|cmd)/i)?.[0];
   found.push({pid,parent,script:pathMatch?path.win32.basename(pathMatch):'UNKNOWN',
    hasRoot:normalize(cmd).includes(normalize(WRITER_ROOT))?'YES':'NO',
    hasPcWriter:/pc-writer|run-local\.mjs/i.test(cmd)?'YES':'NO'});
  }
  return {status:'AVAILABLE',rows:found.slice(0,60),total:found.length};
 }catch{return {status:'UNAVAILABLE',rows:[],total:0}}
}
function checkManifest(){
 const manifest=JSON.parse(fs.readFileSync(path.join(DIR,'package-manifest.json'),'utf8'));
 if(manifest.version!=='R10-ROUTE-INVENTORY-R2'||manifest.approvedWriterSha!==EXPECTED
   ||manifest.files?.length!==3)throw Error('STOP_MANIFEST_CONTRACT');
 const required=new Set(['RUN_R10_ROUTE_INVENTORY.cmd','r10-route-inventory.mjs','README_KO.txt']);
 for(const item of manifest.files){
  if(!required.delete(item.path)||!/^[a-f0-9]{64}$/.test(item.sha256))
   throw Error('STOP_MANIFEST_CONTRACT');
  if(hash(path.join(DIR,item.path))!==item.sha256)throw Error('STOP_PACKAGE_SHA_MISMATCH');
 }
 if(required.size)throw Error('STOP_MANIFEST_CONTRACT');
}
function main(){
 const out={STATUS:'READONLY_INVENTORY_COMPLETED',INSTALL_AUTHORIZATION:'NO',
  PC_TIME:new Date().toISOString(),PC_TIMEZONE:Intl.DateTimeFormat().resolvedOptions().timeZone,
  EXPECTED_SOURCE:EXPECTED};
 try{
  checkManifest();out.MANIFEST_STATUS='HASH_VERIFIED';
  if(process.platform!=='win32')throw Error('STOP_WINDOWS_ONLY');
  out.CONFIG_SOURCE=JSON.parse(fs.readFileSync(path.win32.join(HOME,'config.json'),'utf8')).source;
  out.LAST_WRITER_SOURCE=JSON.parse(fs.readFileSync(path.win32.join(HOME,'local-writer-last-run.json'),'utf8')).source;
  out.APPROVED_HEAD=git('rev-parse','HEAD');
  out.APPROVED_TRACKED_DIRTY=git('status','--porcelain','--untracked-files=no')?'YES':'NO';
  out.R10_HOOK_PRESENT=fs.readFileSync(path.win32.join(WRITER_ROOT,'scripts','pc-writer','run-local.mjs'),'utf8')
   .includes('asset-r10-sidecar-auto-publication-r1.mjs')?'YES':'NO';
  const tasks=taskRows();out.TASKS_TOTAL=tasks.length;
  const relevant=tasks.filter(t=>/ZGMINI/i.test(t.name)||/E:\\ZGmini/i.test(t.action));
  out.RELATED_TASKS=relevant.length;
  if(relevant.length>MAX_TASKS)throw Error('STOP_TOO_MANY_RELEVANT_TASKS');
  let traced=0;
  for(const [i,t] of relevant.entries()){
   const item=taskDetails(t,new Set());
   const prefix='TASK_'+i+'_';
   Object.assign(out,{
    [prefix+'NAME']:t.name,[prefix+'EXE']:item.exe,
    [prefix+'SCRIPT']:item.script,[prefix+'WORKDIR']:item.workdir,
    [prefix+'ENABLED_XML']:item.settingsEnabled,[prefix+'QUERY_STATUS']:t.status,
    [prefix+'SCHEDULED_STATE']:t.state,[prefix+'LAST_RUN']:t.last,
    [prefix+'NEXT_RUN']:t.next,[prefix+'ROOT_LITERAL_MATCH']:item.literal?'YES':'NO',
    [prefix+'WRITER_WORD_MATCH']:item.writerWord?'YES':'NO',
    [prefix+'TRACED_COUNT']:item.found.length
   });
   for(const [j,v] of item.found.entries()){
    out[prefix+'TRACE_'+j]=v.path;
    out[prefix+'TRACE_HASH_'+j]=v.sha256;
    traced++;
   }
   if(traced>MAX_TRACES)throw Error('STOP_TOO_MANY_TRACES');
  }
  const processes=wmic();
  out.PROCESS_LINEAGE=processes.status;out.PROCESS_RECORDS=processes.total;
  processes.rows.forEach((x,i)=>{out['PROC_'+i+'_PID']=x.pid;
   out['PROC_'+i+'_PARENT_PID']=x.parent;
   out['PROC_'+i+'_SCRIPT']=x.script;
   out['PROC_'+i+'_ROOT_MATCH']=x.hasRoot;
   out['PROC_'+i+'_WRITER_WORD_MATCH']=x.hasPcWriter});
  const locks=fs.readdirSync(HOME,{withFileTypes:true})
   .filter(e=>e.isFile()&&/\.lock$/i.test(e.name));
  out.LOCK_COUNT=locks.length;
  locks.slice(0,30).forEach((x,i)=>{const s=fs.statSync(path.win32.join(HOME,x.name));
   out['LOCK_'+i+'_NAME']=x.name;
   out['LOCK_'+i+'_AGE_MIN']=Math.floor((Date.now()-s.mtimeMs)/60000)});
 }catch(e){out.STATUS='READONLY_INVENTORY_INCOMPLETE';out.ERROR_CODE=errorCode(e)}
 fs.writeFileSync(OUTPUT,Object.entries(out).map(([k,v])=>k+'='+safe(v)).join('\r\n')+'\r\n','utf8');
 process.stdout.write('RESULT='+path.win32.basename(OUTPUT)+'\nSTATUS='+out.STATUS+'\n');
 if(out.STATUS!=='READONLY_INVENTORY_COMPLETED')process.exitCode=2;
}
main();
