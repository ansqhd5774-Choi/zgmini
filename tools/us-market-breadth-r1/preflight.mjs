/** Safe PC lineage preflight. Only writes the designated diagnostic TXT. */
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';

const resultPath=process.argv[2];
if(!resultPath||path.basename(resultPath)!=='US_BREADTH_PC_R1_PREFLIGHT_RESULT.txt')process.exit(2);
const output=[];
const add=(key,value)=>output.push(`${key}=${String(value??'UNKNOWN').replace(/[\r\n]/g,' ').slice(0,400)}`);
const safe=(fn,fallback='UNAVAILABLE')=>{try{return fn()}catch{return fallback}};
const exists=p=>safe(()=>fs.existsSync(p),false)===true;
const fileStatus=p=>exists(p)?'PRESENT':'MISSING';
const runGit=(root,...args)=>safe(()=>execFileSync('git',['-C',root,...args],{encoding:'utf8',windowsHide:true,timeout:12000,stdio:['ignore','pipe','ignore']}).trim(),'UNAVAILABLE');

function tryTask(name){
 let data;
 try{data=execFileSync('schtasks',['/query','/tn',name,'/xml'],{windowsHide:true,timeout:12000,stdio:['ignore','pipe','ignore']});}
 catch{return {present:false};}
 const xml=data[0]===0xff&&data[1]===0xfe?data.subarray(2).toString('utf16le'):data.toString('utf8');
 const tags=(tag)=>[...xml.matchAll(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`,'gi'))].map(x=>x[1]);
 const command=tags('Command')[0]??'';
 const args=tags('Arguments')[0]??'';
 return {present:true,enabled:tags('Enabled')[0]??'UNKNOWN',usesQuotaRunner:/quota-runner/i.test(command+' '+args),
  usesLocalCycle:/local-cycle/i.test(command+' '+args),usesPublish:/--publish/i.test(command+' '+args)};
}

function candidates(){
 const base='E:\\ZGmini\\projects';
 const out=[];
 if(!exists(base))return out;
 const check=dir=>{
  if(out.length>=30)return;
  if(exists(path.join(dir,'scripts','pc-writer','run-local.mjs'))&&exists(path.join(dir,'.git')))out.push(dir);
 };
 check(base);
 const dirs=safe(()=>fs.readdirSync(base,{withFileTypes:true}).filter(e=>e.isDirectory()).slice(0,120),[]);
 for(const d of dirs){
  const root=path.join(base,d.name);check(root);
  if(d.name.toLowerCase()==='legacy')continue;
  const children=safe(()=>fs.readdirSync(root,{withFileTypes:true}).filter(e=>e.isDirectory()).slice(0,80),[]);
  for(const c of children)check(path.join(root,c.name));
 }
 return [...new Set(out.map(x=>safe(()=>fs.realpathSync(x),x)))];
}

function databaseSummary(home){
 const file=path.join(home,'storage','core.sqlite');
 add('PC_CORE_DATABASE',fileStatus(file));
 if(!exists(file))return;
 let db;
 try{
  db=new DatabaseSync(file,{readOnly:true});
  const tableList=db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(x=>x.name);
  const tables=['market_score_breadth_b1_r3_universe_v1','market_score_breadth_b1_r3_current_v1','market_score_breadth_b1_r3_history_v1'];
  for(const [i,table] of tables.entries()){
   add(`STORED_TABLE_${i+1}`,tableList.includes(table)?'PRESENT':'MISSING');
   if(!tableList.includes(table))continue;
   const latest=db.prepare(`SELECT MAX(trade_date) AS day FROM ${table}`).get()?.day??'NONE';
   const count=latest==='NONE'?0:db.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE trade_date=?`).get(latest)?.n??0;
   add(`STORED_LATEST_DATE_${i+1}`,latest);add(`STORED_LATEST_ROWCOUNT_${i+1}`,count);
  }
  if(tableList.includes(tables[0])){
   const row=db.prepare(`SELECT member_count FROM ${tables[0]} ORDER BY trade_date DESC LIMIT 1`).get();
   add('STORED_UNIVERSE_MEMBER_COUNT',row?.member_count??'NONE');
  }
  add('PC_CORE_DATABASE_READ','OK');
 }catch{add('PC_CORE_DATABASE_READ','BLOCKED_OR_INVALID');}
 finally{try{db?.close()}catch{}}
}

