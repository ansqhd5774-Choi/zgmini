// Authorized one-shot: PC SQLite read-only R4 issuer aggregate -> new D1 sidecar.
// Never alters PC SQLite, R4 scores, E1-R5, collector, scheduler or other D1 keys.
import fs from 'node:fs';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {fileURLToPath} from 'node:url';
import {readStoredEarningsRiskFourFactor}
  from '../../lib/market-score/earnings-recession-stored-r4-pc-r1.mjs';
import {buildRiskFourRawPayload}
  from '../../lib/market-score/earnings-risk-four-raw-source-r1.mjs';
import {riskFourRawWriter,RISK_R4_RAW_KEY}
  from '../../worker/earnings-risk-four-raw-r1.mjs';

const self=fileURLToPath(import.meta.url);
const now=()=>Date.now();
const safeError=error=>{
 const code=String(error?.message??'RISK_R4_RAW_FAILED');
 return /^[A-Z][A-Z0-9_]{2,100}$/.test(code)?code:'RISK_R4_RAW_OPERATION_FAILED';
};

function readonlyAdapter(sqlite){
 return {prepare(sql){
  if(typeof sql!=='string'||!/^\s*SELECT\b/i.test(sql)
    ||/;|--|\/\*|\b(INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|ATTACH|PRAGMA|VACUUM)\b/i.test(sql))
    throw Error('RISK_R4_RAW_SQL_READ_ONLY_REQUIRED');
  return {bind(...args){return {
   all:async()=>({results:sqlite.prepare(sql).all(...args)}),
   first:async()=>sqlite.prepare(sql).get(...args)??null,
  };}};
 }};
}

export async function readPcFourRaw({base,asOf=new Date(now()).toISOString().slice(0,10)}={}){
 if(typeof base!=='string'||!path.isAbsolute(base))throw Error('RISK_R4_RAW_PC_HOME_REQUIRED');
 const dbPath=path.join(base,'storage','core.sqlite');
 if(!fs.existsSync(dbPath))throw Error('RISK_R4_RAW_PC_SQLITE_MISSING');
 let sqlite;
 try{
  sqlite=new DatabaseSync(dbPath,{readOnly:true,timeout:5000});
  sqlite.exec('PRAGMA query_only=ON');
  const evidence=await readStoredEarningsRiskFourFactor({
   db:readonlyAdapter(sqlite),asOf,includeRaw:true,
  });
  if(evidence.status!=='READY')throw Error('RISK_R4_RAW_PC_REPLAY_NOT_READY');
  return buildRiskFourRawPayload(evidence,{now:now()});
 }finally{try{sqlite?.close();}catch{}}
}

if(process.argv[1]&&path.resolve(process.argv[1])===self){
 const args=process.argv.slice(2);
 const dry=args.length===1&&args[0]==='--dry-run';
 const apply=args.length===2&&args.includes('--apply')
   &&args.includes('--confirm-earnings-risk-four-raw-d1-write');
 const base=process.env.ZGMINI_PC_HOME||'E:\\ZGmini\\data\\pc-writer';
 if(!dry&&!apply){console.error('ERROR=RISK_R4_RAW_INVALID_ARGUMENTS');process.exitCode=2;}
 else{
  try{
   let config,operationalRoot;
   if(apply){
    operationalRoot=process.env.ZGMINI_EARNINGS_C_OPERATIONAL_ROOT;
    if(!operationalRoot||!fs.existsSync(operationalRoot))
     throw Error('RISK_R4_RAW_APPROVED_OPERATIONAL_ROOT_REQUIRED');
    config=JSON.parse(fs.readFileSync(path.join(base,'config.json'),'utf8'));
    const {inspectD1Source,validateD1DualSource}
      =await import('./EARNINGS_R4_C_D1_DUAL_SOURCE_GATES.mjs');
    const publisherRoot=path.resolve(path.dirname(self),'../..');
    validateD1DualSource({config,
     publisher:inspectD1Source(publisherRoot,{publisher:true}),
     operational:inspectD1Source(operationalRoot)});
   }
   const payload=await readPcFourRaw({base});
   if(dry)console.log(JSON.stringify({status:'PASS_READONLY_R4_RAW_PREFLIGHT',
    key:RISK_R4_RAW_KEY,financialPeriodEnd:payload.financialPeriodEnd,
    sourceVersion:payload.sourceVersion,diagnosticScore:payload.diagnosticScore,
    factors:payload.factors,historyPeriods:payload.history.map(row=>row.periodEnd),
    pcSqliteWrites:0,d1Writes:0,scoreWrites:0}));
   else{
    const {client,credential}=await import('./d1.mjs');
    const remote=client(config,()=>credential(operationalRoot));
    const result=await riskFourRawWriter(remote.adapter(config.core,{allowWrites:true}))
      .write(payload);
    if(!['READBACK_VERIFIED','ALREADY_STORED'].includes(result.status))
     throw Error('RISK_R4_RAW_D1_READBACK_FAILED');
    console.log(JSON.stringify({status:result.status,key:result.key,
     financialPeriodEnd:payload.financialPeriodEnd,sourceVersion:payload.sourceVersion,
     factors:payload.factors,diagnosticScore:payload.diagnosticScore,
     pcSqliteWrites:0,scoreWrites:0,d1Readback:result.status}));
   }
  }catch(error){console.error('ERROR='+safeError(error));process.exitCode=1;}
 }
}
