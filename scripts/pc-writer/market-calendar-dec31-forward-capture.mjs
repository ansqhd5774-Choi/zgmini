// Bounded, one-time December 2026 EarningsAPI capture to PC-private storage.
// Reuse Core input read-only; never change Core, D1, scheduler or existing feeds.
import fs from 'node:fs';
import path from 'node:path';
import {parseEnv} from 'node:util';
import {DatabaseSync} from 'node:sqlite';
import {fileURLToPath} from 'node:url';

const PC_HOME=String.raw`E:\ZGmini\data\pc-writer`;
const ENDPOINT='https://api.earningsapi.com/v1/calendar/earnings';
const MAX_REQUESTS=31;
const MAX_BYTES=2_000_000;
export const FIRST_DAY='2026-12-01';
export const LAST_DAY='2026-12-31';
const stop=code=>{throw Error(code)};
const errorCode=e=>/^DEC31_[A-Z0-9_]+$/.test(e?.message??'')?e.message:'DEC31_UNEXPECTED_STOP';

export function targetDays(){
  const out=[];
  for(let t=Date.parse(FIRST_DAY+'T00:00:00Z');t<=Date.parse(LAST_DAY+'T00:00:00Z');t+=86400000)
    out.push(new Date(t).toISOString().slice(0,10));
  return out;
}

export function inspectDay(payload,day){
  if(payload?.date!==day||!['pre','after','notSupplied'].every(k=>Array.isArray(payload[k])))
    stop('DEC31_DAY_SHAPE_INVALID');
  const result={date:day,total:0,pre:0,after:0,notSupplied:0,
    epsEstimates:0,revenueEstimates:0,epsActuals:0,revenueActuals:0,invalidRows:0};
  for(const group of ['pre','after','notSupplied']){
    if(payload[group].length>5000)stop('DEC31_DAY_TOO_MANY_EVENTS');
    for(const row of payload[group]){
      result[group]++;result.total++;
      if(!row||typeof row!=='object'||Array.isArray(row)||
        typeof row.symbol!=='string'||!/^[A-Z0-9.\-]{1,12}$/.test(row.symbol)||
        typeof row.name!=='string'||!row.name.trim())result.invalidRows++;
      if(typeof row?.epsEstimate==='number'&&Number.isFinite(row.epsEstimate))result.epsEstimates++;
      if(typeof row?.revenueEstimate==='number'&&Number.isFinite(row.revenueEstimate))result.revenueEstimates++;
      if(typeof row?.eps==='number'&&Number.isFinite(row.eps))result.epsActuals++;
      if(typeof row?.revenue==='number'&&Number.isFinite(row.revenue))result.revenueActuals++;
    }
  }
  return result;
}

function decode(raw,day){
  if(typeof raw!=='string'||Buffer.byteLength(raw,'utf8')>MAX_BYTES||raw.length<20)
    stop('DEC31_RESPONSE_SIZE_INVALID');
  let body;try{body=JSON.parse(raw)}catch{stop('DEC31_RESPONSE_JSON_INVALID')}
  return {body,stats:inspectDay(body,day)};
}

function providerKey(pcHome,env){
  const direct=env.EARNINGS_API_KEY||env.EARNINGSAPI_API_KEY;
  if(typeof direct==='string'&&direct.trim())return direct.trim();
  const file=path.join(pcHome,'providers.env');
  if(!fs.existsSync(file))return null;
  const values=parseEnv(fs.readFileSync(file,'utf8'));
  return values.EARNINGS_API_KEY||values.EARNINGSAPI_API_KEY||null;
}

function coreReader(pcHome){
  const file=path.join(pcHome,'storage','core.sqlite');
  if(!fs.existsSync(file))return Object.assign(()=>null,{close(){}});
  const db=new DatabaseSync(file,{readOnly:true});
  const stmt=db.prepare("SELECT body,stored_at FROM public_feed_snapshots_v1 WHERE kind='input' AND feed_key=? AND snapshot_key='current'");
  return Object.assign(day=>{
    const row=stmt.get(`release-calendar:earnings-api:${day}`);
    if(!row)return null;
    let value;try{value=JSON.parse(row.body)}catch{return null}
    if(value?.requestedDate!==day||typeof value.text!=='string')return null;
    try{return {...decode(value.text,day),storedAt:new Date(row.stored_at).toISOString(),source:'core'}}
    catch{return null}
  },{close(){db.close()}});
}

function privateReader(folder,day){
  const file=path.join(folder,day+'.json');
  if(!fs.existsSync(file))return null;
  const stat=fs.lstatSync(file);
  if(!stat.isFile()||stat.isSymbolicLink()||stat.size>MAX_BYTES+1024)
    stop('DEC31_PRIVATE_FILE_UNSAFE');
  let saved;try{saved=JSON.parse(fs.readFileSync(file,'utf8'))}catch{stop('DEC31_PRIVATE_JSON_INVALID')}
  if(saved?.body?.date!==day||!Number.isFinite(Date.parse(saved.storedAt)))
    stop('DEC31_PRIVATE_DAY_INVALID');
  return {body:saved.body,stats:inspectDay(saved.body,day),storedAt:saved.storedAt,source:'private'};
}

