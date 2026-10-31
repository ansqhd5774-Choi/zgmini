/** R3. Read-only local trace of the specific US B1 collector and its scheduled entrypoint. */
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';

const dest=process.argv[2];
if(!dest||path.basename(dest)!=='US_BREADTH_PC_R3_SOURCE_TRACE_RESULT.txt')process.exit(2);
const lines=[];
const add=(key,value)=>lines.push(`${key}=${String(value??'UNKNOWN').replace(/[\r\n]/g,' ').slice(0,180)}`);
const safe=(run,fallback=null)=>{try{return run()}catch{return fallback}};
const home=process.env.ZGMINI_PC_HOME||'E:\\ZGmini\\data\\pc-writer';
const normalize=x=>String(x??'').trim();
const detail=x=>safe(()=>JSON.parse(x),{});
const identifier=x=>/^[A-Za-z0-9_.:\-]{1,100}$/.test(normalize(x))?normalize(x):'UNCLASSIFIED';
const decode=b=>b[0]===255&&b[1]===254?b.subarray(2).toString('utf16le'):
  b.length>6&&b[1]===0&&b[3]===0?b.toString('utf16le'):b.toString('utf8');
const xmlTag=(xml,key)=>xml.match(new RegExp(`<${key}>([\\s\\S]*?)<\\/${key}>`,'i'))?.[1]??'';

add('REPORT','US_BREADTH_PC_R3_SOURCE_TRACE');
add('MODE','READ_ONLY_NO_FETCH_NO_INSTALL_NO_PUBLISH_NO_SCHEDULE_CHANGE');
add('AT_UTC',new Date().toISOString());

// COMPLETE in the general collector report does not imply the `breadth` job ran.
for(const file of ['local-collection-last-run.json','local-cycle-last-run.json']){
 const stem=file.replace('.json','').toUpperCase().replaceAll('-','_');
 const obj=safe(()=>JSON.parse(fs.readFileSync(path.join(home,file),'utf8')));
 add(`${stem}_STATUS`,identifier(obj?.status));
 add(`${stem}_JOB`,identifier(obj?.job));
 add(`${stem}_PHASE`,identifier(obj?.phase));
 add(`${stem}_SOURCE_STATUS`,identifier(obj?.sourceStatus));
 add(`${stem}_REASON`,identifier(obj?.reason));
}

// The scheduler invokes wscript.exe; inspect only the referenced script's type,
// never dump arguments, environment variables, credentials, or script content.
for(const task of ['ZGMINI-PC-Local-Core','ZGMINI-PC-Local-Korea']){
 const tag=task==='ZGMINI-PC-Local-Core'?'CORE':'KOREA';
 const xml=safe(()=>decode(execFileSync('schtasks',['/query','/tn',task,'/xml'],{
  windowsHide:true,stdio:['ignore','pipe','ignore'],timeout:12000,
 })));
 if(!xml){add(`TASK_${tag}_XML`,'UNAVAILABLE');continue;}
 const arg=xmlTag(xml,'Arguments').replaceAll('&quot;','"');
 const paths=[...arg.matchAll(/"([A-Za-z]:\\[^"<>]+?\.vbs)"|([A-Za-z]:\\[^\s"<>]+?\.vbs)/gi)]
  .map(match=>match[1]??match[2]);
 const script=paths[0]??null, body=script?safe(()=>fs.readFileSync(script,'utf8')):null;
 add(`TASK_${tag}_WRAPPER`,script?path.win32.basename(script):'UNRESOLVED');
 add(`TASK_${tag}_WRAPPER_EXISTS`,body?'YES':'NO');
 add(`TASK_${tag}_QUOTA_RUNNER_REFERENCE`,body?/quota-runner/i.test(body)?'YES':'NO':'UNKNOWN');
 add(`TASK_${tag}_LOCAL_CYCLE_REFERENCE`,body?/local-cycle/i.test(body)?'YES':'NO':'UNKNOWN');
 add(`TASK_${tag}_APPROVED_ROOT_REFERENCE`,body?/zgmini-earnings-history-pc-release/i.test(body)?'YES':'NO':'UNKNOWN');
 add(`TASK_${tag}_PUBLISH_REFERENCE`,body?/--publish/i.test(body)?'YES':'NO':'UNKNOWN');
}

const file=path.join(home,'storage','core.sqlite');
let db;
try{
 db=new DatabaseSync(file,{readOnly:true});
 const runTable='market_score_breadth_b1_r3_runs_v1';
 const present=Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(runTable));
 add('B1_RUN_TABLE',present?'PRESENT':'MISSING');
 if(present){
  const runs=db.prepare(`SELECT as_of_date,trade_date,status,completed_at,current_rows,coverage,failure_code,detail_json
    FROM ${runTable} ORDER BY completed_at DESC LIMIT 8`).all();
  add('B1_RUN_COUNT_RECENT',runs.length);
  for(let n=0;n<runs.length;n++){
   const r=runs[n],d=detail(r.detail_json),prefix=`B1_RUN_${n+1}`;
   add(`${prefix}_COMPLETED_AT`,r.completed_at);
   add(`${prefix}_AS_OF`,r.as_of_date);
   add(`${prefix}_TRADE_DATE`,r.trade_date);
   add(`${prefix}_STATUS`,identifier(r.status));
   add(`${prefix}_ROWS`,r.current_rows);
   add(`${prefix}_COVERAGE`,r.coverage);
   add(`${prefix}_SOURCE_MODE`,identifier(d?.sourceMode));
   add(`${prefix}_PRIMARY_FAILURE`,identifier(d?.primaryFailure));
   add(`${prefix}_FAILURE_CODE`,identifier(r.failure_code));
  }
 }
 add('DB_TRACE','PASS');
}catch(error){add('DB_TRACE','FAILED');add('DB_ERROR_CLASS',identifier(error?.code));}
finally{try{db?.close()}catch{}}

add('NEXT','REVIEW_COLLECTOR_ORIGIN_AND_PC_INSTALL_METHOD');
fs.writeFileSync(dest,lines.join('\r\n')+'\r\n','utf8');
console.log('US_BREADTH_PC_R3_SOURCE_TRACE_RESULT='+dest);
