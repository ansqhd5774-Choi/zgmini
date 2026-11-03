// One shot: convert previously saved December vendor rows into HTML-only output.
// No provider requests, no calculation changes, no raw vendor upload.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {earningsDisplaySnapshot} from '../../lib/earnings-api-display.mjs';
import {DEC2026_EARNINGS_HTML_KEY,validDec2026Display} from '../../lib/market-calendar-dec2026-display.mjs';
import {coreRootFromTask} from './market-calendar-r34-earnings-sync.mjs';

const PC_HOME=String.raw`E:\ZGmini\data\pc-writer`;
const START='2026-12-01', END='2026-12-31';
const SOURCE_PROBE=['BOX','COST','ORCL'];
const SOURCE_BATCH=['ADBE','AVGO','LULU','RH','CIEN','LEN','GIS','MU','FDS','CTAS',
 'DRI','FCEL','ACN','KMX','FDX','NKE','PAYX','LW','CAG','CCL',
 'ULTA','KR','DG','DLTR','DOCU','CRWD','ASAN','OKTA','PATH','GTLB',
 'MDB','CHWY','GME','COO','TTD','ESTC','NTAP','HPE'];
const EXPECTED_EVENTS={
 '2026-12-01':['BOX','CRWD','ASAN','OKTA','GTLB','NTAP'],
 '2026-12-02':['DLTR','PATH'],
 '2026-12-03':['ULTA','KR','DG','DOCU','COO','HPE'],
 '2026-12-07':['MDB'],
 '2026-12-08':['GME'],
 '2026-12-09':['ADBE','AVGO','CHWY'],
 '2026-12-10':['COST','LULU','RH','CIEN'],
 '2026-12-14':['ORCL'],
 '2026-12-15':['LEN'],
 '2026-12-17':['FDS','CTAS','DRI','FCEL','ACN','KMX','NKE'],
 '2026-12-18':['PAYX','LW','CAG','CCL'],
 '2026-12-23':['GIS','MU']
};
const DAYS=Array.from({length:31},(_,i)=>`2026-12-${String(i+1).padStart(2,'0')}`);
const digest=value=>createHash('sha256').update(value).digest('hex');
const errorCode=e=>/^DEC31_PUBLISH_[A-Z0-9_]+$/.test(e?.message??'')?e.message:'DEC31_PUBLISH_UNEXPECTED_STOP';
const stop=code=>{throw Error(code)};

const safeFile=(root,folder,symbol)=>{
 const filename=path.join(root,'er1-input',folder,symbol+'.json');
 const stat=fs.lstatSync(filename);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.size<2||stat.size>2_500_000)
  stop('DEC31_PUBLISH_RAW_FILE_INVALID');
 return JSON.parse(fs.readFileSync(filename,'utf8'));
};

export function DecemberEventsFromSaved(read){
 const events=new Map();let latest=0;
 const sources=[...SOURCE_PROBE.map(symbol=>['dec31-symbol-probe',symbol]),
  ...SOURCE_BATCH.map(symbol=>['dec31-symbol-batch-a',symbol])];
 for(const [folder,symbol] of sources){
  const {storedAt,body}=read(folder,symbol);
  const at=Date.parse(storedAt);
  if(!Number.isFinite(at)||at<Date.parse('2026-11-01')||at>Date.now()+300000||
   !Array.isArray(body)||body.length>1000)stop('DEC31_PUBLISH_RAW_SHAPE_INVALID');
  latest=Math.max(latest,at);
  const names=body.filter(row=>row?.symbol===symbol&&typeof row.name==='string'&&
   row.name.trim()&&row.name.length<=200).map(row=>row.name.trim());
  const fallbackName=names[0]??symbol;
  for(const row of body){
   if(!row||row.symbol!==symbol||typeof row.date!=='string'||
     !/^20\d\d-\d\d-\d\d$/.test(row.date)||
     !Number.isFinite(Date.parse(row.date+'T00:00:00Z')))
    stop('DEC31_PUBLISH_RAW_ROW_INVALID');
   if(row.date<START||row.date>END)continue;
   const key=row.date+'|'+symbol;
   if(events.has(key))stop('DEC31_PUBLISH_DUPLICATE_EVENT_STOP');
   events.set(key,{date:row.date,ticker:symbol,
    company:typeof row.name==='string'&&row.name.trim()&&row.name.length<=200?
      row.name.trim():fallbackName,
    marketSession:row.time==='time-pre-market'?'before_market':
      row.time==='time-after-hours'?'after_market':'unknown',
    time:null,verification:'VENDOR_UNVERIFIED',source:'earnings-api'});
  }
 }
 const expected=Object.entries(EXPECTED_EVENTS).flatMap(([day,symbols])=>symbols.map(s=>day+'|'+s)).sort();
 if(events.size!==38||JSON.stringify([...events.keys()].sort())!==JSON.stringify(expected))
  stop('DEC31_PUBLISH_STAGED_DATE_MISMATCH_STOP');
 return {events:[...events.values()].sort((a,b)=>a.date.localeCompare(b.date)||
  a.ticker.localeCompare(b.ticker)),latestStoredAt:new Date(latest).toISOString()};
}

