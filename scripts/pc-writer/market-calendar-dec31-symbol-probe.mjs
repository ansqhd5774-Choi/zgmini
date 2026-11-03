// One bounded December 2026 probe of the already approved EarningsAPI provider.
// Stages raw responses on the PC only; no Core/D1/scheduler/publication writes.
import fs from 'node:fs';
import path from 'node:path';
import {parseEnv} from 'node:util';
import {fileURLToPath} from 'node:url';

const PC_HOME=String.raw`E:\ZGmini\data\pc-writer`;
const ENDPOINT='https://api.earningsapi.com/v1/earnings';
const SYMBOLS=Object.freeze(['BOX','COST','ORCL']);
const MAX_BYTES=2_000_000;
const stop=code=>{throw Error(code)};
const errorCode=e=>/^DEC31_SYMBOL_[A-Z0-9_]+$/.test(e?.message??'')?e.message:'DEC31_SYMBOL_UNEXPECTED_STOP';

function providerKey(pcHome,env){
  const direct=env.EARNINGS_API_KEY||env.EARNINGSAPI_API_KEY;
  if(typeof direct==='string'&&direct.trim())return direct.trim();
  const file=path.join(pcHome,'providers.env');
  if(!fs.existsSync(file))return null;
  const values=parseEnv(fs.readFileSync(file,'utf8'));
  return values.EARNINGS_API_KEY||values.EARNINGSAPI_API_KEY||null;
}

export function inspectSymbol(body,symbol){
  if(!Array.isArray(body)||body.length>1000)stop('DEC31_SYMBOL_RESPONSE_SHAPE_INVALID');
  const dates=[];
  for(const row of body){
    if(!row||typeof row!=='object'||Array.isArray(row)||row.symbol!==symbol||
      typeof row.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(row.date)||
      !Number.isFinite(Date.parse(row.date+'T00:00:00Z')))
      stop('DEC31_SYMBOL_RESPONSE_ROW_INVALID');
    if(row.date>='2026-12-01'&&row.date<='2026-12-31')dates.push(row.date);
  }
  return {symbol,totalRows:body.length,decemberDates:[...new Set(dates)].sort()};
}

export async function runDec31SymbolProbe({pcHome=PC_HOME,env=process.env,
  fetcher=fetch,clock=()=>Date.now()}={}){
  const report={schema:'ZGMINI_DEC31_SYMBOL_PROBE_V1',status:'BLOCKED',
    code:'DEC31_SYMBOL_NOT_STARTED',symbols:[...SYMBOLS],providerCalls:0,
    stagedSymbols:0,decemberEventRows:0,results:[],coreWrites:0,d1Writes:0,
    schedulerWrites:0,publicationWrites:0};
  let lockFd=null;
  const parent=path.join(pcHome,'er1-input');
  const folder=path.join(parent,'dec31-symbol-probe');
  const lock=path.join(parent,'dec31-symbol-probe.lock');
  try{
    if(!path.isAbsolute(pcHome)||!fs.existsSync(pcHome))stop('DEC31_SYMBOL_PC_HOME_MISSING');
    if(clock()<Date.parse('2026-11-01T00:00:00Z')||clock()>Date.parse('2027-01-01T00:00:00Z'))
      stop('DEC31_SYMBOL_EXECUTION_DATE_INVALID');
    const key=providerKey(pcHome,env);
    if(!key||typeof key!=='string'||key.length<8||/\s/.test(key))
      stop('DEC31_SYMBOL_PROVIDER_KEY_UNAVAILABLE');
    fs.mkdirSync(folder,{recursive:true});
    try{lockFd=fs.openSync(lock,'wx')}catch{stop('DEC31_SYMBOL_ALREADY_RUNNING')}
    for(const symbol of SYMBOLS){
      const savedFile=path.join(folder,symbol+'.json');
      if(fs.existsSync(savedFile))stop('DEC31_SYMBOL_ALREADY_STAGED');
      const url=new URL(ENDPOINT);url.searchParams.set('symbol',symbol);url.searchParams.set('apikey',key);
      report.providerCalls++;
      let response;
      try{response=await fetcher(url.href,{redirect:'error',headers:{accept:'application/json'},
        signal:AbortSignal.timeout(15000)})}catch{stop('DEC31_SYMBOL_NETWORK_STOP')}
      if(response?.status===429)stop('DEC31_SYMBOL_RATE_LIMIT_STOP');
      if(!response?.ok)stop('DEC31_SYMBOL_HTTP_STOP');
      let raw;try{raw=await response.text()}catch{stop('DEC31_SYMBOL_BODY_STOP')}
      if(typeof raw!=='string'||Buffer.byteLength(raw,'utf8')>MAX_BYTES)
        stop('DEC31_SYMBOL_RESPONSE_SIZE_INVALID');
      let body;try{body=JSON.parse(raw)}catch{stop('DEC31_SYMBOL_RESPONSE_JSON_INVALID')}
      const stats=inspectSymbol(body,symbol);
      fs.writeFileSync(savedFile,JSON.stringify({storedAt:new Date(clock()).toISOString(),body})+'\n',
        {flag:'wx',encoding:'utf8'});
      const readback=JSON.parse(fs.readFileSync(savedFile,'utf8'));
      const verified=inspectSymbol(readback.body,symbol);
      if(JSON.stringify(stats)!==JSON.stringify(verified))stop('DEC31_SYMBOL_LOCAL_READBACK_STOP');
      report.stagedSymbols++;
      report.decemberEventRows+=stats.decemberDates.length;
      report.results.push(stats);
    }
    report.status=report.decemberEventRows>0?'PROBE_POSITIVE':'INCONCLUSIVE';
    report.code=report.decemberEventRows>0?'DEC31_SYMBOL_UPCOMING_EVENTS_FOUND':
      'DEC31_SYMBOL_NO_DECEMBER_EVENTS';
  }catch(e){report.status=report.stagedSymbols?'PARTIAL':'BLOCKED';report.code=errorCode(e)}
  finally{if(lockFd!==null){try{fs.closeSync(lockFd);fs.unlinkSync(lock)}
    catch{report.status='STATE_UNKNOWN';report.code='DEC31_SYMBOL_LOCK_RELEASE_STOP'}}}
  return report;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const output=process.argv[2];
  if(!output||!path.isAbsolute(output)){
    process.stderr.write('DEC31_SYMBOL_RESULT_PATH_REQUIRED\n');process.exitCode=2;
  }else{
    const report=await runDec31SymbolProbe();
    try{fs.writeFileSync(output,JSON.stringify(report)+'\n',{flag:'wx'})}
    catch{process.stderr.write('DEC31_SYMBOL_RESULT_WRITE_STOP\n');process.exitCode=2}
    process.stdout.write(`STATUS=${report.status} CODE=${report.code} CALLS=${report.providerCalls} DATES=${report.decemberEventRows}\n`);
    if(!['PROBE_POSITIVE','INCONCLUSIVE'].includes(report.status))process.exitCode=1;
  }
}
