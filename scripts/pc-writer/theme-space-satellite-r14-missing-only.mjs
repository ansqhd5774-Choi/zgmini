// R14: manual, bounded, append-only recovery of missing space ETF raw prices.
// Exact R13 PC SHA gate. Never refresh UFO/NASA/ROKT, publish, or change a job.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {auditSpaceUniverse} from './theme-space-satellite-r13-local-universe-audit.mjs';

const sha=b=>createHash('sha256').update(b).digest('hex');
const R13_SOURCE_SHA='b4f628d734e61f239c83ebd77c32c3c73e7eaaaf7c09bf260351e730cb861b38';
const R13_SPY_SHA='76dfaca72fd0ded5e648ee15cceca5628288c11463214bd14ede01c2b5c4746e';
const R14_END='2026-10-23';
const SCOPE='SPACE_SATELLITE_R14_MISSING_ONLY_20261025';
const SOURCE='https://getmarkethistory.com';
const RAW_MODE='RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE';
const MISSING=Object.freeze({WARP:'2026-05-07',ORBX:'2026-04-15',
 MARS:'2026-03-05',DIPR:'2026-05-06',WSPC:'2026-07-09'});
const NY=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',
 year:'numeric',month:'2-digit',day:'2-digit'});
const need=(ok,code)=>{if(!ok)throw Object.assign(new Error(code),{code});};
const within=(base,p)=>{const r=path.relative(base,p);
 return r!==''&&r!=='..'&&!r.startsWith('..'+path.sep)&&!path.isAbsolute(r);};
const isoDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&
 !Number.isNaN(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
const nextDate=s=>new Date(Date.parse(s+'T00:00:00Z')+86400000).toISOString().slice(0,10);
const atomic=(file,obj)=>{const tmp=file+'.'+process.pid+'.tmp';
 fs.writeFileSync(tmp,JSON.stringify(obj,null,2)+'\n',{flag:'wx'});
 try{fs.renameSync(tmp,file);}finally{if(fs.existsSync(tmp))fs.unlinkSync(tmp);}};
const stoppable=(r,reason)=>({...r,status:reason});

// Derive the SIX missing intervals from live PC SHA evidence, not a two-ETF basket.
// The five first dates come from real provider symbol inventory (R12); ARKX is
// one day after the last SHA-verified stored 15-NY observation (R13).
export function deriveMissingOnlyPlan(r13){
 need(r13?.report==='SPACE_SATELLITE_R13_EXISTING_PC_UNIVERSE_RAW_AUDIT'&&
   r13?.sourceManifestSha256===R13_SOURCE_SHA&&
   r13?.sharedSpyManifestSha256===R13_SPY_SHA&&
   r13?.sharedSpyNy15Dates===706,'R14_SOURCE_SNAPSHOT_MISMATCH');
 const entries=new Map(r13.records?.map(row=>[row.ticker,row]));
 need(entries.size===9,'R14_CANDIDATE_UNIVERSE_DRIFT');
 for(const [ticker,n] of [['UFO',656],['NASA',144],['ROKT',446]]){
  const r=entries.get(ticker);
  need(r?.rawShaAudited===true&&r?.spyCommonNy15Dates===n&&
    r?.lastEtfNy15Date===R14_END&&r?.latestDatesAgree===true,
    'R14_EXISTING_CURRENT_RAW_DRIFT');
 }
 const arkx=entries.get('ARKX');
 need(arkx?.rawShaAudited===true&&arkx?.rawFiles===1&&
   arkx?.spyCommonNy15Dates===494&&arkx.lastEtfNy15Date==='2025-12-18'&&
   arkx?.latestDatesAgree===false,'R14_ARKX_DELTA_IDENTITY');
 const plan=[];
 for(const [ticker,start] of Object.entries(MISSING)){
  const row=entries.get(ticker);
  need(row?.stage==='NO_LOCAL_RAW'&&row?.rawFiles===0&&
    row?.rawShaAudited===false,'R14_EXPECTED_MISSING_RAW_CHANGED');
  plan.push({ticker,start,end:R14_END,mode:'NEW_RAW_ONLY'});
 }
 plan.splice(3,0,{ticker:'ARKX',start:nextDate(arkx.lastEtfNy15Date),
   end:R14_END,mode:'EXISTING_HISTORY_PRESERVED_DELTA_ONLY'});
 need(plan.length===6&&plan.every(x=>isoDate(x.start)&&x.start<=x.end),
  'R14_INVALID_PLAN');
 return {scope:SCOPE,baseManifestSha256:R13_SOURCE_SHA,sharedSpyManifestSha256:R13_SPY_SHA,
  plan,excludedPreserved:['UFO','NASA','ROKT'],
  finalBasketSelected:false,publicationAuthorized:false,rightsVerified:false};
}

// File changes are strictly opt-in --collect, private PC raw history only.
export async function collectMissingOnly({dataRoot,maxRequests=6,
 fetchImpl=fetch,now=()=>new Date().toISOString(),
 auditImpl=auditSpaceUniverse,fixtureSnapshot=null}={}){
 need(typeof dataRoot==='string'&&fs.existsSync(dataRoot)&&
   Number.isInteger(maxRequests)&&maxRequests>=1&&maxRequests<=6,
   'R14_ARGUMENTS');
 const root=fs.realpathSync(dataRoot),home=path.join(root,'themes','space-satellite');
 need(fs.existsSync(home),'R14_SPACE_HOME_MISSING');
 const actualHome=fs.realpathSync(home);
 need(within(root,actualHome),'R14_HOME_ESCAPE');
 const stateDir=path.join(actualHome,'state');
 need(fs.existsSync(stateDir)&&within(actualHome,fs.realpathSync(stateDir)),
  'R14_STATE_FOLDER_MISSING');
 const manifestFile=path.join(actualHome,'raw-manifest.json');
 const rawDir=path.join(actualHome,'raw');
 need(fs.existsSync(rawDir)&&within(actualHome,fs.realpathSync(rawDir)),
  'R14_RAW_FOLDER_MISSING');
 const stateFile=path.join(stateDir,'collection-space-r14-missing-only.json');
 const lock=path.join(stateDir,'collection.lock');
 const report={scope:SCOPE,status:'RUNNING',providerCalls:0,rawFilesStored:0,
  publicWrites:0,d1Writes:0,schedulerWrites:0,existingFilesRewritten:0};

 // Audit before taking any write lock; do not create even a checkpoint if stale.
 // fixtureSnapshot is for synthetic local tests only; the manual CMD has no
 // argument or environment path that can supply a replacement snapshot.
 let snapshot=fixtureSnapshot;
 if(!fs.existsSync(stateFile)&&!snapshot){
  const evidence=auditImpl({dataRoot});snapshot=deriveMissingOnlyPlan(evidence);
 }
 if(fs.existsSync(stateFile)&&!fixtureSnapshot){
  // R13's raw SHA audit must pass on each manual resume, including pages
  // appended by R14; a checkpoint digest alone cannot catch raw tampering.
  const evidence=auditImpl({dataRoot});
  need(evidence?.sharedSpyManifestSha256===R13_SPY_SHA&&
    evidence?.records?.length===9&&
    ['UFO','NASA','ROKT'].every(t=>evidence.records.some(r=>
      r.ticker===t&&r.rawShaAudited&&r.latestDatesAgree)),
    'R14_RESUME_RAW_OR_SHARED_SPY_DRIFT');
 }
 if(!fs.existsSync(stateFile))
  need(sha(fs.readFileSync(manifestFile))===snapshot?.baseManifestSha256,
    'R14_BASELINE_MANIFEST_DRIFT');
 const lockFd=fs.openSync(lock,'wx');
 fs.writeSync(lockFd,JSON.stringify({pid:process.pid,at:now()}));fs.closeSync(lockFd);
 try{
  let state;
  if(fs.existsSync(stateFile)){
   state=JSON.parse(fs.readFileSync(stateFile,'utf8'));
  }else{
   // Lock now held: refuse if another writer changed the R13-verified baseline.
   if(!fixtureSnapshot)deriveMissingOnlyPlan(auditImpl({dataRoot}));
   need(sha(fs.readFileSync(manifestFile))===snapshot?.baseManifestSha256,
     'R14_LOCKED_MANIFEST_DRIFT');
   need(snapshot?.scope===SCOPE&&Array.isArray(snapshot.plan)&&
     typeof snapshot.baseManifestSha256==='string'&&
     typeof snapshot.sharedSpyManifestSha256==='string','R14_SNAPSHOT_INVALID');
   state={version:1,scope:SCOPE,baseManifestSha256:snapshot.baseManifestSha256,
    sharedSpyManifestSha256:snapshot.sharedSpyManifestSha256,
    manifestSha256:snapshot.baseManifestSha256,
    plan:snapshot.plan,
    symbols:Object.fromEntries(snapshot.plan.map(p=>[p.ticker,
      {complete:false,cursor:null,pages:0,files:[]}]))};
   atomic(stateFile,state);
  }
  need(state?.version===1&&state.scope===SCOPE&&
    state.baseManifestSha256===(fixtureSnapshot?.baseManifestSha256??R13_SOURCE_SHA)&&
    state.sharedSpyManifestSha256===(fixtureSnapshot?.sharedSpyManifestSha256??R13_SPY_SHA)&&
    Array.isArray(state.plan)&&state.plan.length===6&&
    JSON.stringify(state.plan)===JSON.stringify(
      snapshot?.plan??deriveKnownPlanFromState(state)),'R14_CHECKPOINT_IDENTITY');
  if(state.failedAt)return stoppable(report,'STOP_PREVIOUS_FAILURE_REVIEW_REQUIRED');
  const current=fs.readFileSync(manifestFile);
  need(sha(current)===state.manifestSha256,'R14_MANIFEST_CHANGED_OUTSIDE_CHECKPOINT');
  const manifest=JSON.parse(current);
  need(manifest.version===1&&manifest.themeId==='space-satellite'&&
    Array.isArray(manifest.files),'R14_MANIFEST_IDENTITY');
  const initialCount=manifest.files.length;
  for(const item of state.plan){
   const progress=state.symbols?.[item.ticker];
   need(progress&&Array.isArray(progress.files)&&typeof progress.complete==='boolean',
    'R14_CHECKPOINT_SYMBOL_MISSING');
   for(const file of progress.files){
    need(/^raw\/[A-Z][A-Z0-9.-]*_[a-f0-9]{64}\.jsonl$/.test(file.path)&&
      file.path.startsWith('raw/'+item.ticker+'_')&&
      fs.existsSync(path.join(actualHome,file.path))&&
      sha(fs.readFileSync(path.join(actualHome,file.path)))===file.sha256&&
      manifest.files.some(f=>f.path===file.path&&f.sha256===file.sha256),
      'R14_CHECKPOINT_RAW_SHA');
   }
  }
  for(const item of state.plan){
   const progress=state.symbols[item.ticker];
   while(!progress.complete&&report.providerCalls<maxRequests){
    const url=new URL('/api/v1/bars/stocks/'+item.ticker+'/1h',SOURCE);
    for(const [key,value] of Object.entries({start:item.start,end:item.end,
      limit:'5000',format:'jsonl',columns:'timestamp,close,symbol,is_gap'}))
      url.searchParams.set(key,value);
    if(progress.cursor)url.searchParams.set('cursor',progress.cursor);
    state.failedAt=now();state.reason='REQUEST_NOT_COMMITTED';
    atomic(stateFile,state);report.providerCalls++;
    let res;
    try{res=await fetchImpl(url,{redirect:'error',
      signal:AbortSignal.timeout(23000),headers:{accept:'application/x-ndjson'}});}
    catch{return stoppable(report,'STOP_NETWORK_OR_TIMEOUT_REVIEW_REQUIRED');}
    if(!res.ok){state.reason='HTTP_'+res.status;
      atomic(stateFile,state);return stoppable(report,'STOP_HTTP_'+res.status);}
    const through=res.headers?.get('x-data-through')??null;
    if(!through||through.slice(0,10)<R14_END){state.reason='STALE_DATA_THROUGH';
      atomic(stateFile,state);return stoppable(report,'STOP_STALE_SOURCE');}
    if(Number(res.headers.get('content-length')??0)>6_000_000){
      state.reason='RESPONSE_TOO_LARGE';atomic(stateFile,state);
      return stoppable(report,'STOP_BODY_LIMIT');
    }
    const chunks=[];let bytes=0;
    try{for await(const chunk of res.body){bytes+=chunk.byteLength;
      if(bytes>6_000_000)throw Error('BODY_LIMIT');chunks.push(Buffer.from(chunk));}}
    catch{return stoppable(report,'STOP_BODY_OR_STREAM_REVIEW_REQUIRED');}
    const body=Buffer.concat(chunks).toString('utf8');
    let rows;try{rows=body.split(/\r?\n/).filter(Boolean).map(JSON.parse);}
    catch{return stoppable(report,'STOP_BAD_JSONL_REVIEW_REQUIRED');}
    if(rows.length===0||rows.length>5000){state.reason='ROW_COUNT';
      atomic(stateFile,state);return stoppable(report,'STOP_ROW_COUNT');}
    let last='';
    for(const r of rows){
      need(r.symbol===item.ticker&&typeof r.timestamp==='string'&&
        Number.isFinite(Date.parse(r.timestamp))&&Number.isFinite(r.close)&&
        r.close>0&&typeof r.is_gap==='boolean'&&
        r.timestamp.slice(0,10)>=item.start&&
        r.timestamp.slice(0,10)<=item.end&&
        (!last||r.timestamp>last),
        'R14_INVALID_PRICE_BAR');last=r.timestamp;
    }
    const next=res.headers.get('x-next-cursor');
    need(!next||next!==progress.cursor,'R14_CURSOR_NOT_ADVANCING');
    const digest=sha(body),relative=`raw/${item.ticker}_${digest}.jsonl`;
    need(!manifest.files.some(f=>f.path===relative),
      'R14_RAW_PAGE_ALREADY_IN_MANIFEST_REVIEW');
    const dest=path.join(rawDir,`${item.ticker}_${digest}.jsonl`);
    if(!fs.existsSync(dest))fs.writeFileSync(dest,body,{flag:'wx'});
    need(sha(fs.readFileSync(dest))===digest,'R14_RAW_READBACK_SHA');
    const days=rows.map(r=>NY.format(new Date(r.timestamp))).sort();
    manifest.files.push({path:relative,sha256:digest,source:SOURCE,
      collectedAt:state.failedAt,observationFrom:days[0],
      observationThrough:days.at(-1),priceMode:RAW_MODE,
      schemaVersion:'GMH_NDJSON_1H_COLUMNS_V1'});
    atomic(manifestFile,manifest);
    state.manifestSha256=sha(fs.readFileSync(manifestFile));
    progress.files.push({path:relative,sha256:digest});
    progress.pages++;progress.complete=!next;progress.cursor=next;
    delete state.failedAt;delete state.reason;atomic(stateFile,state);
    report.rawFilesStored++;
  }
  }
  report.completed=state.plan.filter(x=>state.symbols[x.ticker].complete).map(x=>x.ticker);
  report.pending=state.plan.filter(x=>!state.symbols[x.ticker].complete).map(x=>x.ticker);
  report.manifestEntriesBeforeThisRun=initialCount;
  report.manifestEntriesAfterThisRun=manifest.files.length;
  report.status=report.pending.length?'CHECKPOINT_READY_TO_MANUALLY_RESUME':
    'PRIVATE_MISSING_ONLY_RAW_COLLECTION_COMPLETE';
  report.rightsVerified=false;report.publicationAuthorized=false;
  report.finalBasketSelected=false;report.r2ScoresVerified=false;
  return report;
 }finally{fs.unlinkSync(lock);}
}

function deriveKnownPlanFromState(state){
 // On resume, compare to a fixed approved six-symbol inventory. Do not infer
 // any new symbol or period from a potentially untrusted checkpoint.
 return [
  {ticker:'WARP',start:'2026-05-07',end:R14_END,mode:'NEW_RAW_ONLY'},
  {ticker:'ORBX',start:'2026-04-15',end:R14_END,mode:'NEW_RAW_ONLY'},
  {ticker:'MARS',start:'2026-03-05',end:R14_END,mode:'NEW_RAW_ONLY'},
  {ticker:'ARKX',start:'2025-12-19',end:R14_END,mode:'EXISTING_HISTORY_PRESERVED_DELTA_ONLY'},
  {ticker:'DIPR',start:'2026-05-06',end:R14_END,mode:'NEW_RAW_ONLY'},
  {ticker:'WSPC',start:'2026-07-09',end:R14_END,mode:'NEW_RAW_ONLY'},
 ];
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.slice(2).join(' ')!=='--collect'){
  console.log('READ_ONLY_DEFAULT: --collect manually, max 6 free 1h GETs per run; SHA-pinned R13 snapshot.');
 }else try{
  const report=await collectMissingOnly({dataRoot:process.env.ZGMINI_DATA_ROOT??'E:/ZGmini/data'});
  console.log(JSON.stringify(report,null,2));
  if(report.status.startsWith('STOP'))process.exitCode=2;
 }catch(error){
  console.error(JSON.stringify({scope:SCOPE,status:'BLOCKED',
    reason:error.code??error.message??'R14_UNKNOWN',
    publicWrites:0,d1Writes:0,schedulerWrites:0}));
  process.exitCode=1;
 }
}
