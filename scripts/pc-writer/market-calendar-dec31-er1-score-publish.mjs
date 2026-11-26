// Approved B one-shot: score the already saved 38 December companies with the
// unchanged ER1 actual-only calculation, then publish one derived D1 key.
// No EarningsAPI calls, no raw EPS/revenue external transfer, no shared Core writes.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {scoreER1Issuers} from '../../lib/market-calendar-er1-earnings-score.mjs';
import {makeER1PublicDisplay,validateER1PublicDisplay} from '../../lib/market-calendar-er1-public-display.mjs';
import {DEC2026_ER1_PUBLIC_KEY} from '../../lib/market-calendar-dec2026-display.mjs';
import {DecemberEventsFromSaved,resolveApprovedProjectSource} from './market-calendar-dec31-publish.mjs';

const PC_HOME=String.raw`E:\ZGmini\data\pc-writer`;
const PROBE=['BOX','COST','ORCL'];
const BATCH=['ADBE','AVGO','LULU','RH','CIEN','LEN','GIS','MU','FDS','CTAS',
 'DRI','FCEL','ACN','KMX','FDX','NKE','PAYX','LW','CAG','CCL',
 'ULTA','KR','DG','DLTR','DOCU','CRWD','ASAN','OKTA','PATH','GTLB',
 'MDB','CHWY','GME','COO','TTD','ESTC','NTAP','HPE'];
const digest=x=>createHash('sha256').update(x).digest('hex');
const stop=code=>{throw Error(code)};
const errorCode=e=>/^DEC31_ER1_[A-Z0-9_]+$/.test(e?.message??'')?e.message:'DEC31_ER1_UNEXPECTED_STOP';
function readSaved(pcHome,folder,symbol){
 const file=path.join(pcHome,'er1-input',folder,symbol+'.json');
 const stat=fs.lstatSync(file);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.size<2||stat.size>2500000)
  stop('DEC31_ER1_SAVED_FILE_INVALID');
 const value=JSON.parse(fs.readFileSync(file,'utf8'));
 if(!Array.isArray(value.body)||value.body.length<1||value.body.length>1000)
  stop('DEC31_ER1_SAVED_BODY_INVALID');
 return value;
}

export function scoreDecemberSaved(read,{asOf}={}){
 const saved=new Map();
 const december=DecemberEventsFromSaved((folder,symbol)=>{
  const value=read(folder,symbol);
  if(saved.has(symbol))stop('DEC31_ER1_DUPLICATE_SOURCE_SYMBOL');
  saved.set(symbol,value);
  return value;
 });
 if(saved.size!==PROBE.length+BATCH.length||december.events.length!==38)
  stop('DEC31_ER1_INPUT_COVERAGE_STOP');
 const symbols=[...new Set(december.events.map(row=>row.ticker))].sort();
 if(symbols.length!==38)stop('DEC31_ER1_EVENT_DUPLICATE_SYMBOL_STOP');
 const rows=symbols.map(symbol=>{
  const records=saved.get(symbol)?.body;
  if(!Array.isArray(records))stop('DEC31_ER1_SYMBOL_SOURCE_MISSING');
  const releases=records.map(row=>{
   if(row?.symbol!==symbol||typeof row.date!=='string'||
    !Object.hasOwn(row,'eps')||!Object.hasOwn(row,'revenue')||
    !(row.eps===null||typeof row.eps==='number'&&Number.isFinite(row.eps))||
    !(row.revenue===null||typeof row.revenue==='number'&&Number.isFinite(row.revenue)&&row.revenue>=0))
    stop('DEC31_ER1_ACTUAL_SOURCE_FIELD_INVALID');
   // Estimates are deliberately not copied into calculator inputs.
   return {symbol,date:row.date,eps:row.eps,revenue:row.revenue};
  });
  return {issuerId:symbol,tickers:[symbol],earningsSymbol:symbol,releases};
 });
 const result=scoreER1Issuers(rows,{asOf});
 if(result.status!=='READY_SHADOW'||result.coverage.inputSymbols!==38||
  result.coverage.observedIssuers!==38)stop('DEC31_ER1_UNSCOREABLE_BATCH_STOP');
 const publicDisplay=makeER1PublicDisplay(result);
 if(!validateER1PublicDisplay(publicDisplay)||
  publicDisplay.recordCount!==result.coverage.scoreableIssuers)
  stop('DEC31_ER1_PUBLIC_CONTRACT_STOP');
 return {publicDisplay,sourceStoredAt:december.latestStoredAt,
  observed:38,scoreable:publicDisplay.recordCount,star3Count:publicDisplay.star3Count,
  unscoreable:result.coverage.unscoreableReasons};
}

