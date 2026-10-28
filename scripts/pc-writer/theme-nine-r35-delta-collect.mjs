// R35 first incremental window. Immutable R23 is read-only; new 1h bars go to
// a separate private root. No paid route, calculator, scheduler or publication.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {auditNineR34RefreshPreflight} from './theme-nine-r34-refresh-preflight.mjs';

const sha = x => createHash('sha256').update(x).digest('hex');
const fail = code => {throw Object.assign(new Error('THEME_NINE_R35_' + code),{code:'THEME_NINE_R35_' + code});};
const SOURCE = 'https://getmarkethistory.com';
const DELTA_SUBDIR = 'themes/legacy-nine-r35-delta';
const PRICE_MODE = 'RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE';
const MAX_GETS = 4;
const MAX_BATCHES = 64;
const BATCH_PAUSE_MS = 60_000;
const REQUEST_TIMEOUT_MS = 45_000;
const PAGE_LIMIT = 5000;
const MAX_BODY_BYTES = 8_000_000;

const dateOK = x => typeof x==='string' && /^\d{4}-\d{2}-\d{2}$/.test(x) &&
  !Number.isNaN(Date.parse(x+'T00:00:00Z')) && new Date(x+'T00:00:00Z').toISOString().slice(0,10)===x;
const ny = new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',
  year:'numeric',month:'2-digit',day:'2-digit'});
