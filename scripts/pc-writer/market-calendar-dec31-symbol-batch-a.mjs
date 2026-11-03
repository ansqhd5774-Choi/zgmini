// Fixed 40-symbol December 2026 candidate batch using the existing EarningsAPI key.
// Private raw snapshots only. No calendar scoring, Core, D1, scheduler or feed writes.
import fs from 'node:fs';
import path from 'node:path';
import {parseEnv} from 'node:util';
import {fileURLToPath} from 'node:url';
import {inspectSymbol} from './market-calendar-dec31-symbol-probe.mjs';

const PC_HOME=String.raw`E:\ZGmini\data\pc-writer`;
const ENDPOINT='https://api.earningsapi.com/v1/earnings';
export const SYMBOLS=Object.freeze([
  'ADBE','AVGO','LULU','RH','CIEN','LEN','GIS','MU','FDS','CTAS',
  'DRI','FCEL','ACN','KMX','FDX','NKE','PAYX','LW','CAG','CCL',
  'ULTA','KR','DG','DLTR','DOCU','CRWD','ASAN','OKTA','PATH','GTLB',
  'MDB','CHWY','GME','COO','TTD','ESTC','NTAP','HPE','TOL','CASY'
]);
const MAX_BYTES=2_000_000;
const stop=code=>{throw Error(code)};
const safeCode=e=>/^DEC31_BATCH_[A-Z0-9_]+$/.test(String(e?.message))?
  e.message:'DEC31_BATCH_UNEXPECTED_STOP';

function getKey(root,env){
  const value=env.EARNINGS_API_KEY||env.EARNINGSAPI_API_KEY;
  if(value)return value;
  const f=path.join(root,'providers.env');
  if(!fs.existsSync(f))return null;
  const config=parseEnv(fs.readFileSync(f,'utf8'));
  return config.EARNINGS_API_KEY||config.EARNINGSAPI_API_KEY||null;
}

export async function runDec31Batch({pcHome=PC_HOME,env=process.env,
  fetcher=fetch,clock=()=>Date.now()}={}){
  const report={schema:'ZGMINI_DEC31_SYMBOL_BATCH_A_V1',status:'BLOCKED',
    code:'DEC31_BATCH_NOT_STARTED',source:'EarningsAPI /v1/earnings',
    range:['2026-12-01','2026-12-31'],candidateSymbols:SYMBOLS.length,
    providerCalls:0,retries:0,storedSymbols:0,positiveSymbols:0,
    decemberEventRows:0,results:[],coreWrites:0,d1Writes:0,
    schedulerWrites:0,publicationWrites:0,sourceStoredAt:null};
  let fd=null;
  const root=path.join(pcHome,'er1-input');
  const dir=path.join(root,'dec31-symbol-batch-a');
  const lock=path.join(root,'dec31-symbol-batch-a.lock');
  try{
    if(!path.isAbsolute(pcHome)||!fs.existsSync(pcHome))stop('DEC31_BATCH_PC_HOME_MISSING');
    if(clock()<Date.parse('2026-11-01T00:00:00Z')||clock()>Date.parse('2027-01-01T00:00:00Z'))
      stop('DEC31_BATCH_EXECUTION_DATE_INVALID');
    const key=getKey(pcHome,env);
    if(typeof key!=='string'||key.length<8||/\s/.test(key))
      stop('DEC31_BATCH_PROVIDER_KEY_UNAVAILABLE');
    fs.mkdirSync(dir,{recursive:true});
    try{fd=fs.openSync(lock,'wx')}catch{stop('DEC31_BATCH_ALREADY_RUNNING')}
    for(const symbol of SYMBOLS){
      const filename=path.join(dir,symbol+'.json');
      if(fs.existsSync(filename))stop('DEC31_BATCH_ALREADY_STAGED');
      const url=new URL(ENDPOINT);
      url.searchParams.set('symbol',symbol);url.searchParams.set('apikey',key);
      report.providerCalls++;
      let res;try{res=await fetcher(url.href,{redirect:'error',
        headers:{accept:'application/json'},signal:AbortSignal.timeout(15000)})}
      catch{stop('DEC31_BATCH_NETWORK_STOP')}
      if(res?.status===429)stop('DEC31_BATCH_QUOTA_STOP');
      if(!res?.ok)stop('DEC31_BATCH_HTTP_STOP');
      let raw;try{raw=await res.text()}catch{stop('DEC31_BATCH_BODY_STOP')}
      if(typeof raw!=='string'||Buffer.byteLength(raw,'utf8')>MAX_BYTES)
        stop('DEC31_BATCH_SIZE_INVALID');
      let body;try{body=JSON.parse(raw)}catch{stop('DEC31_BATCH_JSON_INVALID')}
      let stats;try{stats=inspectSymbol(body,symbol)}
      catch{stop('DEC31_BATCH_VENDOR_SHAPE_INVALID')}
      const storedAt=new Date(clock()).toISOString();
      fs.writeFileSync(filename,JSON.stringify({storedAt,body})+'\n',{flag:'wx',encoding:'utf8'});
      const saved=JSON.parse(fs.readFileSync(filename,'utf8'));
      const verified=inspectSymbol(saved.body,symbol);
      if(JSON.stringify(stats)!==JSON.stringify(verified))stop('DEC31_BATCH_READBACK_STOP');
      report.storedSymbols++;
      report.decemberEventRows+=stats.decemberDates.length;
      if(stats.decemberDates.length)report.positiveSymbols++;
      report.results.push(stats);
      report.sourceStoredAt=storedAt;
    }
    report.status='BATCH_COMPLETE';
    report.code='DEC31_BATCH_RAW_SAVED_AND_VERIFIED';
  }catch(e){report.status=report.storedSymbols>0?'PARTIAL':'BLOCKED';report.code=safeCode(e)}
  finally{if(fd!==null){try{fs.closeSync(fd);fs.unlinkSync(lock)}
    catch{report.status='STATE_UNKNOWN';report.code='DEC31_BATCH_LOCK_RELEASE_STOP'}}}
  return report;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const output=process.argv[2];
  if(!output||!path.isAbsolute(output)){
    process.stderr.write('DEC31_BATCH_RESULT_PATH_REQUIRED\n');process.exitCode=2;
  }else{
    const report=await runDec31Batch();
    try{fs.writeFileSync(output,JSON.stringify(report)+'\n',{flag:'wx'})}
    catch{process.stderr.write('DEC31_BATCH_RESULT_WRITE_STOP\n');process.exitCode=2}
    process.stdout.write(`STATUS=${report.status} CODE=${report.code} SAVED=${report.storedSymbols}/40 FOUND=${report.decemberEventRows}\n`);
    if(report.status!=='BATCH_COMPLETE')process.exitCode=1;
  }
}
