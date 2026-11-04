// B pilot: at most three real November-calendar symbols.
// PC-only EarningsAPI actual history -> unchanged ER1 scorer -> local preview.
// D1 helper is tested separately, but the fixed production entry does NOT call it.
// Never writes Core, raw D1, schedule, existing feed or deployment.
import fs from 'node:fs';
import path from 'node:path';
import {parseEnv} from 'node:util';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';

export const NOV2026_ER1_PUBLIC_KEY='market-calendar:earnings-nov2026-er1-score-public';
const PC_HOME='E:\\ZGmini\\data\\pc-writer';
const ENDPOINT='https://api.earningsapi.com/v1/earnings';
const MAX_SYMBOLS=3;
const BATCH20_SYMBOLS=20;
const BATCH20_MAX_GET=17;
const FULL_MAX_GET=17;
const MAX_VENDOR_BYTES=2_000_000;
const MAX_LOCAL_BYTES=2_500_000;
// D1 row max is 2 MB; permit a full-month derived payload above pilot 100 KB.
const MAX_FULL_DERIVED_BYTES=1_000_000;
const SYMBOL=/^[A-Z0-9][A-Z0-9.\-]{0,11}$/;
const DATE=/^20\d\d-\d\d-\d\d$/;
const VALID_FOLDERS=['nov30-er1-batch20','nov30-er1-probe',
 'nov30-er1-full','dec31-symbol-probe','dec31-symbol-batch-a'];
const sha256=body=>createHash('sha256').update(body).digest('hex');
const stop=code=>{throw Error(code)};
const codeOf=e=>/^NOV30_ER1_[A-Z0-9_]+$/.test(String(e?.message))?
  e.message:'NOV30_ER1_UNEXPECTED_STOP';

// A growing November cohort legitimately changes its relative ER1 scores.
// Preserve each verified version, then atomically replace only the current
// pointer. An already recorded digest must never change its contents.
export function saveNovemberER1Derived(outDir,body,maxBytes=100000){
 if(![100000,MAX_FULL_DERIVED_BYTES].includes(maxBytes)||
  typeof body!=='string'||Buffer.byteLength(body,'utf8')>maxBytes)
  stop('NOV30_ER1_LOCAL_DERIVED_BODY_INVALID');
 try{JSON.parse(body)}catch{stop('NOV30_ER1_LOCAL_DERIVED_BODY_INVALID')}
 fs.mkdirSync(outDir,{recursive:true});
 const current=path.join(outDir,'current.json');
 let old=null;
 if(fs.existsSync(current)){
  if(!safeFile(current,maxBytes))stop('NOV30_ER1_LOCAL_DERIVED_CURRENT_INVALID');
  old=fs.readFileSync(current,'utf8');
  try{JSON.parse(old)}catch{stop('NOV30_ER1_LOCAL_DERIVED_CURRENT_INVALID')}
 }
 const versions=path.join(outDir,'versions');
 fs.mkdirSync(versions,{recursive:true});
 const snapshot=raw=>{
  const file=path.join(versions,sha256(raw)+'.json');
  if(fs.existsSync(file)){
   if(!safeFile(file,maxBytes)||fs.readFileSync(file,'utf8')!==raw)
    stop('NOV30_ER1_LOCAL_DERIVED_VERSION_DRIFT_STOP');
   return;
  }
  fs.writeFileSync(file,raw,{flag:'wx'});
  if(fs.readFileSync(file,'utf8')!==raw)
   stop('NOV30_ER1_LOCAL_DERIVED_VERSION_READBACK_STOP');
 };
 if(old!==null)snapshot(old);
 snapshot(body);
 if(old!==body){
  const temp=current+'.part-'+process.pid+'-'+Date.now();
  try{
   fs.writeFileSync(temp,body,{flag:'wx'});
   if(fs.readFileSync(temp,'utf8')!==body)
    stop('NOV30_ER1_LOCAL_DERIVED_STAGE_READBACK_STOP');
   fs.renameSync(temp,current);
  }finally{if(fs.existsSync(temp))fs.unlinkSync(temp)}
 }
 if(!safeFile(current,maxBytes)||fs.readFileSync(current,'utf8')!==body)
  stop('NOV30_ER1_LOCAL_DERIVED_READBACK_STOP');
 return sha256(body);
}

