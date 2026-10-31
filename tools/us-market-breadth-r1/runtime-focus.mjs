/** R2: narrow read-only diagnosis for the PC's active writer and source gap. */
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';

const result=process.argv[2];
if(!result||path.basename(result)!=='US_BREADTH_PC_R2_RUNTIME_FOCUS_RESULT.txt')process.exit(2);
const lines=[];
const write=(key,value)=>lines.push(`${key}=${String(value??'UNKNOWN').replace(/[\r\n]/g,' ').slice(0,400)}`);
const safe=(fn,fallback=null)=>{try{return fn()}catch{return fallback}};
const exists=file=>safe(()=>fs.existsSync(file),false);
const git=(root,args)=>safe(()=>execFileSync('git',['-C',root,...args],{encoding:'utf8',stdio:['ignore','pipe','ignore'],windowsHide:true,timeout:10000}).trim(),'UNAVAILABLE');
const decode=b=>b[0]===0xff&&b[1]===0xfe?b.subarray(2).toString('utf16le'):
  b.length>6&&b[1]===0&&b[3]===0?b.toString('utf16le'):b.toString('utf8');
const xmlValues=(xml,tag)=>[...xml.matchAll(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`,'gi'))].map(x=>x[1]);
const matchProject=text=>text.match(/E:\\ZGmini\\projects\\[^"<>]*?(?=\\scripts\\|\\ZGMINI_|\\launcher|["<>]|$)/i)?.[0]??null;

write('REPORT','US_BREADTH_PC_R2_RUNTIME_FOCUS');
write('MODE','READ_ONLY_NO_FETCH_NO_INSTALL_NO_PUBLISH_NO_SCHEDULE_CHANGE');
write('AT_UTC',new Date().toISOString());
const home=process.env.ZGMINI_PC_HOME||'E:\\ZGmini\\data\\pc-writer';
const cfg=safe(()=>JSON.parse(fs.readFileSync(path.join(home,'config.json'),'utf8')),{});
const approved=typeof cfg?.source==='string'&&/^[a-f0-9]{40}$/i.test(cfg.source)?cfg.source:null;
write('CONFIG_APPROVED_SOURCE',approved??'UNKNOWN');
write('CONFIG_ENABLED',cfg?.enabled===true?'TRUE':'OTHER');
write('CONFIG_COLLECTION_TARGET',cfg?.collectionTarget??'UNKNOWN');

for(const task of ['ZGMINI-PC-Local-Core','ZGMINI-PC-Local-Korea','ZGMINI-PC-Iran-Progress-R13']){
 const key=task.replace(/[^A-Za-z0-9]/g,'_').toUpperCase();
 let buffer;
 try{buffer=execFileSync('schtasks',['/query','/tn',task,'/xml'],{windowsHide:true,stdio:['ignore','pipe','ignore'],timeout:12000});}
 catch{write(`TASK_${key}_STATE`,'UNAVAILABLE');continue;}
 const xml=decode(buffer),cmd=xmlValues(xml,'Command')[0]??'',arg=xmlValues(xml,'Arguments')[0]??'';
 const enabled=xmlValues(xml,'Enabled')[0]??'UNKNOWN';
 write(`TASK_${key}_STATE`,'PRESENT');write(`TASK_${key}_ENABLED`,enabled);
 write(`TASK_${key}_COMMAND_NAME`,path.win32.basename(cmd.replaceAll('&quot;','"'))||'UNRESOLVED');
 write(`TASK_${key}_SCRIPT_CLASS`,/quota-runner/i.test(cmd+' '+arg)?'QUOTA_RUNNER':/local-cycle/i.test(cmd+' '+arg)?'LOCAL_CYCLE':/\.cmd/i.test(cmd+' '+arg)?'CMD_LAUNCHER':'OTHER');
 write(`TASK_${key}_PUBLISH_ARG`,/--publish/i.test(arg)?'YES':'NO');
 write(`TASK_${key}_PROJECT_HINT`,matchProject(cmd+' '+arg)??'UNRESOLVED');
}

// The prior report identified this exact clean repository as the config.source match.
// Check rather than assume it is the active scheduler target.
const approvedRoot='E:\\ZGmini\\projects\\zgmini-earnings-history-pc-release';
write('APPROVED_ROOT_PRESENT',exists(approvedRoot)?'YES':'NO');
if(exists(approvedRoot)){
 const head=git(approvedRoot,['rev-parse','HEAD']);
 write('APPROVED_ROOT_HEAD',head);
 write('APPROVED_ROOT_CONFIG_MATCH',head===approved?'YES':'NO');
 write('APPROVED_ROOT_BRANCH',git(approvedRoot,['branch','--show-current']));
 write('APPROVED_ROOT_ORIGIN_MAIN',git(approvedRoot,['rev-parse','origin/main']));
 write('APPROVED_ROOT_CLEAN',git(approvedRoot,['status','--porcelain=v1','--untracked-files=no'])===''?'YES':'NO_OR_UNAVAILABLE');
 write('APPROVED_ROOT_US_MODULE',exists(path.join(approvedRoot,'scripts','pc-writer','market-breadth-us-r1.mjs'))?'PRESENT':'MISSING');
}

for(const filename of ['local-collection-last-run.json','local-cycle-last-run.json','quota-runner-last-run.json','local-writer-last-run.json']){
 const key=filename.toUpperCase().replace(/[^A-Z0-9]/g,'_');
 const stat=safe(()=>fs.statSync(path.join(home,filename)));
 const data=safe(()=>JSON.parse(fs.readFileSync(path.join(home,filename),'utf8')));
 write(`${key}_EXISTS`,stat?'YES':'NO');
 if(!stat)continue;
 write(`${key}_FILE_MTIME_UTC`,stat.mtime.toISOString());
 write(`${key}_RUN_AT`,data?.at??'UNAVAILABLE');
 write(`${key}_STATUS`,typeof data?.status==='string'?data.status:'UNKNOWN');
 write(`${key}_SOURCE`,typeof data?.source==='string'&&/^[a-f0-9]{40}$/i.test(data.source)?data.source:'UNKNOWN');
}

const database=path.join(home,'storage','core.sqlite');
let db;
try{
 db=new DatabaseSync(database,{readOnly:true});
 for(const [label,table] of [['UNIVERSE','market_score_breadth_b1_r3_universe_v1'],['PRICE','market_score_breadth_b1_r3_current_v1'],['HISTORY','market_score_breadth_b1_r3_history_v1']]){
  const latest=db.prepare(`SELECT MAX(trade_date) AS date FROM ${table}`).get()?.date??'NONE';
  const count=db.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE trade_date=?`).get('2026-10-30')?.n??0;
  write(`TABLE_${label}_LATEST_DATE`,latest);
  write(`TABLE_${label}_OCT30_COUNT`,count);
 }
 write('DB_READ','PASS');
}catch{write('DB_READ','FAILED');}
finally{try{db?.close()}catch{}}
write('NEXT','SOURCE_AND_SCHEDULER_REVIEW_REQUIRED');
try{fs.writeFileSync(result,lines.join('\r\n')+'\r\n','utf8');}
catch{process.exit(3)}
console.log(`Runtime review complete: ${result}`);
