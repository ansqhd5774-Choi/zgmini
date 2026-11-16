// W03: manual-only, GMH-only seven-theme historical bridge.
// No task registration, public API, MarketParquet, D1, or live publisher access.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {regularHour15Rows,scoreAll252} from './theme-optional-score-r188.mjs';

export const SYMBOLS=Object.freeze(['SPY','BOTZ','ROBO','SKYY','CLOU','DRIV',
 'NLR','URA','ITA','SHLD','FINX','ARKF','CIBR','BUG']);
export const PAIRS=Object.freeze([
 {theme:'로봇·자동화',etfs:['BOTZ','ROBO']},
 {theme:'클라우드·SaaS',etfs:['SKYY','CLOU']},
 {theme:'자율주행',etfs:['DRIV','BOTZ']},
 {theme:'원전·SMR',etfs:['NLR','URA']},
 {theme:'방산',etfs:['ITA','SHLD']},
 {theme:'핀테크',etfs:['FINX','ARKF']},
 {theme:'사이버보안',etfs:['CIBR','BUG']},
]);
export const HOME='themes/theme-legacy-seven';
export const DATA_SCHEMA='GMH_SEVEN_1H_SAVED_RAW_V1';
export const SCORER_METHOD='ETF_ONLY_T40_R20_V40_PAIR50';
const GMH='https://getmarkethistory.com';
const SHA=b=>createHash('sha256').update(b).digest('hex');
const HASH=/^[a-f0-9]{64}$/;
const validDay=s=>typeof s==='string'&&/^\d{4}-\d\d-\d\d$/.test(s)&&
 Number.isFinite(Date.parse(s+'T00:00:00Z'))&&
 new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
const fail=code=>{throw Object.assign(Error('W03_GMH_'+code),{code:'W03_GMH_'+code});};
const need=(ok,code)=>{if(!ok)fail(code);};
const realChild=(root,rel)=>{
 const base=fs.realpathSync.native(root),resolved=path.join(base,...rel.split('/'));
 const real=fs.realpathSync.native(resolved);
 const r=path.relative(base,real);
 need(r!==''&&r!=='..'&&!r.startsWith('..'+path.sep)&&!path.isAbsolute(r),
  'RAW_REALPATH_ESCAPE');
 return real;
};
const safeHome=dataRoot=>{
 const base=fs.realpathSync.native(dataRoot);
 const home=path.join(base,...HOME.split('/'));
 fs.mkdirSync(home,{recursive:true});
 need(realChild(base,HOME)===fs.realpathSync.native(home),'RAW_HOME_ESCAPE');
 return home;
};
const saveJson=(file,object)=>{
 const tmp=file+'.'+process.pid+'.tmp';
 fs.writeFileSync(tmp,JSON.stringify(object,null,2)+'\n',{flag:'wx'});
 try{fs.renameSync(tmp,file);}finally{if(fs.existsSync(tmp))fs.unlinkSync(tmp);}
};
const loadJson=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const digestWindow=(start,end)=>SHA(Buffer.from(DATA_SCHEMA+':'+start+':'+end)).slice(0,16);
const rawPath=(s,digest)=>'raw/'+s+'_'+digest+'.jsonl';
const assertManifest=(m,start=null,end=null)=>{
 need(m?.schema===DATA_SCHEMA&&m.version===1&&
  validDay(m.start)&&validDay(m.end)&&
  (!start||m.start===start)&&(!end||m.end===end)&&
  Array.isArray(m.files)&&m.files.length<=256,'MANIFEST_CONTRACT');
 const uniq=new Set();
 for(const e of m.files){
  need(SYMBOLS.includes(e.symbol)&&HASH.test(e.sha256??'')&&
   e.path===rawPath(e.symbol,e.sha256)&&
   e.source==='GETMARKETHISTORY_FREE_1H'&&
   e.priceMode==='RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE'&&
   validDay(e.observationFrom)&&validDay(e.observationThrough)&&
   !uniq.has(e.path),'MANIFEST_FILE_CONTRACT');
  uniq.add(e.path);
 }
 return m;
};
const checkpointTemplate=(start,end)=>({schema:DATA_SCHEMA,version:1,start,end,
 symbols:Object.fromEntries(SYMBOLS.map(s=>[s,{
  complete:false,cursor:null,pages:0,files:[]}]))});