export async function syncDecemberER1D1({remote,core,body,storedAt}){
 const lookup="SELECT body,stored_at FROM public_feed_snapshots_v1 WHERE kind='output' AND feed_key=? AND snapshot_key='current'";
 const old=(await remote.query(core,lookup,[DEC2026_ER1_PUBLIC_KEY])).results?.[0];
 if(old?.body===body)return {code:'DEC31_ER1_D1_ALREADY_MATCHED',wrote:false};
 if(old&&old.stored_at>=storedAt)stop('DEC31_ER1_REMOTE_NEWER_STOP');
 await remote.request(core,[{sql:
  "INSERT INTO public_feed_snapshots_v1(kind,feed_key,snapshot_key,body,stored_at) VALUES('output',?,'current',?,?) ON CONFLICT(kind,feed_key,snapshot_key) DO UPDATE SET body=excluded.body,stored_at=excluded.stored_at WHERE excluded.stored_at>public_feed_snapshots_v1.stored_at",
  params:[DEC2026_ER1_PUBLIC_KEY,body,storedAt]}]);
 const check=(await remote.query(core,lookup,[DEC2026_ER1_PUBLIC_KEY])).results?.[0];
 if(check?.body!==body||check?.stored_at!==storedAt)stop('DEC31_ER1_D1_READBACK_STOP');
 return {code:'DEC31_ER1_D1_VERIFIED',wrote:true};
}

const head=root=>execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8',
 windowsHide:true,timeout:15000,stdio:['ignore','pipe','ignore']}).trim();
export async function runDecemberER1({pcHome=PC_HOME,clock=()=>Date.now(),remoteFactory,
 resolveRoot=resolveApprovedProjectSource}={}){
 const report={schema:'ZGMINI_DEC31_ER1_DERIVED_V1',status:'BLOCKED',
  code:'DEC31_ER1_NOT_STARTED',providerCalls:0,rawRowsPublic:0,
  formulaChanges:0,existingFeedWrites:0,schedulerChanges:0,d1Writes:0};
 let fd=null,lock;
 try{
  if(process.platform!=='win32'||!fs.existsSync(pcHome))stop('DEC31_ER1_PC_HOME_MISSING');
  const now=clock(),asOf=new Date(now).toISOString().slice(0,10);
  const scored=scoreDecemberSaved((folder,symbol)=>readSaved(pcHome,folder,symbol),{asOf});
  report.inputSymbols=scored.observed;report.scoreableIssuers=scored.scoreable;
  report.star3Count=scored.star3Count;report.unscoreableReasons=scored.unscoreable;
  report.sourceStoredAt=scored.sourceStoredAt;report.asOf=asOf;
  const body=JSON.stringify(scored.publicDisplay);
  if(Buffer.byteLength(body,'utf8')>100000)stop('DEC31_ER1_DERIVED_SIZE_STOP');
  const folder=path.join(pcHome,'er1-input','dec31-er1-derived');
  fs.mkdirSync(folder,{recursive:true});
  const file=path.join(folder,'current.json');
  if(fs.existsSync(file)){
   if(fs.readFileSync(file,'utf8')!==body)stop('DEC31_ER1_STAGED_DIFFERENT_STOP');
  }else fs.writeFileSync(file,body,{flag:'wx'});
  if(fs.readFileSync(file,'utf8')!==body)stop('DEC31_ER1_LOCAL_READBACK_STOP');
  report.localScoreSha256=digest(body);
  const config=JSON.parse(fs.readFileSync(path.join(pcHome,'config.json'),'utf8'));
  const root=resolveRoot({expectedSha:config.source,getHead:head});
  if(config.collectionTarget!=='pc'||config.enabled!==true||!config.core||
   head(root)!==config.source)stop('DEC31_ER1_OPERATION_SOURCE_STOP');
  // Independent derived-output lock: never touch the Core lock or old ER1 D1 key.
  lock=path.join(pcHome,'dec31-er1-derived.lock');
  try{fd=fs.openSync(lock,'wx')}catch(e){
   if(e.code==='EEXIST')stop('DEC31_ER1_INDEPENDENT_LOCK_BUSY_STOP');
   throw e;
  }
  fs.writeFileSync(fd,JSON.stringify({pid:process.pid,purpose:'dec31-derived-er1-only'}));
  if(head(root)!==config.source)stop('DEC31_ER1_SOURCE_AFTER_LOCK_STOP');
  const factory=remoteFactory??(async()=>{
   const {client,credential}=await import(pathToFileURL(path.join(root,'scripts/pc-writer/d1.mjs')).href);
   return client(config,credential(root));
  });
  const remote=await factory();
  const result=await syncDecemberER1D1({remote,core:config.core,body,storedAt:now});
  report.status='PASS';report.code=result.code;report.d1Writes=Number(result.wrote);
  report.d1ReadbackSha256=digest(body);
 }catch(e){report.code=errorCode(e)}
 finally{if(fd!==null){try{fs.closeSync(fd);fs.unlinkSync(lock)}catch{
  report.status='STATE_UNKNOWN';report.code='DEC31_ER1_LOCK_RELEASE_STOP';}}}
 return report;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const file=process.argv[2];
 if(!file||!path.isAbsolute(file)){
  process.stderr.write('DEC31_ER1_RESULT_PATH_REQUIRED\n');process.exitCode=2;
 }else{
  const report=await runDecemberER1();
  try{fs.writeFileSync(file,JSON.stringify(report)+'\n',{flag:'wx'});}catch{
   process.stderr.write('DEC31_ER1_RESULT_SAVE_STOP\n');process.exitCode=2;
  }
  console.log('DEC31_ER1='+report.status+' CODE='+report.code+
   ' SCOREABLE='+(report.scoreableIssuers??0)+' STAR3='+(report.star3Count??0));
  if(report.status!=='PASS')process.exitCode=1;
 }
}