export function buildDecemberDisplay(events,checkedAt){
 const byDay={};
 // Reuse the already validated 14-day renderer, padding only the last
 // temporary chunk with empty January days. Public output remains 31 days.
 for(let start=0;start<31;start+=14){
  const coveredDays=Array.from({length:14},(_,i)=>{
   const day=new Date(Date.UTC(2026,11,start+i+1));
   return day.toISOString().slice(0,10);
  });
  const subset=events.filter(event=>coveredDays.includes(event.date));
  const rendered=earningsDisplaySnapshot({status:'READY_PRIVATE',scope:'PC_PRIVATE',
   publicDisplay:false,redistribution:false,publicationStatus:'HELD_UNCONFIRMED',
   checkedAt,coveredDays,recordCount:subset.length,priorityCount:0,events:subset});
  for(const day of coveredDays)if(DAYS.includes(day))byDay[day]=rendered.byDay[day];
 }
 const display={status:'READY_DISPLAY',mode:'OWN_SITE_HTML_ONLY',
  rawVendorJsonExposed:false,publicJsonFeed:false,redistribution:false,
  checkedAt,coveredDays:DAYS,recordCount:events.length,priorityCount:0,byDay};
 if(!validDec2026Display(display))stop('DEC31_PUBLISH_HTML_CONTRACT_STOP');
 return display;
}

export async function syncDecemberD1({remote,core,body,storedAt}){
 const sql="SELECT body,stored_at FROM public_feed_snapshots_v1 WHERE kind='output' AND feed_key=? AND snapshot_key='current'";
 const current=(await remote.query(core,sql,[DEC2026_EARNINGS_HTML_KEY])).results?.[0];
 if(current?.body===body)return {decision:'DEC31_PUBLISH_D1_ALREADY_MATCHED',dbWrite:false};
 if(current&&current.stored_at>=storedAt)stop('DEC31_PUBLISH_D1_NEWER_PRESERVED_STOP');
 await remote.request(core,[{sql:
  "INSERT INTO public_feed_snapshots_v1(kind,feed_key,snapshot_key,body,stored_at) VALUES('output',?,'current',?,?) ON CONFLICT(kind,feed_key,snapshot_key) DO UPDATE SET body=excluded.body,stored_at=excluded.stored_at WHERE excluded.stored_at>public_feed_snapshots_v1.stored_at",
  params:[DEC2026_EARNINGS_HTML_KEY,body,storedAt]}]);
 const verified=(await remote.query(core,sql,[DEC2026_EARNINGS_HTML_KEY])).results?.[0];
 if(verified?.body!==body||verified?.stored_at!==storedAt)stop('DEC31_PUBLISH_D1_READBACK_STOP');
 return {decision:'DEC31_PUBLISH_D1_VERIFIED',dbWrite:true};
}

function coreTaskXml(){
 const bytes=execFileSync('schtasks.exe',['/Query','/TN','ZGMINI-PC-Local-Core','/XML'],
  {windowsHide:true,timeout:15000,stdio:['ignore','pipe','ignore']});
 return (bytes[0]===255&&bytes[1]===254||bytes.includes(0)?bytes.toString('utf16le'):
  bytes.toString('utf8')).replace(/^\ufeff/,'');
}
const head=root=>execFileSync('git',['rev-parse','HEAD'],{
 cwd:root,encoding:'utf8',windowsHide:true,timeout:15000,
 stdio:['ignore','pipe','ignore']}).trim();
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));