const checkState=(state,start,end)=>{
 need(state?.schema===DATA_SCHEMA&&state.version===1&&
  state.start===start&&state.end===end&&
  Object.keys(state.symbols??{}).length===SYMBOLS.length,
  'CHECKPOINT_IDENTITY');
 for(const s of SYMBOLS){
  const st=state.symbols[s];
  need(st&&typeof st.complete==='boolean'&&
   (st.cursor===null||typeof st.cursor==='string'&&st.cursor.length<=2048)&&
   Number.isSafeInteger(st.pages)&&st.pages>=0&&st.pages<=256&&
   Array.isArray(st.files)&&st.files.length<=256&&
   st.files.every(e=>e&&e.path===rawPath(s,e.sha256)&&HASH.test(e.sha256)),
   'CHECKPOINT_SYMBOL_CONTRACT');
 }
 return state;
};
const bodyFromResponse=async res=>{
 const len=Number(res.headers?.get('content-length')??0);
 need(Number.isFinite(len)&&len>=0&&len<=6_000_000,'PAGE_CONTENT_LENGTH');
 const parts=[];let size=0;
 for await(const chunk of res.body){
  size+=chunk.byteLength;need(size<=6_000_000,'PAGE_BODY_LIMIT');
  parts.push(Buffer.from(chunk));
 }
 return Buffer.concat(parts);
};
const parsePage=(buffer,symbol,start,end)=>{
 need(buffer.length<=6_000_000,'PAGE_SIZE');
 const lines=buffer.toString('utf8').split(/\r?\n/).filter(x=>x.trim());
 need(lines.length<=5000,'PROVIDER_PAGE_BOUND');
 const seen=new Set();let prev=-Infinity;
 for(const line of lines){
  let row;try{row=JSON.parse(line);}catch{fail('PROVIDER_JSON');}
  const t=row?.timestamp,d=typeof t==='string'?Date.parse(t):NaN;
  const utcDay=Number.isFinite(d)?new Date(d).toISOString().slice(0,10):null;
  need(row?.symbol===symbol&&Number.isFinite(d)&&
   typeof t==='string'&&/^\d{4}-\d\d-\d\dT/.test(t)&&
   utcDay>=start&&utcDay<=end&&
   d>prev&&!seen.has(d),'PROVIDER_IDENTITY_OR_ORDER');
  // Provider gap/late/missing data are retained verbatim, not rejected
  // because they do not fit a locally invented scoring contract.
  prev=d;seen.add(d);
 }
 return {rows:lines.length,
  earliestUtc:lines.length?new Date(Date.parse(JSON.parse(lines[0]).timestamp)).toISOString().slice(0,10):null,
  latestUtc:lines.length?new Date(Date.parse(JSON.parse(lines.at(-1)).timestamp)).toISOString().slice(0,10):null};
};
export async function collectSevenGmh({
 dataRoot,start,end,maxRequests=4,fetchImpl=fetch,clock=()=>new Date().toISOString()
}={}){
 need(validDay(start)&&validDay(end)&&start<=end&&
  Number.isInteger(maxRequests)&&maxRequests>=1&&maxRequests<=4,
  'COLLECT_ARGUMENTS');
 const home=safeHome(dataRoot),rawDir=path.join(home,'raw'),
  stateDir=path.join(home,'state');
 fs.mkdirSync(rawDir,{recursive:true});fs.mkdirSync(stateDir,{recursive:true});
 need(realChild(home,'raw')===fs.realpathSync.native(rawDir)&&
  realChild(home,'state')===fs.realpathSync.native(stateDir),'DIRECTORY_ESCAPE');
 const windowId=digestWindow(start,end),
  statePath=path.join(stateDir,'manual-'+windowId+'.json'),
  manifestPath=path.join(home,'raw-manifest.json'),
  lock=path.join(stateDir,'manual-gmh-collector.lock');
 const fd=fs.openSync(lock,'wx');
 const report={schema:DATA_SCHEMA,status:'NOT_STARTED',
  providerCalls:0,rawPagesStored:0,
  pcRawWrites:0,d1Writes:0,publicWrites:0,schedulerWrites:0};
 try{
  const st=fs.existsSync(statePath)?loadJson(statePath):
   checkpointTemplate(start,end);
  checkState(st,start,end);
  if(st.failedAt)return {...report,status:'STOP_PREVIOUS_FAILURE_REVIEW_REQUIRED'};
  const manifest=fs.existsSync(manifestPath)?
   assertManifest(loadJson(manifestPath),start,end):
   {schema:DATA_SCHEMA,version:1,start,end,files:[]};
  // Already persisted pages must still match original provider bytes.
  for(const symbol of SYMBOLS)for(const item of st.symbols[symbol].files){
   const f=realChild(home,item.path);
   need(SHA(fs.readFileSync(f))===item.sha256,'CHECKPOINT_RAW_SHA_DRIFT');
  }
  for(const symbol of SYMBOLS){
   const target=st.symbols[symbol];
   while(!target.complete&&report.providerCalls<maxRequests){
    const url=new URL('/api/v1/bars/stocks/us/'+symbol+'/1h',GMH);
    for(const [key,value] of Object.entries({
     start,end,limit:'5000',format:'jsonl',
     columns:'timestamp,close,symbol,is_gap'
    }))url.searchParams.set(key,value);
    if(target.cursor)url.searchParams.set('cursor',target.cursor);
    const attemptAt=clock();
    st.failedAt=attemptAt;st.failedReason='REQUEST_PENDING';
    saveJson(statePath,st);
    report.providerCalls++;
    let res;
    try{res=await fetchImpl(url,{headers:{accept:'application/x-ndjson'},
      signal:AbortSignal.timeout(23000),redirect:'error'});}
    catch{return {...report,status:'STOP_PROVIDER_NETWORK_OR_TIMEOUT'};}
    if(!res?.ok){
     st.failedReason='HTTP_'+(Number(res?.status)||0);
     saveJson(statePath,st);
     return {...report,status:'STOP_PROVIDER_HTTP_'+(Number(res?.status)||0)};
    }
    // The source is authoritative: retain its rows incl. explicit gaps,
    // rather than requiring every provider bar to be score-eligible.
    const bytes=await bodyFromResponse(res);
    const meta=parsePage(bytes,symbol,start,end);
    const digest=SHA(bytes),relative=rawPath(symbol,digest),
     output=path.join(rawDir,symbol+'_'+digest+'.jsonl');
    if(meta.rows){
     if(!fs.existsSync(output))fs.writeFileSync(output,bytes,{flag:'wx'});
     need(SHA(fs.readFileSync(output))===digest,'RAW_PAGE_READBACK');
     if(!manifest.files.some(e=>e.path===relative)){
      manifest.files.push({path:relative,sha256:digest,symbol,
       source:'GETMARKETHISTORY_FREE_1H',
       priceMode:'RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE',
       collectedAt:attemptAt,
       observationFrom:meta.earliestUtc,observationThrough:meta.latestUtc,
       rowCount:meta.rows});
      assertManifest(manifest,start,end);
      saveJson(manifestPath,manifest);
      report.rawPagesStored++;report.pcRawWrites++;
     }
     if(!target.files.some(e=>e.path===relative))
      target.files.push({path:relative,sha256:digest});
    }
    const next=res.headers.get('x-next-cursor');
    need(!next||typeof next==='string'&&next.length<=2048&&
     next!==target.cursor,'PROVIDER_CURSOR_INVALID');
    target.complete=!next;target.cursor=next;
    target.pages++;
    delete st.failedAt;delete st.failedReason;
    saveJson(statePath,st);
   }
  }
  const done=SYMBOLS.every(s=>st.symbols[s].complete);
  return {...report,status:done?'PRIVATE_GMH_HISTORY_COLLECTED':
   'CHECKPOINT_READY_TO_RESUME',
   completedSymbols:SYMBOLS.filter(s=>st.symbols[s].complete).length,
   pendingSymbols:SYMBOLS.filter(s=>!st.symbols[s].complete).length,
   manifestFiles:manifest.files.length,
   providerScope:'GETMARKETHISTORY_FREE_HOURLY_ONLY'};
 }finally{
  fs.closeSync(fd);fs.unlinkSync(lock);
 }
}
export function computeSevenGmh({dataRoot}={}){
 const home=safeHome(dataRoot),manifestFile=path.join(home,'raw-manifest.json');
 const manifestBytes=fs.readFileSync(manifestFile);
 const manifest=assertManifest(JSON.parse(manifestBytes.toString('utf8')));
 const statePath=path.join(home,'state',
  'manual-'+digestWindow(manifest.start,manifest.end)+'.json');
 const state=checkState(loadJson(statePath),manifest.start,manifest.end);
 need(!state.failedAt&&SYMBOLS.every(s=>state.symbols[s].complete),
  'COLLECTION_NOT_COMPLETE');
 const tables={};let totalRows=0,sourceGapRows=0,unusableRows=0;
 for(const symbol of SYMBOLS){
  const files=manifest.files.filter(f=>f.symbol===symbol);
  need(files.length>0&&files.length<=256,'SYMBOL_RAW_MISSING');
  const bars=new Map();
  for(const f of files){
   const raw=fs.readFileSync(realChild(home,f.path));
   need(SHA(raw)===f.sha256,'RAW_FILE_SHA');
   const rows=raw.toString('utf8').split(/\r?\n/).filter(Boolean);
   need(rows.length===f.rowCount,'RAW_ROW_COUNT_MISMATCH');
   totalRows+=rows.length;
   for(const line of rows){
    const r=JSON.parse(line);
    need(r.symbol===symbol&&typeof r.timestamp==='string'&&
      Number.isFinite(Date.parse(r.timestamp)),'RAW_SYMBOL_OR_TIME');
    if(r.is_gap===true){sourceGapRows++;continue;}
    if(typeof r.close!=='number'||!Number.isFinite(r.close)||r.close<=0){
     unusableRows++;continue;
    }
    const old=bars.get(r.timestamp);
    need(!old||old.close===r.close,'RAW_OVERLAP_PRICE_REVISION');
    bars.set(r.timestamp,r);
   }
  }
  const hourly=[...bars.values()].sort((a,b)=>a.timestamp.localeCompare(b.timestamp));
  tables[symbol]=new Map(regularHour15Rows(hourly).map(r=>[r.date,r.close]));
 }
 const common=[...tables.SPY.keys()].filter(d=>SYMBOLS.every(s=>
  tables[s].has(d))).sort();
 need(common.length>=628,'COMMON_628_SESSIONS_MISSING');
 const dates=common.slice(-628),series={};
 for(const s of SYMBOLS.slice(1))series[s]=scoreAll252(
  dates.map(d=>tables[s].get(d)),dates.map(d=>tables.SPY.get(d)));
 const historyDates=dates.slice(-252);
 const themes=PAIRS.map(({theme,etfs})=>({
  theme,etfs:[...etfs],
  history:historyDates.map((date,i)=>({
   date,score:Number(((series[etfs[0]][i]+series[etfs[1]][i])/2).toFixed(5))
  }))
 }));
 const scorerSha256=SHA(fs.readFileSync(new URL('./theme-optional-score-r188.mjs',import.meta.url)));
 const candidate={
  schema:'ZGMINI_W03_GMH_SEVEN_PRIVATE_252_V1',
  status:'PRIVATE_GMH_ONLY_7X252_NOT_PUBLISHED',
  observationDate:historyDates.at(-1),firstHistoryDate:historyDates[0],
  methodologyVersion:SCORER_METHOD,
  scoreMethod:'ETF_ONLY_PROXY',
  priceMode:'UNADJUSTED_15_NY_HOURLY_PROXY_WITH_OFFICIAL_EARLY_CLOSE_12',
  inputProvider:'GETMARKETHISTORY_FREE_HOURLY_ONLY',
  rawManifestSha256:SHA(manifestBytes),scorerSha256,
  sourceWindow:{from:manifest.start,through:manifest.end},
  barRowsRead:totalRows,gapRows:sourceGapRows,unusableRows,
  commonSessionCount:common.length,
  themes,publicationAuthorized:false,upstreamCommercialRightsVerified:false,
  derivedLicenseVerified:false,providerCalls:0,d1Writes:0,publicWrites:0,
  schedulerWrites:0
 };
 return candidate;
}
export function saveSevenPrivateCandidate(dataRoot,candidate){
 need(candidate?.schema==='ZGMINI_W03_GMH_SEVEN_PRIVATE_252_V1'&&
  candidate.status==='PRIVATE_GMH_ONLY_7X252_NOT_PUBLISHED'&&
  candidate.themes?.length===7&&candidate.themes.every(t=>t.history?.length===252)&&
  candidate.d1Writes===0&&candidate.publicWrites===0,
  'PRIVATE_ONLY_CONTRACT');
 const home=safeHome(dataRoot),dir=path.join(home,'derived');
 fs.mkdirSync(dir,{recursive:true});
 need(realChild(home,'derived')===fs.realpathSync.native(dir),'DERIVED_ESCAPE');
 const bytes=Buffer.from(JSON.stringify(candidate,null,2)+'\n'),
  digest=SHA(bytes),name='seven-gmh-'+digest.slice(0,16)+'.json',file=path.join(dir,name);
 if(fs.existsSync(file)){
  need(SHA(fs.readFileSync(file))===digest,'PRIVATE_OUTPUT_IMMUTABLE_CONFLICT');
  return {status:'EXISTING_IDENTICAL',sha256:digest};
 }
 fs.writeFileSync(file,bytes,{flag:'wx'});
 need(SHA(fs.readFileSync(file))===digest,'PRIVATE_OUTPUT_READBACK');
 return {status:'PRIVATE_CANDIDATE_SAVED',sha256:digest};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [mode,start,end]=process.argv.slice(2);
 if(mode!=='--collect'&&mode!=='--compute')
  process.stdout.write('READ_ONLY_DEFAULT: --collect <start> <end> or --compute; manual only\n');
 else try{
  const dataRoot=process.env.ZGMINI_DATA_ROOT??'E:/ZGmini/data';
  if(mode==='--collect'){
   const r=await collectSevenGmh({dataRoot,start,end});
   process.stdout.write(JSON.stringify(r)+'\n');
   if(r.status.startsWith('STOP'))process.exitCode=2;
  }else{
   const candidate=computeSevenGmh({dataRoot});
   const saved=saveSevenPrivateCandidate(dataRoot,candidate);
   process.stdout.write(JSON.stringify({status:candidate.status,observationDate:candidate.observationDate,
    commonSessionCount:candidate.commonSessionCount,historyPoints:7*252,
    inputManifestSha256:candidate.rawManifestSha256,privateArtifactSha256:saved.sha256,
    providerCalls:0,d1Writes:0,publicWrites:0})+'\n');
  }
 }catch(e){process.stderr.write(/^W03_GMH_[A-Z0-9_]+$/.test(e?.code??'')?
  e.code+'\n':'W03_GMH_UNKNOWN_STOP\n');process.exitCode=1;}
}