function validDay(day){
 return typeof day==='string'&&DATE.test(day)&&
  !Number.isNaN(Date.parse(day+'T00:00:00Z'))&&
  new Date(day+'T00:00:00Z').toISOString().slice(0,10)===day;
}
function safeFile(file,limit){
 try{const stat=fs.lstatSync(file);return stat.isFile()&&!stat.isSymbolicLink()&&
  stat.size>1&&stat.size<=limit}catch{return false}
}
function providerKey(pcHome,env){
 const direct=env.EARNINGS_API_KEY||env.EARNINGSAPI_API_KEY;
 if(typeof direct==='string'&&direct.trim())return direct.trim();
 const file=path.join(pcHome,'providers.env');
 if(!safeFile(file,65536))return null;
 const values=parseEnv(fs.readFileSync(file,'utf8'));
 return values.EARNINGS_API_KEY||values.EARNINGSAPI_API_KEY||null;
}

// Source events MUST come from the existing saved PC November calendar.
// No manually invented ticker, whole-market roster or provider lookup.
export function selectFutureNovemberSymbols(events,asOf,limit=MAX_SYMBOLS){
 if(!Array.isArray(events)||!validDay(asOf)||events.length>5000||
  ![MAX_SYMBOLS,BATCH20_SYMBOLS,null].includes(limit))
  stop('NOV30_ER1_CALENDAR_INPUT_INVALID');
 const found=new Map();
 for(const row of events){
  if(!row||!validDay(row.date)||typeof row.ticker!=='string'||
   !SYMBOL.test(row.ticker))stop('NOV30_ER1_CALENDAR_ROW_INVALID');
  if(row.date>asOf&&row.date>='2026-11-01'&&row.date<='2026-11-30'){
   const old=found.get(row.ticker);
   if(!old||row.date<old)found.set(row.ticker,row.date);
  }
 }
 const sorted=[...found].sort((a,b)=>a[1].localeCompare(b[1])||
  a[0].localeCompare(b[0]));
 return (limit===null?sorted:sorted.slice(0,limit)).map(([symbol])=>symbol);
}

// The scorer already defines two share-class issuer aliases. Keep one
// earnings source per issuer, while making both valid tickers share its score.
// A deterministic lexical ticker is chosen, never the most favorable EPS.
function savedIssuerRows(found){
 const byIssuer=new Map();
 for(const [symbol,actuals] of found){
  const issuerId=symbol==='GOOG'||symbol==='GOOGL'?'ALPHABET':
   /^BRK[.\-][AB]$/.test(symbol)?'BERKSHIRE':symbol;
  const group=byIssuer.get(issuerId)??[];
  group.push({symbol,actuals});byIssuer.set(issuerId,group);
 }
 return [...byIssuer].map(([issuerId,group])=>{
  group.sort((a,b)=>a.symbol.localeCompare(b.symbol));
  return {issuerId,tickers:group.map(row=>row.symbol),
   earningsSymbol:group[0].symbol,releases:group[0].actuals};
 });
}