const nyDay = timestamp => {
  const m = Object.fromEntries(ny.formatToParts(new Date(timestamp))
    .filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
  return `${m.year}-${m.month}-${m.day}`;
};
function within(root, candidate) {
  const rel = path.relative(root, candidate);
  return Boolean(rel) && rel!=='..' && !rel.startsWith('..'+path.sep) && !path.isAbsolute(rel);
}
function dir(root, relative) {
  const target = path.join(root,relative);
  if(!within(root,target))fail('PATH_OUTSIDE_DATA_ROOT');
  fs.mkdirSync(target,{recursive:true});
  const actual = fs.realpathSync(target);
  if(!within(root,actual))fail('ROOT_SYMLINK_OUTSIDE_DATA');
  return actual;
}
function writeJSON(target,obj) {
  const tmp=target+'.'+process.pid+'.'+Math.random().toString(36).slice(2)+'.tmp';
  fs.writeFileSync(tmp,JSON.stringify(obj,null,2)+'\n',{flag:'wx'});
  try {fs.renameSync(tmp,target);} finally {if(fs.existsSync(tmp))fs.unlinkSync(tmp);}
}
function loadJSON(file){return JSON.parse(fs.readFileSync(file,'utf8'));}
function metadata(home,rosterSha,start,end,symbols) {
  const manifestFile=path.join(home,'raw-manifest.json');
  const manifest=fs.existsSync(manifestFile)?loadJSON(manifestFile):{
    version:1,project:'legacy-nine-r35-delta',rosterSha256:rosterSha,source:SOURCE,
    licenseStatus:'PRIVATE_RESEARCH_ONLY_PUBLICATION_NOT_APPROVED',files:[]};
  if(manifest.version!==1||manifest.project!=='legacy-nine-r35-delta'||
     manifest.rosterSha256!==rosterSha||manifest.source!==SOURCE||
     manifest.licenseStatus!=='PRIVATE_RESEARCH_ONLY_PUBLICATION_NOT_APPROVED'||
     !Array.isArray(manifest.files))fail('MANIFEST_IDENTITY');
  const stateKey=sha(JSON.stringify({roster:rosterSha,start,end})).slice(0,20);
  const stateFile=path.join(home,'state','delta-'+stateKey+'.json');
  const state=fs.existsSync(stateFile)?loadJSON(stateFile):{
    version:1,project:'legacy-nine-r35-delta',rosterSha256:rosterSha,start,end,
    symbols:Object.fromEntries(symbols.map(s=>[s,{complete:false,files:[],cursor:null,
      lastTimestamp:null,pages:0,noBars:false}]))};
  if(state.version!==1||state.project!=='legacy-nine-r35-delta'||
     state.rosterSha256!==rosterSha||state.start!==start||state.end!==end||
     Object.keys(state.symbols||{}).length!==symbols.length||
     symbols.some(s=>!state.symbols[s]))fail('DELTA_CHECKPOINT_IDENTITY');
  const paths=new Set();
  for(const e of manifest.files){
    if(!symbols.includes(e.symbol)||typeof e.path!=='string'||
       !/^raw\/[A-Z][A-Z0-9.]{0,11}_[a-f0-9]{64}\.jsonl$/.test(e.path)||
       !e.path.startsWith('raw/'+e.symbol+'_')||paths.has(e.path)||
       !/^[a-f0-9]{64}$/.test(e.sha256)||e.source!==SOURCE||
       e.priceMode!==PRICE_MODE)fail('DELTA_MANIFEST_ENTRY_INVALID');
    const real=fs.realpathSync(path.join(home,...e.path.split('/')));
    if(!within(home,real)||sha(fs.readFileSync(real))!==e.sha256)fail('DELTA_RAW_SHA_MISMATCH');
    paths.add(e.path);
  }
  const lookup=new Map(manifest.files.map(e=>[e.path,e]));
  for(const symbol of symbols){
    const p=state.symbols[symbol];
    if(!Array.isArray(p.files)||p.files.some(x=>lookup.get(x.path)?.sha256!==x.sha256||
      lookup.get(x.path)?.symbol!==symbol)||
      (p.complete&&!p.files.length&&!p.noBars))fail('DELTA_CHECKPOINT_FILES_INVALID');
  }
  return {manifestFile,manifest,stateFile,state};
}
async function bodyLimited(response){
  const declared=Number(response.headers.get('content-length'));
  if(Number.isFinite(declared)&&declared>MAX_BODY_BYTES)fail('BODY_TOO_LARGE');
  if(!response.body)return Buffer.alloc(0);
  const chunks=[];let size=0;
  for await(const piece of response.body){size+=piece.byteLength;
    if(size>MAX_BODY_BYTES)fail('BODY_TOO_LARGE');chunks.push(Buffer.from(piece));}
  return Buffer.concat(chunks);
}
function validatePage(bytes,symbol,after) {
  const lines=bytes.toString('utf8').split(/\r?\n/).filter(Boolean);
  if(lines.length>PAGE_LIMIT)fail('PAGE_TOO_MANY_BARS');
  let prev=after,lastValidNY=null,nonGap=0,gaps=0;
  for(const line of lines){
    let row;try{row=JSON.parse(line);}catch{fail('PAGE_NOT_JSONL');}
    const ts=row?.timestamp;
    if(row.symbol!==symbol||typeof ts!=='string'||
       !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(ts)||
       Number.isNaN(Date.parse(ts))||(prev&&ts<=prev))fail('PAGE_BAR_IDENTITY');
    prev=ts;
    if(row.is_gap===true){gaps++;continue;}
    if(['open','high','low','close'].some(k=>!Number.isFinite(row[k])||row[k]<=0)||
       row.high<row.low||row.open>row.high||row.open<row.low||
       row.close>row.high||row.close<row.low||
       !Number.isFinite(row.volume)||row.volume<0)fail('PAGE_OHLCV_INVALID');
    nonGap++;lastValidNY=nyDay(ts);
  }
  return {rows:lines.length,nonGap,gaps,firstTimestamp:lines.length?JSON.parse(lines[0]).timestamp:null,
    lastTimestamp:prev,lastValidNY};
}

export async function collectNineR35Delta({dataRoot,rosterPath,start,end,previousWindow=null,fetchImpl=fetch,
  maxRequests=MAX_GETS,timeoutMs=REQUEST_TIMEOUT_MS}={}) {
  if(!dateOK(start)||!dateOK(end)||start>end||!Number.isInteger(maxRequests)||
     maxRequests<1||maxRequests>MAX_GETS||!Number.isInteger(timeoutMs)||timeoutMs<1||
     timeoutMs>REQUEST_TIMEOUT_MS)fail('ARGUMENTS');
  const base=auditNineR34RefreshPreflight({dataRoot,rosterPath});
  if(end<=start)fail('WINDOW_MUST_OVERLAP_VERIFIED_SPY');
  const rawRoster=fs.readFileSync(rosterPath);
  const roster=JSON.parse(rawRoster.toString('utf8'));
  const symbols=['SPY',...[...new Set(roster.groups.flatMap(g=>g.tickers.map(t=>t.ticker)))]
    .filter(s=>s!=='SPY').sort((a,b)=>a.localeCompare(b))];
  if(symbols.length!==64||sha(rawRoster)!==base.rosterSha256)fail('ROSTER_DRIFT');
  const root=fs.realpathSync(dataRoot);
  let freshnessDay=base.latestSpyNYDay;
  if(previousWindow!==null){
    if(!previousWindow||!dateOK(previousWindow.start)||!dateOK(previousWindow.end)||
       previousWindow.end>=end)fail('CHAIN_WINDOW_INVALID');
    const prevHome=path.join(root,DELTA_SUBDIR);
    if(!fs.existsSync(prevHome))fail('CHAIN_PREVIOUS_ROOT_MISSING');
    const actual=fs.realpathSync(prevHome);
    if(!within(root,actual))fail('CHAIN_PREVIOUS_ROOT_ESCAPE');
    const prev=metadata(actual,base.rosterSha256,previousWindow.start,previousWindow.end,symbols);
    if(prev.state.failedAt||symbols.some(s=>prev.state.symbols[s].complete!==true))
      fail('CHAIN_PREVIOUS_INCOMPLETE');
    const refs=new Map(prev.manifest.files.map(e=>[e.path,e]));
    const spyPages=prev.state.symbols.SPY.files.map(f=>refs.get(f.path));
    const last=spyPages.at(-1);
    freshnessDay=last?.lastVerifiedNYDay;
    if(!dateOK(freshnessDay)||freshnessDay<=base.latestSpyNYDay||
       freshnessDay>previousWindow.end||start!==freshnessDay)
      fail('CHAIN_VERIFIED_SPY_OVERLAP_MISMATCH');
  }else if(start!==base.suggestedOverlapStartNYDay){
    fail('WINDOW_MUST_OVERLAP_VERIFIED_SPY');
  }
  const report={contract:'THEME_NINE_R35_INCREMENTAL_PRIVATE_V1',status:'RUNNING',
    start,end,source:SOURCE,baseLastSpyNYDay:base.latestSpyNYDay,
    previousVerifiedSpyNYDay:freshnessDay,
    providerCalls:0,rawFilesStored:0,completedSymbols:0,
    baseRawWrites:0,dbWrites:0,d1Writes:0,schedulerWrites:0,publicationWrites:0};
  // Source freshness: one SPY GET before making any new persistent root.
  const existingHome=path.join(root,DELTA_SUBDIR);
  const hasDelta=fs.existsSync(existingHome);
  let home=null;
  let stateInfo=null;
  if(hasDelta){home=fs.realpathSync(existingHome);if(!within(root,home))fail('DELTA_ROOT_SYMLINK');
    stateInfo=metadata(home,base.rosterSha256,start,end,symbols);
    if(stateInfo.state.failedAt){report.status='STOP_PREVIOUS_FAILURE_REVIEW_REQUIRED';
      report.failure=stateInfo.state.failure;return report;}
    if(symbols.every(s=>stateInfo.state.symbols[s].complete)){
      report.status='R35_DELTA_ALREADY_COLLECTED';report.completedSymbols=64;return report;}
  }
  const probeNeeded=!stateInfo?.state.symbols.SPY.files.length;
  let firstSpy=null;
  if(probeNeeded){
    firstSpy=await requestPage({symbol:'SPY',start,end,cursor:null,after:null,
      fetchImpl,timeoutMs});report.providerCalls++;
    if(firstSpy.error){report.status=firstSpy.error;return report;}
    if(!firstSpy.next&&(!firstSpy.page.lastValidNY||
      firstSpy.page.lastValidNY<=freshnessDay)){
      report.status='WAIT_SOURCE_NO_NEW_VERIFIED_SPY_SESSION';
      report.latestSeenSpyNYDay=firstSpy.page.lastValidNY;
      return report;
    }
  }
  if(!home){home=dir(root,DELTA_SUBDIR);dir(home,'raw');dir(home,'state');
    stateInfo=metadata(home,base.rosterSha256,start,end,symbols);}
  const lock=path.join(home,'state','delta.lock');
  let lockFd;try{lockFd=fs.openSync(lock,'wx');}catch(e){if(e.code==='EEXIST')fail('DELTA_LOCK_EXISTS');throw e;}
  fs.closeSync(lockFd);
  try {
    const {manifestFile,manifest,stateFile,state}=stateInfo;
    for(const symbol of symbols){
      const p=state.symbols[symbol];
      while(!p.complete&&report.providerCalls<maxRequests){
        // A probe has already spent one budgeted GET and its exact body is reused.
        let pageResult;
        if(symbol==='SPY'&&firstSpy){pageResult=firstSpy;firstSpy=null;}
        else {state.failedAt=new Date().toISOString();state.failure='REQUEST_OUTCOME_UNKNOWN';
          writeJSON(stateFile,state);
          pageResult=await requestPage({symbol,start,end,cursor:p.cursor,after:p.lastTimestamp,
            fetchImpl,timeoutMs});report.providerCalls++;}
        if(pageResult.error){state.failedAt=new Date().toISOString();
          state.failure=pageResult.error;writeJSON(stateFile,state);
          report.status=pageResult.error;report.failedSymbol=symbol;return report;}
        const {bytes,page,next,url}=pageResult;
        if((next&&(!page.rows||next===p.cursor))||(!page.rows&&p.pages>0)){
          state.failedAt=new Date().toISOString();state.failure='STOP_PAGINATION_CONFLICT';
          writeJSON(stateFile,state);report.status=state.failure;return report;}
        if(page.rows){
          const digest=sha(bytes),relative=`raw/${symbol}_${digest}.jsonl`;
          const target=path.join(home,...relative.split('/'));
          if(!fs.existsSync(target))fs.writeFileSync(target,bytes,{flag:'wx'});
          if(sha(fs.readFileSync(target))!==digest)fail('DELTA_RAW_READBACK');
          const entry={path:relative,sha256:digest,symbol,source:SOURCE,
            requestedUrl:url,rows:page.rows,nonGapRows:page.nonGap,gapRows:page.gaps,
            firstTimestampUTC:page.firstTimestamp,lastTimestampUTC:page.lastTimestamp,
            lastVerifiedNYDay:page.lastValidNY,priceMode:PRICE_MODE,
            schemaVersion:'GMH_1H_OHLCV_NDJSON_R35',
            collectedAt:new Date().toISOString()};
          if(!manifest.files.some(e=>e.path===relative))manifest.files.push(entry);
          writeJSON(manifestFile,manifest);
          if(!p.files.some(e=>e.path===relative))p.files.push({path:relative,sha256:digest,
            requestedUrl:url});
          report.rawFilesStored++;
        }else p.noBars=true;
        p.lastTimestamp=page.lastTimestamp;
        p.cursor=next||null;p.pages++;p.complete=!next;
        delete state.failedAt;delete state.failure;
        writeJSON(stateFile,state);
      }
      if(report.providerCalls>=maxRequests)break;
    }
    report.completedSymbols=symbols.filter(s=>state.symbols[s].complete).length;
    report.pendingSymbols=symbols.length-report.completedSymbols;
    report.status=report.completedSymbols===64?'R35_DELTA_PRIVATE_COLLECTION_COMPLETE':
      'R35_DELTA_CHECKPOINT_READY_TO_RESUME';
    return report;
  } finally {fs.unlinkSync(lock);}
}

async function requestPage({symbol,start,end,cursor,after,fetchImpl,timeoutMs}){
  const url=new URL(`/api/v1/bars/stocks/${symbol}/1h`,SOURCE);
  const params={start,end,limit:String(PAGE_LIMIT),format:'jsonl',
    columns:'timestamp,symbol,open,high,low,close,volume,is_gap'};
  for(const [k,v] of Object.entries(params))url.searchParams.set(k,v);
  if(cursor)url.searchParams.set('cursor',cursor);
  let response;
  try{response=await fetchImpl(url,{redirect:'error',signal:AbortSignal.timeout(timeoutMs)});}
  catch{return {error:'STOP_NETWORK_OR_TIMEOUT'};}
  if(!response.ok)return {error:'STOP_HTTP_'+response.status};
  let bytes,page;
  try{bytes=await bodyLimited(response);page=validatePage(bytes,symbol,after);}
  catch{return {error:'STOP_RESPONSE_OR_INVALID_BARS'};}
  return {bytes,page,next:response.headers.get('x-next-cursor'),url:url.toString()};
}

export async function collectNineR35Auto({sleep=ms=>new Promise(r=>setTimeout(r,ms)),
  maxBatches=MAX_BATCHES,...args}={}){
  if(!Number.isInteger(maxBatches)||maxBatches<1||maxBatches>MAX_BATCHES)fail('BATCH_ARGUMENTS');
  let calls=0,stored=0,batches=0,report;
  for(;batches<maxBatches;batches++){
    report=await collectNineR35Delta(args);calls+=report.providerCalls;
    stored+=report.rawFilesStored;
    if(report.status!=='R35_DELTA_CHECKPOINT_READY_TO_RESUME')break;
    if(batches+1<maxBatches)await sleep(BATCH_PAUSE_MS);
  }
  return {...report,totalProviderCalls:calls,totalRawFilesStored:stored,batches:batches+1};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    const [mode,start,end,extra]=process.argv.slice(2);
    if(extra||!['--collect','--collect-auto'].includes(mode))fail('USAGE');
    const dataRoot=process.env.ZGMINI_DATA_ROOT||'E:/ZGmini/data';
    const rosterPath=path.join(path.dirname(fileURLToPath(import.meta.url)),
      'theme-nine-r20-approved-candidates.json');
    const result=mode==='--collect'?await collectNineR35Delta({dataRoot,rosterPath,start,end}):
      await collectNineR35Auto({dataRoot,rosterPath,start,end});
    process.stdout.write(JSON.stringify(result,null,2)+'\n');
    if(result.status.startsWith('STOP'))process.exitCode=2;
  }catch(e){process.stderr.write(JSON.stringify({status:'STOP_R35_DELTA',
    error:e.code||'UNEXPECTED_ERROR',message:e.code?undefined:e.message})+'\n');
    process.exitCode=1;}
}