export async function runPublish({pcHome=PC_HOME,getRoot=()=>coreRootFromTask(coreTaskXml()),
 getHead=head,remoteFactory,clock=()=>Date.now(),sleep=pause}={}){
 const report={schema:'ZGMINI_DEC31_HTML_PUBLISH_V1',status:'BLOCKED',
  code:'DEC31_PUBLISH_NOT_STARTED',providerCalls:0,rawRowsPublic:0,
  scheduleChanges:0,existingFeedWrites:0,scoreFormulaChanges:0,d1Writes:0};
 let fd=null,lock=null;
 try{
  if(process.platform!=='win32'||!fs.existsSync(pcHome))
   stop('DEC31_PUBLISH_PC_HOME_INVALID');
  const data=DecemberEventsFromSaved((folder,symbol)=>safeFile(pcHome,folder,symbol));
  const now=clock();
  const output=path.join(pcHome,'er1-input','dec31-html-publish');
  fs.mkdirSync(output,{recursive:true});
  const local=path.join(output,'current.json');
  const body=fs.existsSync(local)?fs.readFileSync(local,'utf8'):
   JSON.stringify(buildDecemberDisplay(data.events,new Date(now).toISOString()));
  const snapshot=JSON.parse(body);
  if(!validDec2026Display(snapshot)||snapshot.recordCount!==data.events.length||
   Buffer.byteLength(body,'utf8')>150000)stop('DEC31_PUBLISH_HTML_SIZE_OR_SHAPE_STOP');
  report.eventCount=snapshot.recordCount;report.lastRawStoredAt=data.latestStoredAt;
  if(!fs.existsSync(local))fs.writeFileSync(local,body,{flag:'wx'});
  if(fs.readFileSync(local,'utf8')!==body)stop('DEC31_PUBLISH_LOCAL_READBACK_STOP');
  report.localHtmlSha256=digest(body);
  const root=getRoot();
  if(!root||!fs.existsSync(root))stop('DEC31_PUBLISH_CORE_ROOT_MISSING');
  const config=JSON.parse(fs.readFileSync(path.join(pcHome,'config.json'),'utf8'));
  if(config.source!==getHead(root)||config.collectionTarget!=='pc'||
   config.enabled!==true||!config.core)stop('DEC31_PUBLISH_CORE_SOURCE_CONFIG_STOP');
  lock=path.join(pcHome,'local-cycle.lock');
  const started=clock();
  while(true){
   try{fd=fs.openSync(lock,'wx');break;}catch(e){
    if(e.code!=='EEXIST')throw e;
    if(clock()-started>9*60000)stop('DEC31_PUBLISH_CORE_LOCK_TIMEOUT_STOP');
    await sleep(10000);
   }
  }
  fs.writeFileSync(fd,JSON.stringify({pid:process.pid,purpose:'dec31-html-only-d1-output'}));
  if(config.source!==getHead(root))stop('DEC31_PUBLISH_SOURCE_AFTER_LOCK_STOP');
  const factory=remoteFactory??(async()=>{
   const {client,credential}=await import(pathToFileURL(path.join(root,'scripts/pc-writer/d1.mjs')).href);
   return client(config,credential(root));
  });
  const remote=await factory();
  const verified=await syncDecemberD1({remote,core:config.core,body,storedAt:now});
  report.status='PASS';report.code=verified.decision;
  report.d1Writes=Number(verified.dbWrite);
  report.d1ReadbackSha256=digest(body);
 }catch(e){report.code=errorCode(e)}
 finally{
  if(fd!==null){try{fs.closeSync(fd);fs.unlinkSync(lock)}catch{
   report.status='STATE_UNKNOWN';report.code='DEC31_PUBLISH_LOCK_RELEASE_STOP';}}
 }
 return report;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const filename=process.argv[2];
 if(!filename||!path.isAbsolute(filename)){process.stderr.write('DEC31_PUBLISH_RESULT_REQUIRED\n');process.exitCode=2;}
 else{
  const report=await runPublish();
  try{fs.writeFileSync(filename,JSON.stringify(report)+'\n',{flag:'wx'});}catch{
   process.stderr.write('DEC31_PUBLISH_RESULT_SAVE_STOP\n');process.exitCode=2;}
  console.log('DEC31_PUBLISH='+report.code);
  if(report.status!=='PASS')process.exitCode=1;
 }
}