function actualRowValid(raw,symbol){
 return raw&&typeof raw==='object'&&!Array.isArray(raw)&&
  raw.symbol===symbol&&validDay(raw.date)&&
  Object.hasOwn(raw,'eps')&&Object.hasOwn(raw,'revenue')&&
  (raw.eps===null||typeof raw.eps==='number'&&Number.isFinite(raw.eps))&&
  (raw.revenue===null||typeof raw.revenue==='number'&&
   Number.isFinite(raw.revenue)&&raw.revenue>=0);
}
export function inspectVendorActual(body,symbol){
 if(!SYMBOL.test(symbol)||!Array.isArray(body)||body.length>1000)
  stop('NOV30_ER1_VENDOR_SHAPE_INVALID');
 const rows=[];let rejectedRows=0;
 for(const raw of body){
  if(!actualRowValid(raw,symbol)){rejectedRows++;continue}
  rows.push({symbol,date:raw.date,eps:raw.eps,revenue:raw.revenue});
 }
 return {rows,rejectedRows};
}
export function validateVendorActual(body,symbol){
 const {rows,rejectedRows}=inspectVendorActual(body,symbol);
 if(rejectedRows)stop('NOV30_ER1_VENDOR_ACTUAL_INVALID');
 return rows;
}
function readStored(file,symbol){
 if(!safeFile(file,MAX_LOCAL_BYTES))stop('NOV30_ER1_STORED_FILE_INVALID');
 let saved;try{saved=JSON.parse(fs.readFileSync(file,'utf8'))}
 catch{stop('NOV30_ER1_STORED_JSON_INVALID')}
 if(!Number.isFinite(Date.parse(saved?.storedAt)))
  stop('NOV30_ER1_STORED_DATE_INVALID');
 const checked=inspectVendorActual(saved.body,symbol);
 if(saved.validation===undefined){
  // Existing archives were written under the strict all-rows contract.
  if(checked.rejectedRows)stop('NOV30_ER1_STORED_ACTUAL_INVALID');
 }else if(!saved.validation||typeof saved.validation!=='object'||
  saved.validation.validRows!==checked.rows.length||
  saved.validation.rejectedRows!==checked.rejectedRows)
  stop('NOV30_ER1_STORED_VALIDATION_INVALID');
 return {storedAt:saved.storedAt,actuals:checked.rows,
  rejectedRows:checked.rejectedRows};
}
export function existingActual(pcHome,symbol){
 for(const folder of VALID_FOLDERS){
  const file=path.join(pcHome,'er1-input',folder,symbol+'.json');
  if(fs.existsSync(file))return readStored(file,symbol);
 }
 return null;
}
async function fetchAndStage(pcHome,symbol,{key,fetcher,clock,stageFolder='nov30-er1-probe'}){
 const folder=path.join(pcHome,'er1-input',stageFolder);
 fs.mkdirSync(folder,{recursive:true});
 const target=path.join(folder,symbol+'.json');
 if(fs.existsSync(target))return readStored(target,symbol);
 const url=new URL(ENDPOINT);url.searchParams.set('symbol',symbol);
 url.searchParams.set('apikey',key);
 let response;try{
  response=await fetcher(url.href,{redirect:'error',headers:{accept:'application/json'},
   signal:AbortSignal.timeout(15000)});
 }catch{stop('NOV30_ER1_PROVIDER_NETWORK_STOP')}
 if(response?.status===429)stop('NOV30_ER1_PROVIDER_QUOTA_STOP');
 if(!response?.ok)stop('NOV30_ER1_PROVIDER_HTTP_STOP');
 let bytes;try{bytes=await response.text()}catch{stop('NOV30_ER1_PROVIDER_BODY_STOP')}
 if(typeof bytes!=='string'||Buffer.byteLength(bytes,'utf8')>MAX_VENDOR_BYTES)
  stop('NOV30_ER1_PROVIDER_SIZE_STOP');
 let body;try{body=JSON.parse(bytes)}catch{stop('NOV30_ER1_PROVIDER_JSON_STOP')}
 const expected=inspectVendorActual(body,symbol);
 const storedAt=new Date(clock()).toISOString();
 // Write a complete sibling then rename inside the same private directory.
 // One independently locked lane owns this exact path; never replace a saved file.
 const temp=target+'.part-'+process.pid+'-'+Date.now();
 try{
  fs.writeFileSync(temp,JSON.stringify({storedAt,body,validation:{
   validRows:expected.rows.length,rejectedRows:expected.rejectedRows}})+'\n',
   {encoding:'utf8',flag:'wx'});
  const staged=readStored(temp,symbol);
  if(JSON.stringify(staged.actuals)!==JSON.stringify(expected.rows)||
   staged.rejectedRows!==expected.rejectedRows||
   staged.storedAt!==storedAt)stop('NOV30_ER1_LOCAL_STAGE_VERIFY_STOP');
  if(fs.existsSync(target))stop('NOV30_ER1_CONCURRENT_STAGE_STOP');
  fs.renameSync(temp,target);
 }finally{if(fs.existsSync(temp))fs.unlinkSync(temp)}
 const actual=readStored(target,symbol);
 if(JSON.stringify(actual.actuals)!==JSON.stringify(expected.rows)||
  actual.rejectedRows!==expected.rejectedRows||
  actual.storedAt!==storedAt)stop('NOV30_ER1_LOCAL_READBACK_STOP');
 return actual;
}