export async function runDec31Capture({pcHome=PC_HOME,fetcher=fetch,env=process.env,
  lookupCore=coreReader,clock=()=>Date.now(),maxRequests=MAX_REQUESTS}={}){
  const report={schema:'ZGMINI_DEC31_PRIVATE_CAPTURE_V1',status:'BLOCKED',code:null,
    range:[FIRST_DAY,LAST_DAY],targetDayCount:31,coveredDayCount:0,
    coreReusedDayCount:0,privateReusedDayCount:0,newDayCount:0,
    providerCalls:0,retries:0,coreWrites:0,d1Writes:0,schedulerWrites:0,
    records:0,invalidVendorRows:0,missingDays:[],daily:[],sourceStoredAt:null};
  let core=null,fd=null,locked=false;
  const root=path.join(pcHome,'er1-input');
  const folder=path.join(root,'dec31-forward-days');
  const lock=path.join(root,'dec31-forward-capture.lock');
  const known=new Map();
  try{
    if(!Number.isInteger(maxRequests)||maxRequests<0||maxRequests>MAX_REQUESTS)
      stop('DEC31_REQUEST_BUDGET_INVALID');
    if(typeof pcHome!=='string'||!path.isAbsolute(pcHome)||!fs.existsSync(pcHome))
      stop('DEC31_PC_HOME_MISSING');
    if(clock()<Date.parse('2026-11-01T00:00:00Z')||clock()>Date.parse('2027-01-01T00:00:00Z'))
      stop('DEC31_EXECUTION_DATE_OUT_OF_RANGE');
    fs.mkdirSync(root,{recursive:true});fs.mkdirSync(folder,{recursive:true});
    try{fd=fs.openSync(lock,'wx');locked=true}catch{stop('DEC31_CAPTURE_ALREADY_RUNNING')}
    core=lookupCore(pcHome);
    const missing=[];
    for(const day of targetDays()){
      const stored=privateReader(folder,day)??core(day);
      if(stored){known.set(day,stored);if(stored.source==='core')report.coreReusedDayCount++;
        else report.privateReusedDayCount++;}
      else missing.push(day);
    }
    const key=missing.length?providerKey(pcHome,env):null;
    if(missing.length&&(!key||typeof key!=='string'||key.length<8||/\s/.test(key)))
      stop('DEC31_PROVIDER_KEY_UNAVAILABLE');
    for(const day of missing){
      if(report.providerCalls>=maxRequests)break;
      const url=new URL(ENDPOINT);url.searchParams.set('date',day);url.searchParams.set('apikey',key);
      report.providerCalls++;
      let response;
      try{response=await fetcher(url.href,{redirect:'error',headers:{accept:'application/json'},
        signal:AbortSignal.timeout(15000)})}catch{stop('DEC31_PROVIDER_NETWORK_STOP')}
      if(response?.status===429)stop('DEC31_PROVIDER_RATE_LIMIT_STOP');
      if(!response?.ok)stop('DEC31_PROVIDER_HTTP_STOP');
      let raw;try{raw=await response.text()}catch{stop('DEC31_PROVIDER_BODY_STOP')}
      const parsed=decode(raw,day);const storedAt=new Date(clock()).toISOString();
      fs.writeFileSync(path.join(folder,day+'.json'),JSON.stringify({storedAt,body:parsed.body})+'\n',
        {flag:'wx',encoding:'utf8'});
      const saved=privateReader(folder,day);
      if(!saved)stop('DEC31_LOCAL_READBACK_STOP');
      known.set(day,saved);report.newDayCount++;
    }
    report.status=known.size===31?'PASS':'PARTIAL';
    report.code=report.status==='PASS'?'DEC31_PRIVATE_SAVED_AND_VERIFIED':'DEC31_REQUEST_BUDGET_REACHED';
  }catch(e){report.code=errorCode(e);report.status=known.size?'PARTIAL':'BLOCKED'}
  finally{
    for(const day of targetDays()){
      const item=known.get(day);if(!item){report.missingDays.push(day);continue}
      report.daily.push({...item.stats,source:item.source});
      report.records+=item.stats.total;report.invalidVendorRows+=item.stats.invalidRows;
      if(!report.sourceStoredAt||item.storedAt>report.sourceStoredAt)
        report.sourceStoredAt=item.storedAt;
    }
    report.coveredDayCount=known.size;
    // Valid empty vendor responses do not satisfy calendar-data acquisition.
    // Preserve the empty raw snapshots but do not classify them as business PASS.
    if(report.status==='PASS'&&report.records===0){
      report.status='PARTIAL';
      report.code='DEC31_NO_EARNINGS_EVENTS_IN_PROVIDER_RESPONSES';
    }
    try{core?.close?.()}catch{}
    if(fd!==null)try{fs.closeSync(fd)}catch{}
    if(locked)try{fs.unlinkSync(lock)}catch{report.status='STATE_UNKNOWN';report.code='DEC31_LOCK_RELEASE_STOP'}
  }
  return report;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const output=process.argv[2];
  if(!output||!path.isAbsolute(output)){
    process.stderr.write('DEC31_RESULT_PATH_REQUIRED\n');process.exitCode=2;
  }else{
    const report=await runDec31Capture();
    try{fs.writeFileSync(output,JSON.stringify(report)+'\n',{flag:'wx'})}
    catch{process.stderr.write('DEC31_RESULT_WRITE_STOP\n');process.exitCode=2}
    process.stdout.write(`STATUS=${report.status} CODE=${report.code} COVERED=${report.coveredDayCount}/31 CALLS=${report.providerCalls}\n`);
    if(report.status!=='PASS')process.exitCode=1;
  }
}
