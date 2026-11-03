// One-time, date-bounded EarningsAPI PC-private capture for 2026-11-01..30.
// Reuses already stored Core inputs read-only. Never alters Core/D1/schedulers.
import fs from 'node:fs';
import path from 'node:path';
import {parseEnv} from 'node:util';
import {DatabaseSync} from 'node:sqlite';
import {fileURLToPath} from 'node:url';

const PC_HOME=String.raw`E:\ZGmini\data\pc-writer`;
export const FIRST_DAY='2026-11-01';
export const LAST_DAY='2026-11-30';
const MAX_PROVIDER_REQUESTS=30;
const MAX_BYTES=2_000_000;
const ENDPOINT='https://api.earningsapi.com/v1/calendar/earnings';
const fail=code=>{throw Error(code)};
const validDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&
  new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
const errorCode=e=>/^NOV30_[A-Z0-9_]+$/.test(e?.message??'')?e.message:'NOV30_UNEXPECTED_STOP';

export function targetDays(){
  const days=[];
  for(let ms=Date.parse(FIRST_DAY+'T00:00:00Z');ms<=Date.parse(LAST_DAY+'T00:00:00Z');ms+=86400000)
    days.push(new Date(ms).toISOString().slice(0,10));
  return days;
}

export function inspectDay(payload,day){
  if(!validDate(day)||payload?.date!==day||!['pre','after','notSupplied'].every(k=>Array.isArray(payload[k])))
    fail('NOV30_DAY_SHAPE_INVALID');
  let count=0,invalid=0;
  for(const k of ['pre','after','notSupplied']){
    if(payload[k].length>5000)fail('NOV30_DAY_TOO_MANY_EVENTS');
    for(const row of payload[k]){
      count++;
      if(!row||typeof row!=='object'||Array.isArray(row)||
        typeof row.symbol!=='string'||!/^[A-Z0-9.\-]{1,12}$/.test(row.symbol)||
        typeof row.name!=='string'||!row.name.trim())invalid++;
    }
  }
  return {count,invalid};
}

function decode(text,day){
  if(typeof text!=='string'||Buffer.byteLength(text,'utf8')>MAX_BYTES||text.length<20)
    fail('NOV30_RESPONSE_SIZE_INVALID');
  let body;try{body=JSON.parse(text)}catch{fail('NOV30_RESPONSE_JSON_INVALID')}
  const counts=inspectDay(body,day);
  return {body,counts};
}

function keyFromConfig(pcHome,env){
  const direct=env.EARNINGS_API_KEY||env.EARNINGSAPI_API_KEY;
  if(typeof direct==='string'&&direct.trim())return direct.trim();
  const file=path.join(pcHome,'providers.env');
  if(!fs.existsSync(file))return null;
  const parsed=parseEnv(fs.readFileSync(file,'utf8'));
  return parsed.EARNINGS_API_KEY||parsed.EARNINGSAPI_API_KEY||null;
}

// Existing Core day records are always read-only; the new snapshots are in an
// independent private folder, never in the shared operational SQLite.
function coreLookup(pcHome){
  const file=path.join(pcHome,'storage','core.sqlite');
  if(!fs.existsSync(file))return ()=>null;
  const db=new DatabaseSync(file,{readOnly:true});
  const statement=db.prepare("SELECT body,stored_at FROM public_feed_snapshots_v1 WHERE kind='input' AND feed_key=? AND snapshot_key='current'");
  return Object.assign(day=>{
    const row=statement.get(`release-calendar:earnings-api:${day}`);
    if(!row)return null;
    let value;try{value=JSON.parse(row.body)}catch{return null}
    if(value?.requestedDate!==day||typeof value?.text!=='string')return null;
    try{
      const checked=decode(value.text,day);
      return {storedAt:new Date(row.stored_at).toISOString(),counts:checked.counts};
    }catch{return null}
  },{close:()=>db.close()});
}

function savedLookup(dir,day){
  const file=path.join(dir,day+'.json');
  if(!fs.existsSync(file))return null;
  const stat=fs.lstatSync(file);
  if(!stat.isFile()||stat.isSymbolicLink()||stat.size>MAX_BYTES+1024)
    fail('NOV30_SAVED_FILE_UNSAFE');
  let saved;
  try{saved=JSON.parse(fs.readFileSync(file,'utf8'))}catch{fail('NOV30_SAVED_JSON_INVALID')}
  if(saved?.body?.date!==day||!Number.isFinite(Date.parse(saved.storedAt)))
    fail('NOV30_SAVED_DAY_INVALID');
  return {storedAt:saved.storedAt,counts:inspectDay(saved.body,day)};
}

