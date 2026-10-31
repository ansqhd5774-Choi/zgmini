/**
 * US breadth R10: one-shot, resume-safe, daily-only D1 publication.
 * Recomputes 248 date observations from the approved, READ-ONLY PC SQLite,
 * requires an exact match with the user's verified R9 evidence, and never
 * calls the collector or writes the public current key.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {publishDatedBreadthOnly} from './history-backfill-r10-core.mjs';

const folder=path.dirname(fileURLToPath(import.meta.url));
const reportPath=path.join(folder,'US_BREADTH_PC_R10_ONE_YEAR_BACKFILL_RESULT.txt');
const evidencePath=path.join(folder,'US_BREADTH_PC_R9_HISTORY_COVERAGE_RESULT.txt');
const evidenceSha256='4fc6688d326c21145a2c35ce3dbb951851b3a5bdbd507f8e64b271efe3dac47d';
const home=process.env.ZGMINI_PC_HOME??'E:\\ZGmini\\data\\pc-writer';
const root=process.env.ZGMINI_PC_REPO??'E:\\ZGmini\\projects\\zgmini-earnings-history-pc-release';
const tables={
  universe:'market_score_breadth_b1_r3_universe_v1',
  current:'market_score_breadth_b1_r3_current_v1',
  history:'market_score_breadth_b1_r3_history_v1',
};
const cols='trade_date,ticker,previous_date,previous_close,current_close,current_volume,source,feed,provenance_json';
const result={report:'US_BREADTH_PC_R10_ONE_YEAR_BACKFILL',atUTC:new Date().toISOString(),
  mode:'VERIFIED_STORED_DATA_DATED_KEYS_ONLY',pcSQLiteWritten:false,
  currentKeyWritten:false,collectorsRun:false,schedulerChanged:false,
  market:'usa',runnerRevision:'R10_1_STAGE_DIAGNOSTIC',status:'STARTED'};
const set=(key,value)=>{result[key]=value;};
function save(){
  const lines=Object.entries(result).map(([key,value])=>`${key}=${String(value??'NULL').replace(/[\r\n\t]/g,' ').slice(0,350)}`);
  fs.writeFileSync(reportPath,lines.join('\r\n')+'\r\n','utf8');
}
function checkpoint(stage){set('stage',stage);save();}
function git(args){return execFileSync('git',['-C',root,...args],{
  encoding:'utf8',windowsHide:true,timeout:12000,stdio:['ignore','pipe','ignore'],
}).trim();}
function safeError(error){
  const value=String(error?.message??'');
  if(/^[A-Z0-9_-]{1,100}$/.test(value))return value;
  if(error?.code==='ERR_MODULE_NOT_FOUND')return 'MODULE_NOT_FOUND';
  if(error?.name==='TypeError')return 'RUNTIME_TYPE_ERROR';
  if(error?.name==='SyntaxError')return 'RUNTIME_SYNTAX_ERROR';
  if(error?.name==='RangeError')return 'RUNTIME_RANGE_ERROR';
  if(Number.isInteger(error?.status))return 'CHILD_PROCESS_FAILED';
  return 'UNCLASSIFIED_RUNTIME_ERROR';
}
function parseR9(){
  const file=fs.readFileSync(evidencePath);
  if(createHash('sha256').update(file).digest('hex')!==evidenceSha256)throw Error('R9_EVIDENCE_HASH_MISMATCH');
  const lines=file.toString('utf8').split(/\r?\n/),meta=new Map(),days=[];
  for(const line of lines){
    const i=line.indexOf('=');if(i<1)continue;
    const key=line.slice(0,i),value=line.slice(i+1);
    if(key.startsWith('DAY_')){
      const date=key.slice(4);
      const m=value.match(/^VERIFIED:(\d+)\/(\d+):UP(\d+):FLAT(\d+):DOWN(\d+)$/);
      if(m)days.push({date,eligible:Number(m[1]),expected:Number(m[2]),
        counts:{rising:Number(m[3]),unchanged:Number(m[4]),falling:Number(m[5])}});
      else if(!['MISSING_SOURCE'].includes(value)&&!value.startsWith('SOURCE_AUDIT_FAIL:'))
        throw Error('R9_UNKNOWN_DAY_STATUS');
    }else meta.set(key,value);
  }
  if(meta.get('RESULT')!=='READ_ONLY_COMPLETE'||meta.get('MODE')!=='READ_ONLY_NO_FETCH_NO_INSTALL_NO_PUBLISH_NO_SCHEDULE_CHANGE'
    ||meta.get('WINDOW_START')!=='2025-10-30'||meta.get('WINDOW_END')!=='2026-10-30'
    ||Number(meta.get('EXPECTED_SESSIONS'))!==252||Number(meta.get('VERIFIED_DAYS'))!==248
    ||Number(meta.get('MISSING_DAYS'))!==1||Number(meta.get('REJECTED_DAYS'))!==3
    ||days.length!==248||new Set(days.map(x=>x.date)).size!==248)throw Error('R9_EVIDENCE_CONTRACT_MISMATCH');
  days.sort((a,b)=>a.date.localeCompare(b.date));
  if(days[0].date!=='2025-10-30'||days.at(-1).date!=='2026-10-30')throw Error('R9_DATE_RANGE_MISMATCH');
  return {sourceSha:meta.get('APPROVED_SOURCE_SHA'),days};
}
function outsideScheduledWindow(){
  const p=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Seoul',hour:'2-digit',
    minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date()).map(x=>[x.type,x.value]));
  const kst=Number(p.hour)*60+Number(p.minute);
  return kst<20*60+30||kst>21*60+30;
}
function sourceModule(rel){return import(pathToFileURL(path.join(root,...rel.split('/'))).href);}
function hasTable(db,name){return Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(name));}
function rows(db,name,date){return db.prepare(`SELECT ${cols} FROM ${name} WHERE trade_date=?`).all(date);}

async function execute(){
  checkpoint('CHECK_RUNTIME');
  if(process.platform!=='win32'||Number(process.versions.node.split('.')[0])<24)throw Error('WINDOWS_NODE_24_REQUIRED');
  if(!process.execPath.toLowerCase().startsWith('e:\\zgmini\\runtime\\'))throw Error('APPROVED_NODE_NOT_SELECTED');
  if(!outsideScheduledWindow())throw Error('PC_SCHEDULE_TIME_WINDOW_BLOCKED');
  checkpoint('CHECK_R9_EVIDENCE');
  const evidence=parseR9();
  checkpoint('CHECK_PC_CONFIG_AND_SHA');
  const config=JSON.parse(fs.readFileSync(path.join(home,'config.json'),'utf8'));
  if(config.enabled!==true||config.collectionTarget!=='pc'||!config.core)throw Error('PC_CONFIG_NOT_APPROVED');
  const sha=git(['rev-parse','HEAD']);
  if(config.source!==sha||sha!==evidence.sourceSha)throw Error('APPROVED_PC_SOURCE_CHANGED_SINCE_R9');
  set('pcSourceSha',sha);
  checkpoint('CHECK_APPROVED_MODULE_WORKTREE');
  try{
    execFileSync('git',['-C',root,'diff','--quiet','HEAD','--',
      'scripts/pc-writer/breadth-r10-v9-shadow/audit.mjs',
      'lib/market-breadth/compute.mjs','lib/market-breadth/us-public-r1.mjs',
      'lib/market-score/breadth-b1-r3-calendar.mjs','scripts/pc-writer/d1.mjs'],{
      windowsHide:true,timeout:12000,stdio:['ignore','ignore','ignore'],
    });
  }catch(error){
    if(error?.status===1)throw Error('APPROVED_MODULE_WORKTREE_MODIFIED');
    throw Error('APPROVED_MODULE_GIT_CHECK_FAILED');
  }
  checkpoint('IMPORT_APPROVED_MODULES');
  const [{auditDay,eligibleRows},{calculateMarketBreadthCounts},contract,{latestCompletedSession},d1]=await Promise.all([
    sourceModule('scripts/pc-writer/breadth-r10-v9-shadow/audit.mjs'),
    sourceModule('lib/market-breadth/compute.mjs'),
    sourceModule('lib/market-breadth/us-public-r1.mjs'),
    sourceModule('lib/market-score/breadth-b1-r3-calendar.mjs'),
    sourceModule('scripts/pc-writer/d1.mjs'),
  ]);
  if([auditDay,eligibleRows,calculateMarketBreadthCounts,contract.validUsBreadthRecord,
    latestCompletedSession,d1.client,d1.credential].some(fn=>typeof fn!=='function'))throw Error('APPROVED_MODULE_INTERFACE_MISSING');
  checkpoint('CHECK_MARKET_CALENDAR');
  if(latestCompletedSession(new Date())<'2026-10-30')throw Error('R9_LAST_SESSION_IN_FUTURE');
  set('windowStart','2025-10-30');set('windowEnd','2026-10-30');
  const corePath=path.join(home,'storage','core.sqlite');
  let database;const prepared=[];
  try{
    checkpoint('OPEN_PC_SQLITE_READ_ONLY');
    database=new DatabaseSync(corePath,{readOnly:true});
    checkpoint('VERIFY_SOURCE_TABLES');
    for(const name of Object.values(tables))if(!hasTable(database,name))throw Error('PC_SOURCE_TABLE_MISSING');
    checkpoint('REVERIFY_248_SOURCE_DATES');
    for(const item of evidence.days){
      const date=item.date;
      set('lastAttemptDate',date);
      const universeRow=database.prepare(`SELECT trade_date,members_json,member_count FROM ${tables.universe} WHERE trade_date=?`).get(date);
      let members;
      try{members=JSON.parse(universeRow?.members_json);}catch{throw Error(`UNIVERSE_JSON_CHANGED_${date}`);}
      if(!Array.isArray(members)||members.length<490||members.length>520||universeRow?.trade_date!==date)
        throw Error(`UNIVERSE_CHANGED_${date}`);
      const priceRows=rows(database,tables.current,date),historyRows=rows(database,tables.history,date);
      const audit=auditDay({date,universe:{trade_date:date,members,member_count:universeRow.member_count},priceRows,historyRows});
      if(!audit.pass)throw Error(`AUDIT_CHANGED_${date}`);
      const valid=eligibleRows({date,members,priceRows,historyRows});
      if(valid.size!==audit.eligible)throw Error(`AUDIT_COUNT_CHANGED_${date}`);
      const data=[...valid].map(([securityId,p])=>({securityId,change:p.close-p.previousClose}));
      const calculated=calculateMarketBreadthCounts({market:'usa',observationDate:date,
        expectedCount:members.length,rows:data,minimumCoverage:.98});
      if(calculated?.status!=='READY'||calculated.eligibleCount!==item.eligible
        ||calculated.expectedCount!==item.expected
        ||Object.keys(item.counts).some(k=>calculated.counts[k]!==item.counts[k]))
        throw Error(`R9_CALCULATION_MISMATCH_${date}`);
      const body={version:1,universe:'SP500',source:contract.US_BREADTH_SOURCE,
        calculatedAt:new Date().toISOString(),market:'usa',...calculated};
      if(!contract.validUsBreadthRecord(body))throw Error('PUBLICATION_RECORD_INVALID');
      prepared.push(body);
      if(prepared.length%25===0){set('lastVerifiedDate',date);set('sourceAuditProgress',prepared.length);save();}
    }
    // Diagnostic only: explain the four R9 gaps without trying to fabricate them.
    checkpoint('DIAGNOSE_FOUR_MISSING_DATES');
    for(const date of ['2026-03-26','2026-03-27','2026-09-23','2026-10-14']){
      const key=`gap_${date.replaceAll('-','_')}`;
      const r=database.prepare(`SELECT trade_date,members_json,member_count FROM ${tables.universe} WHERE trade_date=?`).get(date);
      if(!r){set(key,'UNIVERSE_NOT_STORED');continue;}
      let members;
      try{members=JSON.parse(r.members_json);}catch{set(key,'UNIVERSE_JSON_INVALID');continue;}
      if(!Array.isArray(members)){set(key,'UNIVERSE_JSON_INVALID');continue;}
      const priceRows=rows(database,tables.current,date),historyRows=rows(database,tables.history,date);
      const audit=auditDay({date,universe:{trade_date:r.trade_date,members,member_count:r.member_count},priceRows,historyRows});
      set(key,audit.pass?'NOW_AUDIT_PASS_REVIEW_REQUIRED':JSON.stringify(audit.reject??{}));
    }
  }finally{try{database?.close();}catch{}}
  set('sourceAuditStatus','ALL_R9_DAYS_REVERIFIED');set('sourceAuditVerifiedDays',prepared.length);
  checkpoint('D1_CURRENT_KEY_READ_BEFORE');
  // Every historical observation was checked before acquiring remote credentials.
  const remote=d1.client(config,()=>d1.credential(root));
  const getCurrent=()=>remote.query(config.core,'SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?',[
    contract.US_BREADTH_CURRENT_KEY]);
  const before=(await getCurrent()).results?.[0]??null;
  if(!before||!contract.validUsBreadthRecord(JSON.parse(before.body)))throw Error('REMOTE_CURRENT_NOT_VERIFIED');
  checkpoint('D1_DAILY_KEYS_PREFLIGHT_AND_WRITE');
  const outcome=await publishDatedBreadthOnly(remote,config.core,prepared,{
    validRecord:contract.validUsBreadthRecord,now:Date.now(),batchSize:20,
    onProgress:progress=>{
      set('stage',progress.stage);set('expected',progress.expected);set('already',progress.already);
      set('published',progress.published);set('pending',progress.pending);save();
    },
  });
  checkpoint('D1_CURRENT_KEY_READ_AFTER');
  const after=(await getCurrent()).results?.[0]??null;
  set('currentKeyUnchanged',after?.body===before.body&&Number(after?.stored_at)===Number(before.stored_at));
  set('status',outcome.status);
  set('verifiedDays',outcome.verified);
  set('remainingUnverifiedDays',4);
  set('remainingDates','2026-03-26,2026-03-27,2026-09-23,2026-10-14');
  checkpoint('COMPLETE');
}

try{save();await execute();}
catch(error){
  set('status','FAILED');set('errorCode',safeError(error));
  const name=String(error?.name??'');
  if(/^[A-Za-z]+Error$/.test(name))set('errorClass',name);
  const code=String(error?.code??'');
  if(/^[A-Z_][A-Z_0-9]{2,64}$/.test(code))set('errorNativeCode',code);
  if(Number.isInteger(error?.status))set('childExitStatus',error.status);
  process.exitCode=1;
}
finally{try{save();}catch{process.exitCode=2;}console.log(`BACKFILL_STATUS=${result.status}`);console.log(`RESULT_FILE=${reportPath}`);}
