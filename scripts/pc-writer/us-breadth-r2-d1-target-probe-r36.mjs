/**
 * R36: two-role, read-only PC D1 target diagnostic after R35's failed SELECT.
 * No MarketParquet calls, source writes, public writes or Core task changes.
 * Never serializes config IDs, credentials, SQL rows, or stored JSON bodies.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const projectRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const PUBLIC_TABLE='market_public_snapshots_v1';
const R2_HISTORY_KEY='public:market-breadth-confirmed-r2:usa:history-percent:v1';
const TABLE_SQL="SELECT name FROM sqlite_master WHERE type='table' AND name=? LIMIT 1";
const KEY_SQL='SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?';
const safeCode=value=>typeof value==='string'&&
  /^(?:D1_[A-Z0-9_]+|WRANGLER_[A-Z0-9_]+|READ_ONLY_SQL_REQUIRED|INVALID_DATABASE_CONFIG)$/.test(value)
  ?value:'D1_READ_ERROR_UNCLASSIFIED';
const fail=status=>({revision:'US_BREADTH_R2_D1_TARGET_PROBE_R36',
  mode:'READ_ONLY_D1_TARGET_PROBE',status,providerCalls:0,d1Writes:0,
  eSourceWrites:0,coreTaskChanges:0});

/** Uses the same credential/config resolution as the existing R33 runner. */
export async function openR36D1({pcHome}){
 const config=JSON.parse(fs.readFileSync(path.join(pcHome,'config.json'),'utf8'));
 if(!config||typeof config.core!=='string'||typeof config.history!=='string')
  throw Error('R36_PC_D1_CONFIG_INVALID');
 const {client,credential}=await import('./d1.mjs');
 return {remote:client(config,()=>credential(projectRoot)),
  coreDatabase:config.core,historyDatabase:config.history};
}

function errorSummary(error,remote){
 const diagnostic=remote?.stats?.transportFailures?.at(-1)??null;
 return {status:'READ_FAILED',code:safeCode(error?.message),
  phase:diagnostic?.phase??null,httpStatus:diagnostic?.httpStatus??null,
  providerCodes:Array.isArray(diagnostic?.providerCodes)?diagnostic.providerCodes:[],
  authType:diagnostic?.authType??null,authRefresh:diagnostic?.authRefresh??null};
}

/** One metadata SELECT per distinct database, then optionally one R2-key SELECT. */
export async function runUsBreadthD1TargetProbeR36({
 pcHome=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),'.zgmini','pc-writer'),
 openD1=openR36D1,
}={}){
 if(typeof pcHome!=='string'||!pcHome)return fail('R36_PC_HOME_INVALID');
 let remote,coreDatabase,historyDatabase;
 try{({remote,coreDatabase,historyDatabase}=await openD1({pcHome}));}
 catch{return fail('R36_PC_CONFIG_OR_D1_CLIENT_UNAVAILABLE');}
 if(!remote||typeof remote.query!=='function'||!coreDatabase||!historyDatabase)
  return fail('R36_PC_D1_TARGET_INVALID');

 const roles={},dbCache=new Map();
 for(const [role,db] of [['core',coreDatabase],['history',historyDatabase]]){
  if(dbCache.has(db)){roles[role]=dbCache.get(db);continue;}
  let result;
  try{
   const response=await remote.query(db,TABLE_SQL,[PUBLIC_TABLE]);
   result={status:'READ_OK',publicSnapshotTablePresent:
    response?.results?.some(x=>x?.name===PUBLIC_TABLE)===true};
  }catch(error){result=errorSummary(error,remote);}
  dbCache.set(db,result);roles[role]=result;
 }

 let existingR2HistoryKey='NOT_PROBED';
 if(roles.core.status==='READ_OK'&&roles.core.publicSnapshotTablePresent){
  try{
   const response=await remote.query(coreDatabase,KEY_SQL,[R2_HISTORY_KEY]);
   existingR2HistoryKey=response?.results?.length?'EXISTS_DO_NOT_OVERWRITE':'ABSENT';
  }catch{existingR2HistoryKey='KEY_READ_FAILED';}
 }

 const coreReady=roles.core.status==='READ_OK'&&roles.core.publicSnapshotTablePresent;
 const historyReady=roles.history.status==='READ_OK'&&roles.history.publicSnapshotTablePresent;
 const roleFailed=roles.core.status==='READ_FAILED'||roles.history.status==='READ_FAILED';
 const status=roleFailed?'D1_ROLE_READ_FAILURE':
  coreReady&&!historyReady?'CORE_PUBLIC_TABLE_ONLY':
  coreReady&&historyReady?'BOTH_ROLES_HAVE_PUBLIC_TABLE_REVIEW_REQUIRED':
  'CORE_PUBLIC_TABLE_UNAVAILABLE';
 return {...fail(status),roles,existingR2HistoryKey,
  databaseRolesEqual:coreDatabase===historyDatabase,
  recommendation:!roleFailed&&coreReady&&!historyReady?'VERIFY_R2_KEY_ON_CORE_BEFORE_SEPARATE_WRITE':
   'REVIEW_READ_ONLY_EVIDENCE_BEFORE_ANY_WRITE'};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const result=process.argv.length===3&&process.argv[2]==='--probe-only'
  ?await runUsBreadthD1TargetProbeR36():fail('R36_EXPLICIT_PROBE_ONLY_REQUIRED');
 process.stdout.write(JSON.stringify(result)+'\n');
 if(result.status!=='CORE_PUBLIC_TABLE_ONLY'&&
   result.status!=='BOTH_ROLES_HAVE_PUBLIC_TABLE_REVIEW_REQUIRED')process.exitCode=2;
}
