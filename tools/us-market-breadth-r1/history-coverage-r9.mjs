/**
 * R9: read-only coverage audit for a real one-year US S&P 500 breadth backfill.
 * Never fetches, modifies SQLite, publishes D1, or changes scheduled tasks.
 * Reuses the APPROVED PC source's exact frozen source audit and NYSE calendar.
 */
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import {pathToFileURL} from 'node:url';

const outputFile=process.argv[2];
if(!outputFile||path.basename(outputFile)!=='US_BREADTH_PC_R9_HISTORY_COVERAGE_RESULT.txt')process.exit(2);
const home=process.env.ZGMINI_PC_HOME||'E:\\ZGmini\\data\\pc-writer';
const sourceRoot=process.env.ZGMINI_PC_REPO||'E:\\ZGmini\\projects\\zgmini-earnings-history-pc-release';
const table={
  universe:'market_score_breadth_b1_r3_universe_v1',
  current:'market_score_breadth_b1_r3_current_v1',
  history:'market_score_breadth_b1_r3_history_v1',
};
const cols='trade_date,ticker,previous_date,previous_close,current_close,current_volume,source,feed,provenance_json';
const out=[];
const add=(key,value)=>out.push(`${key}=${String(value??'UNKNOWN').replace(/[\r\n\t]/g,' ').slice(0,300)}`);
const isSha=s=>typeof s==='string'&&/^[a-f0-9]{40}$/i.test(s);
const shift=(ymd,days)=>new Date(Date.parse(`${ymd}T00:00:00Z`)+days*86400000).toISOString().slice(0,10);
const exists=f=>fs.existsSync(f);
function git(args){return execFileSync('git',['-C',sourceRoot,...args],{
  encoding:'utf8',windowsHide:true,timeout:12000,stdio:['ignore','pipe','ignore'],
}).trim();}
function hasTable(db,name){return !!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(name);}
function dates(db,name,from,to){
  return new Map(db.prepare(`SELECT trade_date,COUNT(*) AS n FROM ${name} WHERE trade_date>=? AND trade_date<=? GROUP BY trade_date`).all(from,to)
    .map(r=>[r.trade_date,Number(r.n)]));
}
function getRows(db,name,date){return db.prepare(`SELECT ${cols} FROM ${name} WHERE trade_date=?`).all(date);}