add('REPORT','US_BREADTH_PC_R1_PREFLIGHT');
add('MODE','READ_ONLY_NO_SOURCE_INSTALL_NO_PUBLISH_NO_SCHEDULE_CHANGE');
add('AT_UTC',new Date().toISOString());
add('NODE_MAJOR',process.versions.node.split('.')[0]);
const home=process.env.ZGMINI_PC_HOME||'E:\\ZGmini\\data\\pc-writer';
add('PC_HOME_PRESENT',fileStatus(home));
const configFile=path.join(home,'config.json');
add('PC_CONFIG',fileStatus(configFile));
if(exists(configFile)){
 const c=safe(()=>JSON.parse(fs.readFileSync(configFile,'utf8')),null);
 add('CONFIG_ENABLED',c?.enabled===true?'TRUE':c?.enabled===false?'FALSE':'UNKNOWN');
 add('CONFIG_COLLECTION_TARGET',c?.collectionTarget==='pc'?'PC':'OTHER_OR_UNKNOWN');
 add('CONFIG_APPROVED_SOURCE',typeof c?.source==='string'&&/^[a-f0-9]{40}$/i.test(c.source)?c.source:'UNKNOWN');
}
for(const task of ['ZGMINI-PC-Local-Core','ZGMINI-PC-Local-Korea','ZGMINI-PC-Iran-Progress-R13']){
 const state=tryTask(task),key=task.toUpperCase().replace(/[^A-Z0-9]/g,'_');
 add(`TASK_${key}`,state.present?'PRESENT':'MISSING');
 if(state.present){add(`TASK_${key}_ENABLED`,state.enabled);add(`TASK_${key}_QUOTA_RUNNER`,state.usesQuotaRunner?'YES':'NO');
  add(`TASK_${key}_LOCAL_CYCLE`,state.usesLocalCycle?'YES':'NO');add(`TASK_${key}_PUBLISH_ARG`,state.usesPublish?'YES':'NO');}
}
const roots=candidates();
add('GIT_REPO_CANDIDATE_COUNT',roots.length);
for(const [i,root] of roots.entries()){
 const n=i+1;add(`REPO_${n}_PATH`,root);add(`REPO_${n}_HEAD`,runGit(root,'rev-parse','HEAD'));
 add(`REPO_${n}_BRANCH`,runGit(root,'branch','--show-current'));
 add(`REPO_${n}_ORIGIN_MAIN`,runGit(root,'rev-parse','origin/main'));
 add(`REPO_${n}_WORKTREE_CLEAN`,runGit(root,'status','--porcelain=v1','--untracked-files=no')===''?'YES':'NO_OR_UNKNOWN');
 add(`REPO_${n}_BREADTH_ADAPTER`,fileStatus(path.join(root,'scripts','pc-writer','market-breadth-us-r1.mjs')));
 add(`REPO_${n}_BREADTH_CALCULATOR`,fileStatus(path.join(root,'lib','market-breadth','compute.mjs')));
 const integrated=safe(()=>fs.readFileSync(path.join(root,'scripts','pc-writer','run-local.mjs'),'utf8').includes('us-breadth-publication'),null);
 add(`REPO_${n}_WRITER_INTEGRATION`,integrated===true?'PRESENT':integrated===false?'MISSING':'UNKNOWN');
}
databaseSummary(home);
add('RESULT','READ_ONLY_COMPLETE_REVIEW_REQUIRED');
try{fs.writeFileSync(resultPath,output.join('\r\n')+'\r\n',{encoding:'utf8',flag:'w'});}
catch{process.exit(3)}
console.log(`Preflight complete: ${resultPath}`);