// Dependency-injected to test with fixtures: production source is the existing
// approved 30-day local reconstruction, never an incoming request argument.
export async function loadNovemberEvents(pcHome){
 const {DatabaseSync}=await import('node:sqlite');
 const {novemberEventsFromSaved}=await import('./market-calendar-nov30-publish.mjs');
 const dbPath=path.join(pcHome,'storage','core.sqlite');
 const db=new DatabaseSync(dbPath,{readOnly:true});
 db.exec('PRAGMA query_only=ON; PRAGMA busy_timeout=3000;');
 const stmt=db.prepare("SELECT body,stored_at FROM public_feed_snapshots_v1 WHERE kind='input' AND feed_key=? AND snapshot_key='current'");
 try{
  const saved=novemberEventsFromSaved({
   core:day=>{
    const row=stmt.get('release-calendar:earnings-api:'+day);
    if(!row)return null;
    const wrapper=JSON.parse(row.body);
    if(wrapper?.requestedDate!==day||typeof wrapper.text!=='string'||
     Buffer.byteLength(wrapper.text,'utf8')>MAX_VENDOR_BYTES)
     stop('NOV30_ER1_CORE_CALENDAR_INVALID');
    return {body:JSON.parse(wrapper.text),storedAt:new Date(row.stored_at).toISOString()};
   },
   saved:day=>{
    const f=path.join(pcHome,'er1-input','nov30-forward-days',day+'.json');
    if(!fs.existsSync(f))return null;
    if(!safeFile(f,MAX_LOCAL_BYTES))stop('NOV30_ER1_PRIVATE_CALENDAR_INVALID');
    return JSON.parse(fs.readFileSync(f,'utf8'));
   }
  });
  return saved.events;
 }finally{db.close()}
}
function getHead(root){
 return execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8',
  windowsHide:true,timeout:15000,stdio:['ignore','pipe','ignore']}).trim();
}
async function getRemote(pcHome){
 const config=JSON.parse(fs.readFileSync(path.join(pcHome,'config.json'),'utf8'));
 if(config.collectionTarget!=='pc'||config.enabled!==true||!config.core)
  stop('NOV30_ER1_OPERATION_CONFIG_STOP');
 const {resolveApprovedProjectSource}=await import('./market-calendar-dec31-publish.mjs');
 const root=resolveApprovedProjectSource({expectedSha:config.source,getHead});
 if(getHead(root)!==config.source)stop('NOV30_ER1_OPERATION_SOURCE_STOP');
 const {client,credential}=await import(pathToFileURL(path.join(root,'scripts/pc-writer/d1.mjs')).href);
 return {remote:client(config,credential(root)),core:config.core};
}

