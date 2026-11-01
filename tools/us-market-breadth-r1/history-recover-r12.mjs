/**
 * R12 one-time, fail-closed recovery of 2026-03-26/27 US breadth dated snapshots.
 * Existing R4 and R5 PC history are retained. The approved unchanged audit is
 * applied to the exact stored R5 version, after validating the superseded R4
 * collision inventory and every R5 price/history field. No current-key writes.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import {fileURLToPath,pathToFileURL} from 'node:url';

const dir=path.dirname(fileURLToPath(import.meta.url));
const report=path.join(dir,'US_BREADTH_PC_R12_TWO_DAY_RECOVERY_RESULT.txt');
const evidence=path.join(dir,'US_BREADTH_PC_R11_FOUR_GAP_READONLY_RESULT.txt');
const r11sha='c38105c0e46e8ebe7000cb3814eaf196c2586974b8e2db4cc736fea6972d138b';
const pcSha='43e0ffa392a9e655bcb4ca7b151c26ad43567e14';
const localCorePins={
  'history-recover-r12-core.mjs':'fbcec33a81006dad941ec29df90d43760f3c41103a05a47458fa1ac044dda4c6',
  'history-backfill-r10-core.mjs':'20cbd6f6895880840ea93dad0e1d303ec1164254dbf13dcb5ed06e110e5765d6',
};
const home=process.env.ZGMINI_PC_HOME??'E:\\ZGmini\\data\\pc-writer';
const root=process.env.ZGMINI_PC_REPO??'E:\\ZGmini\\projects\\zgmini-earnings-history-pc-release';
const pinned={
  'lib/market-breadth/compute.mjs':'25d50550b7e3ab8abadf90fc78e8dd3c3f37b6f7a0b72f2e0b11482c8c9c7c10',
  'lib/market-breadth/us-public-r1.mjs':'f0b092af381413b8d7b02baf5750388cb384e9e53e6b3f3a362be781efe6382b',
};
const t={
  universe:'market_score_breadth_b1_r3_universe_v1',
  current:'market_score_breadth_b1_r3_current_v1',
  history:'market_score_breadth_b1_r3_history_v1',
};
const columns='trade_date,ticker,previous_date,previous_close,current_close,current_volume,source,feed,provenance_json';
const days=['2026-03-26','2026-03-27'];
const out={REPORT:'US_BREADTH_PC_R12_TWO_DAY_RECOVERY',AT_UTC:new Date().toISOString(),
  MODE:'APPROVED_R5_HISTORY_SELECTION_DATED_D1_APPEND_ONLY',
  PC_SQLITE_WRITTEN:false,CURRENT_KEY_WRITTEN:false,COLLECTOR_RAN:false,
  SCHEDULE_CHANGED:false,STATUS:'STARTED',APPROVED_PC_SHA:pcSha};
function set(k,v){out[k]=typeof v==='object'&&v!==null?JSON.stringify(v):v;}
function save(){fs.writeFileSync(report,Object.entries(out).map(([k,v])=>
  `${k}=${String(v??'NULL').replace(/[\r\n\t]/g,' ').slice(0,500)}`).join('\r\n')+'\r\n','utf8');}
function stage(x){set('STAGE',x);save();}
function hash(file){return createHash('sha256').update(fs.readFileSync(file)).digest('hex');}
function git(args){return execFileSync('git',['-C',root,...args],{
  encoding:'utf8',windowsHide:true,timeout:12000,stdio:['ignore','pipe','ignore']}).trim();}
function failCode(e){
  const value=String(e?.message??'');
  return /^[A-Z0-9_-]{1,112}$/.test(value)?value:
    e?.code==='ERR_MODULE_NOT_FOUND'?'APPROVED_MODULE_NOT_FOUND':'R12_UNCLASSIFIED_FAILURE';
}
function outsideScheduledWindow(){
  const p=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Seoul',hour:'2-digit',
    minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date()).map(x=>[x.type,x.value]));
  const minutes=Number(p.hour)*60+Number(p.minute);
  return minutes<20*60+30||minutes>21*60+30;
}
function readRows(db,table,day){return db.prepare(`SELECT ${columns} FROM ${table} WHERE trade_date=?`).all(day);}
function sourceModule(rel){return import(pathToFileURL(path.join(root,...rel.split('/'))).href);}
function packageModule(rel){
  const expected=pinned[rel];
  if(!expected)throw Error('R12_PACKAGE_MODULE_NOT_ALLOWED');
  const file=path.join(dir,...rel.split('/'));
  if(hash(file)!==expected)throw Error('R12_PACKAGE_MODULE_SHA_DRIFT');
  return import(pathToFileURL(file).href);
}
function checkEvidence(){
  if(hash(evidence)!==r11sha)throw Error('R12_R11_EVIDENCE_HASH_DRIFT');
  const map=new Map(fs.readFileSync(evidence,'utf8').split(/\r?\n/).map(line=>{
    const index=line.indexOf('=');return index>0?[line.slice(0,index),line.slice(index+1)]:['',''];
  }));
  if(map.get('REPORT')!=='US_BREADTH_PC_R11_FOUR_GAP_READONLY'
    ||map.get('STATUS')!=='READ_ONLY_COMPLETE'
    ||map.get('LIVE_PC_SOURCE_SHA')!==pcSha)throw Error('R12_R11_EVIDENCE_CONTRACT_DRIFT');
  for(const [day,conflicts,eligible] of [['2026-03-26',470,28],['2026-03-27',468,30]]){
    let audit;try{audit=JSON.parse(map.get(`DAY_${day.replaceAll('-','_')}_AUDIT`));}
    catch{throw Error('R12_R11_AUDIT_EVIDENCE_MISSING');}
    if(audit.pass!==false||audit.eligible!==eligible||audit.required!==493
      ||audit.reject?.HISTORY_CONFLICT!==conflicts||audit.reject?.MISSING_PRICE!==5)
      throw Error('R12_R11_AUDIT_EVIDENCE_DRIFT');
  }
}
async function execute(){
  stage('RUNTIME');
  if(process.platform!=='win32'||Number(process.versions.node.split('.')[0])<24)
    throw Error('WINDOWS_NODE_24_REQUIRED');
  if(!process.execPath.toLowerCase().startsWith('e:\\zgmini\\runtime\\'))
    throw Error('R12_APPROVED_NODE_NOT_SELECTED');
  if(!outsideScheduledWindow())throw Error('R12_SCHEDULE_TIME_WINDOW_BLOCKED');
  stage('CHECK_R11_EVIDENCE');checkEvidence();
  stage('APPROVED_SOURCE_IDENTITY');
  const config=JSON.parse(fs.readFileSync(path.join(home,'config.json'),'utf8'));
  if(config.enabled!==true||config.collectionTarget!=='pc'||!config.core
    ||config.source!==pcSha||git(['rev-parse','HEAD'])!==pcSha)
    throw Error('R12_APPROVED_PC_SOURCE_CHANGED');
  try{execFileSync('git',['-C',root,'diff','--quiet','HEAD','--',
    'scripts/pc-writer/breadth-r10-v9-shadow/audit.mjs',
    'lib/market-score/breadth-b1-r3-calendar.mjs','scripts/pc-writer/d1.mjs'],{
    windowsHide:true,timeout:12000,stdio:['ignore','ignore','ignore']});}
  catch{throw Error('R12_APPROVED_MODULE_WORKTREE_DRIFT');}
  const required=[
    'scripts/pc-writer/breadth-r10-v9-shadow/audit.mjs',
    'lib/market-score/breadth-b1-r3-calendar.mjs','scripts/pc-writer/d1.mjs',
  ];
  for(const rel of required)if(!fs.existsSync(path.join(root,...rel.split('/'))))
    throw Error('R12_APPROVED_MODULE_MISSING');
  for(const [rel,sha] of Object.entries(localCorePins))
    if(hash(path.join(dir,rel))!==sha)throw Error('R12_RECOVERY_CORE_HASH_DRIFT');
  stage('LOAD_APPROVED_FORMULA_AND_AUDIT');
  const [{selectCanonicalR5History},{publishDatedBreadthOnly},
    {auditDay,eligibleRows},{calculateMarketBreadthCounts},contract,
    {isMarketSession},d1]=await Promise.all([
    import(pathToFileURL(path.join(dir,'history-recover-r12-core.mjs')).href),
    import(pathToFileURL(path.join(dir,'history-backfill-r10-core.mjs')).href),
    sourceModule(required[0]),packageModule('lib/market-breadth/compute.mjs'),
    packageModule('lib/market-breadth/us-public-r1.mjs'),
    sourceModule(required[1]),sourceModule(required[2]),
  ]);
  if([auditDay,eligibleRows,calculateMarketBreadthCounts,contract.validUsBreadthRecord,
    isMarketSession,d1.client,d1.credential,selectCanonicalR5History,publishDatedBreadthOnly]
    .some(fn=>typeof fn!=='function'))
    throw Error('R12_APPROVED_MODULE_INTERFACE_DRIFT');
  const prepared=[];
  stage('PC_SQLITE_READ_ONLY_SOURCE_AUDIT');
  const db=new DatabaseSync(path.join(home,'storage','core.sqlite'),{readOnly:true});
  try{
    for(const name of Object.values(t))if(!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(name))
      throw Error('R12_SOURCE_TABLE_MISSING');
    for(const day of days){
      if(!isMarketSession(day))throw Error('R12_NON_MARKET_DAY');
      const u=db.prepare(`SELECT trade_date,members_json,member_count FROM ${t.universe} WHERE trade_date=?`).get(day);
      let members;try{members=JSON.parse(u?.members_json);}catch{throw Error('R12_UNIVERSE_JSON_DRIFT');}
      if(u?.trade_date!==day||!Array.isArray(members)||members.length!==503||u.member_count!==503)
        throw Error('R12_UNIVERSE_DRIFT');
      const priceRows=readRows(db,t.current,day),historyRows=readRows(db,t.history,day);
      const universe={trade_date:day,members,member_count:u.member_count};
      const original=auditDay({date:day,universe,priceRows,historyRows});
      const expectedConflicts=day==='2026-03-26'?470:468;
      if(original.pass!==false||original.reject?.HISTORY_CONFLICT!==expectedConflicts
        ||original.reject?.MISSING_PRICE!==5)throw Error('R12_ORIGINAL_AUDIT_CHANGED');
      const canonical=selectCanonicalR5History({date:day,members,currentRows:priceRows,historyRows});
      const approved=auditDay({date:day,universe,priceRows,historyRows:canonical.rows});
      const eligible=eligibleRows({date:day,members,priceRows,historyRows:canonical.rows});
      if(!approved.pass||approved.eligible!==498||approved.required!==493
        ||eligible.size!==498||approved.reject?.MISSING_PRICE!==5
        ||Object.keys(approved.reject??{}).length!==1)throw Error('R12_CANONICAL_SOURCE_AUDIT_FAILED');
      const calculated=calculateMarketBreadthCounts({market:'usa',observationDate:day,
        expectedCount:members.length,minimumCoverage:.98,
        rows:[...eligible].map(([securityId,p])=>({securityId,change:p.close-p.previousClose}))});
      if(calculated?.status!=='READY'||calculated.eligibleCount!==498||calculated.expectedCount!==503
        ||Object.values(calculated.counts??{}).some(v=>!Number.isInteger(v))
        ||calculated.counts.rising+calculated.counts.unchanged+calculated.counts.falling!==498)
        throw Error('R12_CALCULATION_NOT_READY');
      const body={version:1,universe:'SP500',source:contract.US_BREADTH_SOURCE,
        calculatedAt:new Date().toISOString(),market:'usa',...calculated};
      if(!contract.validUsBreadthRecord(body))throw Error('R12_PUBLIC_CONTRACT_INVALID');
      prepared.push(body);
      set(`DAY_${day.replaceAll('-','_')}`,{originalEligible:original.eligible,
        canonicalEligible:approved.eligible,required:approved.required,
        retainedOldVersion:canonical.meta.archivedR4,counts:calculated.counts});
      save();
    }
  }finally{db.close();}
  if(prepared.length!==2)throw Error('R12_VERIFIED_COUNT_MISMATCH');
  stage('REMOTE_CURRENT_KEY_READ_BEFORE');
  const remote=d1.client(config,()=>d1.credential(root));
  const readCurrent=()=>remote.query(config.core,
    'SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?',
    [contract.US_BREADTH_CURRENT_KEY]);
  const before=(await readCurrent()).results?.[0]??null;
  if(!before||!contract.validUsBreadthRecord(JSON.parse(before.body)))
    throw Error('R12_CURRENT_PUBLIC_KEY_INVALID');
  stage('D1_DATED_ONLY_WRITE_AND_READBACK');
  const written=await publishDatedBreadthOnly(remote,config.core,prepared,{
    validRecord:contract.validUsBreadthRecord,now:Date.now(),batchSize:2,
    onProgress:status=>{set('WRITE_PROGRESS',status);save();},
  });
  stage('REMOTE_CURRENT_KEY_READ_AFTER');
  const after=(await readCurrent()).results?.[0]??null;
  set('CURRENT_KEY_UNCHANGED',after?.body===before.body&&Number(after?.stored_at)===Number(before.stored_at));
  set('D1_DATED_VERIFIED',written.verified);
  set('D1_DATED_CREATED',written.published);
  set('D1_DATED_ALREADY_PRESENT',written.already);
  set('REMAINING_SOURCE_GAPS','2026-09-23,2026-10-14');
  set('STATUS',written.status);stage('COMPLETE');
}
try{save();await execute();}
catch(e){set('STATUS','FAILED');set('ERROR_CODE',failCode(e));process.exitCode=1;}
finally{try{save();}catch{process.exitCode=2;}
  console.log(`R12_RECOVERY_STATUS=${out.STATUS}`);console.log(`RESULT_FILE=${report}`);}