export async function runNov30Capture({pcHome=PC_HOME,fetcher=fetch,env=process.env,
  lookupCore=coreLookup,clock=()=>Date.now(),maxRequests=MAX_PROVIDER_REQUESTS}={}){
  const report={schema:'ZGMINI_NOV30_PRIVATE_CAPTURE_V1',status:'BLOCKED',code:null,
    range:[FIRST_DAY,LAST_DAY],targetDayCount:30,coveredDayCount:0,
    coreReusedDayCount:0,privateReusedDayCount:0,newDayCount:0,
    providerCalls:0,retries:0,coreWrites:0,d1Writes:0,schedulerWrites:0,
    records:0,invalidVendorRows:0,missingDays:[],sourceStoredAt:null};
  let fd=null,core=null,locked=false;
  const root=path.join(pcHome,'er1-input');
  const dir=path.join(root,'nov30-forward-days');
  const lock=path.join(root,'nov30-forward-capture.lock');
  try{
    if(!Number.isInteger(maxRequests)||maxRequests<0||maxRequests>MAX_PROVIDER_REQUESTS)
      fail('NOV30_REQUEST_BUDGET_INVALID');
    if(typeof pcHome!=='string'||!path.isAbsolute(pcHome)||!fs.existsSync(pcHome))
      fail('NOV30_PC_HOME_MISSING');
    if(clock()<Date.parse('2026-10-30T00:00:00Z')||clock()>Date.parse('2026-12-01T00:00:00Z'))
      fail('NOV30_EXECUTION_DATE_OUT_OF_RANGE');
    fs.mkdirSync(root,{recursive:true});
    fs.mkdirSync(dir,{recursive:true});
    try{fd=fs.openSync(lock,'wx');locked=true}catch{fail('NOV30_CAPTURE_ALREADY_RUNNING')}
    core=lookupCore(pcHome);
    const days=targetDays();
    // Resolve existing snapshots first, avoiding all redundant provider calls.
    const missing=[];
    for(const day of days){
      const privateRow=savedLookup(dir,day);
      const coreRow=privateRow?null:core(day);
      const source=privateRow??coreRow;
      if(source){
        if(privateRow)report.privateReusedDayCount++;
        else report.coreReusedDayCount++;
        report.records+=source.counts.count;
        report.invalidVendorRows+=source.counts.invalid;
        if(!report.sourceStoredAt||source.storedAt>report.sourceStoredAt)
          report.sourceStoredAt=source.storedAt;
      }else missing.push(day);
    }
    const key=missing.length?keyFromConfig(pcHome,env):null;
    if(missing.length&&(!key||typeof key!=='string'||key.length<8||/\s/.test(key)))
      fail('NOV30_PROVIDER_KEY_UNAVAILABLE');
    for(const day of missing){
      if(report.providerCalls>=maxRequests)break;
      const url=new URL(ENDPOINT);
      url.searchParams.set('date',day);url.searchParams.set('apikey',key);
      report.providerCalls++;
      let response;
      try{response=await fetcher(url.href,{redirect:'error',headers:{accept:'application/json'},signal:AbortSignal.timeout(15000)})}
      catch{fail('NOV30_PROVIDER_NETWORK_STOP')}
      if(response?.status===429)fail('NOV30_PROVIDER_RATE_LIMIT_STOP');
      if(!response?.ok)fail('NOV30_PROVIDER_HTTP_STOP');
      let raw;try{raw=await response.text()}catch{fail('NOV30_PROVIDER_BODY_STOP')}
      const checked=decode(raw,day),storedAt=new Date(clock()).toISOString();
      // Immutable private write; no overwrite of vendor response or Core data.
      fs.writeFileSync(path.join(dir,day+'.json'),JSON.stringify({storedAt,body:checked.body})+'\n',
        {encoding:'utf8',flag:'wx'});
      const persisted=savedLookup(dir,day);
      if(!persisted)fail('NOV30_LOCAL_READBACK_STOP');
      report.newDayCount++;
      report.records+=persisted.counts.count;
      report.invalidVendorRows+=persisted.counts.invalid;
      if(!report.sourceStoredAt||storedAt>report.sourceStoredAt)
        report.sourceStoredAt=storedAt;
    }
    report.missingDays=days.filter(day=>!savedLookup(dir,day)&&!core(day));
    report.coveredDayCount=days.length-report.missingDays.length;
    report.status=report.coveredDayCount===days.length?'PASS':'PARTIAL';
    report.code=report.status==='PASS'?'NOV30_PRIVATE_SAVED_AND_VERIFIED':'NOV30_REQUEST_BUDGET_REACHED';
  }catch(e){report.code=errorCode(e);report.status=report.providerCalls||report.newDayCount?'PARTIAL':'BLOCKED';
    try{report.missingDays=targetDays().filter(day=>!savedLookup(dir,day)&&!core?.(day));
      report.coveredDayCount=30-report.missingDays.length;}catch{}
  }finally{
    try{core?.close?.()}catch{}
    if(fd!==null)try{fs.closeSync(fd)}catch{}
    if(locked)try{fs.unlinkSync(lock)}catch{report.status='STATE_UNKNOWN';report.code='NOV30_LOCK_RELEASE_STOP'}
  }
  return report;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const output=process.argv[2];
  if(!output||!path.isAbsolute(output)){
    process.stderr.write('NOV30_RESULT_PATH_REQUIRED\n');process.exitCode=2;
  }else{
    const report=await runNov30Capture();
    try{fs.writeFileSync(output,JSON.stringify(report)+'\n',{flag:'wx'})}
    catch{process.stderr.write('NOV30_RESULT_WRITE_STOP\n');process.exitCode=2}
    process.stdout.write(`STATUS=${report.status} CODE=${report.code} COVERED=${report.coveredDayCount}/30 REQUESTS=${report.providerCalls}\n`);
    if(report.status!=='PASS')process.exitCode=1;
  }
}