export async function syncNovemberER1D1({remote,core,body,storedAt}){
 if(!Number.isSafeInteger(storedAt)||storedAt<=0)
  stop('NOV30_ER1_D1_TIME_INVALID');
 const sql="SELECT body,stored_at FROM public_feed_snapshots_v1 WHERE kind='output' AND feed_key=? AND snapshot_key='current'";
 const old=(await remote.query(core,sql,[NOV2026_ER1_PUBLIC_KEY])).results?.[0];
 if(old?.body===body)return {code:'NOV30_ER1_D1_ALREADY_MATCHED',wrote:false};
 if(old&&old.stored_at>=storedAt)stop('NOV30_ER1_D1_NEWER_PRESERVED');
 await remote.request(core,[{sql:
  "INSERT INTO public_feed_snapshots_v1(kind,feed_key,snapshot_key,body,stored_at) VALUES('output',?,'current',?,?) ON CONFLICT(kind,feed_key,snapshot_key) DO UPDATE SET body=excluded.body,stored_at=excluded.stored_at WHERE excluded.stored_at>public_feed_snapshots_v1.stored_at",
  params:[NOV2026_ER1_PUBLIC_KEY,body,storedAt]}]);
 const after=(await remote.query(core,sql,[NOV2026_ER1_PUBLIC_KEY])).results?.[0];
 if(after?.body!==body||after?.stored_at!==storedAt)
  stop('NOV30_ER1_D1_READBACK_STOP');
 return {code:'NOV30_ER1_D1_VERIFIED',wrote:true};
}