add('REPORT','US_BREADTH_PC_R9_HISTORY_COVERAGE');
add('MODE','READ_ONLY_NO_FETCH_NO_INSTALL_NO_PUBLISH_NO_SCHEDULE_CHANGE');
add('RUN_AT_UTC',new Date().toISOString());
add('TARGET','ONE_YEAR_VERIFIED_US_SP500_OBSERVATIONS');
let status='BLOCKED',database;
try{
  if(process.platform!=='win32'||Number(process.versions.node.split('.')[0])<24)throw Error('WINDOWS_NODE_24_REQUIRED');
  const config=JSON.parse(fs.readFileSync(path.join(home,'config.json'),'utf8'));
  if(config.enabled!==true||config.collectionTarget!=='pc'||!isSha(config.source))throw Error('PC_CONFIG_NOT_APPROVED');
  add('APPROVED_SOURCE_SHA',config.source);
  const head=git(['rev-parse','HEAD']);
  add('PC_SOURCE_SHA',head);
  if(head!==config.source)throw Error('APPROVED_PC_SOURCE_MISMATCH');
  // The modules being imported must not be local modifications of the approved source.
  execFileSync('git',['-C',sourceRoot,'diff','--quiet','HEAD','--',
    'scripts/pc-writer/breadth-r10-v9-shadow/audit.mjs',
    'lib/market-score/breadth-b1-r3-calendar.mjs'],{
    windowsHide:true,timeout:12000,stdio:['ignore','ignore','ignore'],
  });
  const auditPath=path.join(sourceRoot,'scripts','pc-writer','breadth-r10-v9-shadow','audit.mjs');
  const calendarPath=path.join(sourceRoot,'lib','market-score','breadth-b1-r3-calendar.mjs');
  if(!exists(auditPath)||!exists(calendarPath))throw Error('APPROVED_AUDIT_MODULE_MISSING');
  const [{auditDay,eligibleRows},{latestCompletedSession,isMarketSession}]=await Promise.all([
    import(pathToFileURL(auditPath).href),import(pathToFileURL(calendarPath).href),
  ]);
  if([auditDay,eligibleRows,latestCompletedSession,isMarketSession].some(f=>typeof f!=='function'))
    throw Error('APPROVED_AUDIT_INTERFACE_MISSING');
  const to=latestCompletedSession(new Date());
  const from=shift(to,-365);
  add('WINDOW_START',from);
  add('WINDOW_END',to);
  const sessions=[];
  for(let day=from;day<=to;day=shift(day,1))if(isMarketSession(day))sessions.push(day);
  add('EXPECTED_SESSIONS',sessions.length);
  database=new DatabaseSync(path.join(home,'storage','core.sqlite'),{readOnly:true});
  for(const [kind,name] of Object.entries(table)){
    if(!hasTable(database,name))throw Error(`TABLE_${kind.toUpperCase()}_MISSING`);
  }
  const counts=Object.fromEntries(Object.entries(table).map(([kind,name])=>[kind,dates(database,name,from,to)]));
  add('UNIVERSE_STORED_DAYS',counts.universe.size);
  add('CURRENT_PRICE_STORED_DAYS',counts.current.size);
  add('HISTORY_PRICE_STORED_DAYS',counts.history.size);
  const valid=[];const missing=[];const rejected=[];
  for(const day of sessions){
    const n=counts.universe.get(day)??0,p=counts.current.get(day)??0,h=counts.history.get(day)??0;
    if(!n||!p||!h){missing.push(day);add(`DAY_${day}`,'MISSING_SOURCE');continue;}
    const entry=database.prepare(`SELECT trade_date,members_json,member_count FROM ${table.universe} WHERE trade_date=?`).get(day);
    let members;
    try{members=JSON.parse(entry?.members_json);}catch{members=null;}
    if(n!==1||!Array.isArray(members)||members.length<490||members.length>520){
      rejected.push(day);add(`DAY_${day}`,'UNIVERSE_INVALID');continue;
    }
    const universe={trade_date:entry.trade_date,member_count:entry.member_count,members};
    const priceRows=getRows(database,table.current,day);
    const historyRows=getRows(database,table.history,day);
    const audit=auditDay({date:day,universe,priceRows,historyRows});
    if(!audit.pass){
      rejected.push(day);add(`DAY_${day}`,`SOURCE_AUDIT_FAIL:${audit.eligible??0}/${audit.required??0}`);continue;
    }
    const rows=eligibleRows({date:day,members,priceRows,historyRows});
    if(rows.size!==audit.eligible){
      rejected.push(day);add(`DAY_${day}`,'ELIGIBLE_AUDIT_MISMATCH');continue;
    }
    let rising=0,unchanged=0,falling=0;
    for(const price of rows.values()){
      if(price.close>price.previousClose)rising++;
      else if(price.close===price.previousClose)unchanged++;
      else falling++;
    }
    if(rising+unchanged+falling!==rows.size){
      rejected.push(day);add(`DAY_${day}`,'COUNTS_MISMATCH');continue;
    }
    valid.push(day);
    add(`DAY_${day}`,`VERIFIED:${rows.size}/${members.length}:UP${rising}:FLAT${unchanged}:DOWN${falling}`);
  }
  add('VERIFIED_DAYS',valid.length);
  add('MISSING_DAYS',missing.length);
  add('REJECTED_DAYS',rejected.length);
  add('VERIFIED_FIRST',valid[0]??'NONE');
  add('VERIFIED_LAST',valid.at(-1)??'NONE');
  add('HISTORY_COMPLETE',valid.length===sessions.length?'YES':'NO');
  add('REMOTE_D1_PUBLICATION','NOT_ATTEMPTED');
  add('NEXT',valid.length===sessions.length?'REVIEW_DAILY_ONLY_PUBLICATION':'REVIEW_BACKFILL_SOURCE_GAPS');
  status='READ_ONLY_COMPLETE';
}catch(error){
  add('ERROR_CODE',/^[A-Z0-9_]+$/.test(error?.message??'')?error.message:'DIAGNOSTIC_EXCEPTION');
}finally{
  try{database?.close();}catch{}
  add('RESULT',status);
  fs.writeFileSync(outputFile,out.join('\r\n')+'\r\n',{encoding:'utf8'});
  process.stdout.write(`HISTORY_COVERAGE_RESULT=${outputFile}\n`);
  if(status!=='READ_ONLY_COMPLETE')process.exitCode=1;
}