export async function runNovemberProbePublish({
 pcHome=PC_HOME,clock=Date.now,env=process.env,fetcher=fetch,
 calendarLoader=loadNovemberEvents,scorer,publicSerializer,remoteFactory=getRemote,
 requireWindows=true,publish=false,candidateLimit=MAX_SYMBOLS,
 providerRequestLimit=MAX_SYMBOLS,outputTag='nov30-er1-probe'
}={}){
 const batch20=candidateLimit===BATCH20_SYMBOLS&&
  providerRequestLimit===BATCH20_MAX_GET&&outputTag==='nov30-er1-batch20';
 const pilot=candidateLimit===MAX_SYMBOLS&&providerRequestLimit===MAX_SYMBOLS&&
  outputTag==='nov30-er1-probe';
 // Fixed reusable private entry: each run fetches at most 17 missing histories.
 // Subsequent runs reuse the verified files and eventually score the FULL set.
 const full=candidateLimit===null&&providerRequestLimit===FULL_MAX_GET&&
  outputTag==='nov30-er1-full';
 const report={schema:full?'ZGMINI_NOV30_ER1_FULL_PRIVATE_V1':
  batch20?'ZGMINI_NOV30_ER1_BATCH20_V1':
  'ZGMINI_NOV30_ER1_PROBE_PUBLISH_V1',status:'BLOCKED',
  code:'NOV30_ER1_NOT_STARTED',pilotOnly:!publish,candidateLimit,providerRequestLimit,
  selectedSymbols:0,missingActualSymbols:0,rejectedActualRows:0,isolatedSymbols:0,
  providerCalls:0,reusedActualSymbols:0,stagedActualSymbols:0,
  scoreableIssuers:0,star3Count:0,highestScore:null,coreWrites:0,existingFeedWrites:0,
  schedulerWrites:0,rawRowsPublic:0,d1Writes:0};
 let fd=null,lock=null;
 try{
  if((!pilot&&!batch20&&!full)||((batch20||full)&&publish))
   stop('NOV30_ER1_BATCH_CONTRACT_STOP');
  if(requireWindows&&process.platform!=='win32')stop('NOV30_ER1_WINDOWS_ONLY');
  if(!path.isAbsolute(pcHome)||!fs.existsSync(pcHome))
   stop('NOV30_ER1_PC_HOME_INVALID');
  const now=clock(),asOf=new Date(now).toISOString().slice(0,10);
  if(asOf<'2026-11-01'||asOf>'2026-11-30')
   stop('NOV30_ER1_EXECUTION_DATE_STOP');
  const events=await calendarLoader(pcHome),symbols=selectFutureNovemberSymbols(events,asOf,candidateLimit);
  report.selectedSymbols=symbols.length;report.asOf=asOf;
  if(full)report.candidateSetSha256=sha256(JSON.stringify(symbols));
  if(!symbols.length)stop('NOV30_ER1_NO_FUTURE_CALENDAR_SYMBOLS');
  const parent=path.join(pcHome,'er1-input');
  lock=path.join(parent,outputTag+'-publish.lock');
  try{fd=fs.openSync(lock,'wx')}catch{stop('NOV30_ER1_INDEPENDENT_LOCK_BUSY')}
  fs.writeFileSync(fd,JSON.stringify({pid:process.pid,purpose:'nov30-er1-probe-publish'}));
  const found=new Map();let latest=0;
  for(const symbol of symbols){
   let actual=existingActual(pcHome,symbol);
   if(actual)report.reusedActualSymbols++;
   else{
    if(report.providerCalls>=providerRequestLimit)
     stop('NOV30_ER1_PROVIDER_BUDGET_STOP');
    const key=providerKey(pcHome,env);
    if(typeof key!=='string'||key.length<8||/\s/.test(key))
     stop('NOV30_ER1_PROVIDER_KEY_UNAVAILABLE');
    report.providerCalls++;
    try{actual=await fetchAndStage(pcHome,symbol,{
     key,fetcher,clock,stageFolder:outputTag})}
    catch(e){
     // A malformed response belongs to this symbol, not the entire batch.
     // Quota/auth/network and any storage integrity error still stop the lane.
     if(codeOf(e)==='NOV30_ER1_VENDOR_SHAPE_INVALID'){
      report.isolatedSymbols++;continue;
     }
     throw e;
    }
    report.stagedActualSymbols++;
   }
   report.rejectedActualRows+=actual.rejectedRows??0;
  // A successfully observed empty history is a valid missing observation,
  // not a broken provider response. The unchanged scorer records its reason.
  if(!actual.actuals.length&&!full){report.isolatedSymbols++;continue}
   latest=Math.max(latest,Date.parse(actual.storedAt));
   found.set(symbol,actual.actuals);
  }
  const rows=full?savedIssuerRows(found):[...found.keys()].map(symbol=>({
   issuerId:symbol,tickers:[symbol],earningsSymbol:symbol,
   releases:found.get(symbol)}));
  const calc=scorer??(await import('../../lib/market-calendar-er1-earnings-score.mjs')).scoreER1Issuers;
  const serialize=publicSerializer??(await import('../../lib/market-calendar-er1-public-display.mjs')).makeER1PublicDisplay;
  const scored=calc(rows,{asOf});
  if(scored?.status!=='READY_SHADOW'||!scored.coverage?.scoreableIssuers)
   stop('NOV30_ER1_NO_SCOREABLE_ACTUALS');
  const publicResult=serialize(scored),body=JSON.stringify(publicResult);
  if(Buffer.byteLength(body,'utf8')>(full?MAX_FULL_DERIVED_BYTES:100000))
   stop('NOV30_ER1_PUBLIC_SIZE_STOP');
  const derivedDir=path.join(parent,outputTag+'-derived');
  saveNovemberER1Derived(derivedDir,body,full?MAX_FULL_DERIVED_BYTES:100000);
  report.scoreableIssuers=publicResult.recordCount;
  report.star3Count=publicResult.star3Count;
  report.highestScore=scored.rankings?.[0]?.score??null;
  report.sourceStoredAt=new Date(latest).toISOString();
  report.localScoreSha256=sha256(body);
  const incomplete=report.isolatedSymbols>0||report.rejectedActualRows>0;
  if(!publish){
   report.status=incomplete?'PARTIAL':'PASS';
   report.code=incomplete?'NOV30_ER1_PARTIAL_PREVIEW_VERIFIED':
    'NOV30_ER1_PILOT_PREVIEW_VERIFIED';
   if(full&&!incomplete){
    if(report.reusedActualSymbols+report.stagedActualSymbols!==symbols.length||
     publicResult.coverage?.inputSymbols!==symbols.length||
     publicResult.coverage?.observedIssuers!==rows.length)
     stop('NOV30_ER1_FULL_COHORT_INCOMPLETE_STOP');
    const manifest={schema:'ZGMINI_NOV30_ER1_FULL_PRIVATE_V1',
     status:'PASS',pilotOnly:true,asOf,selectedSymbols:symbols.length,
     scoreableIssuers:report.scoreableIssuers,missingActualSymbols:0,
     isolatedSymbols:0,rejectedActualRows:0,
     candidateSetSha256:report.candidateSetSha256,
     localScoreSha256:report.localScoreSha256,
     sourceStoredAt:report.sourceStoredAt,completedAt:new Date(now).toISOString()};
    const manifestFile=path.join(derivedDir,'complete-manifest.json');
    const manifestBody=JSON.stringify(manifest)+'\n';
    const temp=manifestFile+'.part-'+process.pid+'-'+Date.now();
    try{
     fs.writeFileSync(temp,manifestBody,{flag:'wx'});
     if(fs.readFileSync(temp,'utf8')!==manifestBody)
      stop('NOV30_ER1_FULL_MANIFEST_STAGE_STOP');
     fs.renameSync(temp,manifestFile);
    }finally{if(fs.existsSync(temp))fs.unlinkSync(temp)}
    if(!safeFile(manifestFile,65536)||
     fs.readFileSync(manifestFile,'utf8')!==manifestBody)
     stop('NOV30_ER1_FULL_MANIFEST_READBACK_STOP');
    report.completeManifest='nov30-er1-full-derived/complete-manifest.json';
   }
  }else{
   if(incomplete)stop('NOV30_ER1_PARTIAL_PUBLISH_STOP');
   // Only a separately approved exact B publish entry may opt into this
   // helper. The installed fixed pilot entry never provides that option.
   const {remote,core}=await remoteFactory(pcHome);
   const published=await syncNovemberER1D1({remote,core,body,storedAt:now});
   report.d1Writes=Number(published.wrote);
   report.d1ReadbackSha256=sha256(body);
   report.status='PASS';report.code=published.code;
  }
 }catch(e){
  report.code=codeOf(e);
  // Keep already verified private checkpoint visible on quota/provider stops.
  // PARTIAL is not a successful score and never allows public publication.
  if(report.stagedActualSymbols>0||full&&report.reusedActualSymbols>0)
   report.status='PARTIAL';
 }finally{
  if(full)report.missingActualSymbols=Math.max(0,
   report.selectedSymbols-report.reusedActualSymbols-report.stagedActualSymbols);
  if(fd!==null){try{fs.closeSync(fd);fs.unlinkSync(lock)}
   catch{report.status='STATE_UNKNOWN';report.code='NOV30_ER1_LOCK_RELEASE_STOP'}}
 }
 return report;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const output=process.argv[2];
 if(!output||!path.isAbsolute(output)){
  process.stderr.write('NOV30_ER1_RESULT_PATH_REQUIRED\n');process.exitCode=2;
 }else{
  const result=await runNovemberProbePublish();
  try{fs.writeFileSync(output,JSON.stringify(result)+'\n',{flag:'wx'})}
  catch{process.stderr.write('NOV30_ER1_RESULT_SAVE_STOP\n');process.exitCode=2}
  console.log('NOV30_ER1='+result.status+' CODE='+result.code+
   ' INPUT='+(result.selectedSymbols??0)+' SCOREABLE='+(result.scoreableIssuers??0));
  if(result.status!=='PASS')process.exitCode=1;
 }
}

