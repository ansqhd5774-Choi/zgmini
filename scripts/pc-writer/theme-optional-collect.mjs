// Explicit, bounded private collection. Never scores, publishes, changes tasks or reads secrets.
import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';
const hash=b=>createHash('sha256').update(b).digest('hex');
const pairs={'ai-semiconductor':['SMH','SOXX','SPY'],biotech:['IBB','XBI','SPY']};
const nyDate=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'});
const validDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
const atomic=(f,v)=>{const tmp=f+'.'+process.pid+'.tmp';fs.writeFileSync(tmp,JSON.stringify(v,null,2)+'\n',{flag:'wx'});try{fs.renameSync(tmp,f)}finally{if(fs.existsSync(tmp))fs.unlinkSync(tmp)}};
function ensureDir(root,relative){const base=fs.realpathSync(root),dest=path.join(base,relative);fs.mkdirSync(dest,{recursive:true});const actual=fs.realpathSync(dest),rel=path.relative(base,actual);if(path.isAbsolute(rel)||rel==='..'||rel.startsWith('..'+path.sep))throw Error('ROOT_ESCAPE');return actual;}
export async function collectOptional({dataRoot,themeId,start,end,maxRequests=4,fetchImpl=fetch,now=()=>new Date().toISOString()}={}){
 if(!pairs[themeId]||!validDate(start)||!validDate(end)||start>end||!Number.isInteger(maxRequests)||maxRequests<1||maxRequests>4)throw Error('COLLECTION_ARGUMENTS');
 const home=ensureDir(dataRoot,'themes/'+themeId),raw=ensureDir(home,'raw'),stateDir=ensureDir(home,'state');
 const key=hash(JSON.stringify({themeId,start,end})).slice(0,16),stateFile=path.join(stateDir,'collection-'+key+'.json'),lock=path.join(stateDir,'collection.lock');
 const manifestFile=path.join(home,'raw-manifest.json');
 const report={themeId,status:'RUNNING',providerCalls:0,rawFilesStored:0,publicWrites:0,d1Writes:0,schedulerWrites:0};
 const lockFd=fs.openSync(lock,'wx');fs.writeSync(lockFd,JSON.stringify({pid:process.pid,at:now()}));fs.closeSync(lockFd);
 try{
  const state=fs.existsSync(stateFile)?JSON.parse(fs.readFileSync(stateFile,'utf8')):{version:1,themeId,start,end,symbols:Object.fromEntries(pairs[themeId].map(s=>[s,{complete:false,cursor:null,pages:0,files:[]}]))};
  if(state.version!==1||state.themeId!==themeId||state.start!==start||state.end!==end||pairs[themeId].some(s=>!state.symbols[s]))throw Error('CHECKPOINT_IDENTITY');
  if(state.failedAt){report.status='STOP_PREVIOUS_FAILURE_REVIEW_REQUIRED';return report;}
  let manifest=fs.existsSync(manifestFile)?JSON.parse(fs.readFileSync(manifestFile,'utf8')):{version:1,themeId,files:[]};
  if(manifest.version!==1||manifest.themeId!==themeId||!Array.isArray(manifest.files))throw Error('MANIFEST_IDENTITY');
  // Previously committed page files must remain intact before resuming.
  for(const s of pairs[themeId])for(const f of state.symbols[s].files){if(!/^raw\/[A-Z]+_[a-f0-9]{64}\.jsonl$/.test(f.path)||hash(fs.readFileSync(path.join(home,f.path)))!==f.sha256)throw Error('CHECKPOINT_RAW_HASH');}
  for(const symbol of pairs[themeId]){
   const checkpoint=state.symbols[symbol];
   while(!checkpoint.complete&&report.providerCalls<maxRequests){
    const url=new URL('https://getmarkethistory.com/api/v1/bars/stocks/'+symbol+'/1h');
    for(const [k,v] of Object.entries({start,end,limit:'5000',format:'jsonl',columns:'timestamp,close,symbol,is_gap'}))url.searchParams.set(k,v);
    if(checkpoint.cursor)url.searchParams.set('cursor',checkpoint.cursor);
    const requestedAt=now();report.providerCalls++;
    // Persist the attempt before sending: crashes cannot silently create unlimited retries.
    state.failedAt=requestedAt;state.reason='REQUEST_NOT_COMMITTED';atomic(stateFile,state);
    let res;try{res=await fetchImpl(url,{headers:{accept:'application/x-ndjson'},signal:AbortSignal.timeout(23000),redirect:'error'});}catch{state.reason='NETWORK_OR_TIMEOUT';atomic(stateFile,state);report.status='STOP_NETWORK_OR_TIMEOUT';return report;}
    if(!res.ok){state.reason='HTTP_'+res.status;atomic(stateFile,state);report.status='STOP_HTTP_'+res.status;return report;}
    if(Number(res.headers.get('content-length')??0)>6_000_000)throw Error('BODY_LIMIT');
    const chunks=[];let size=0;for await(const chunk of res.body){size+=chunk.byteLength;if(size>6_000_000)throw Error('BODY_LIMIT');chunks.push(Buffer.from(chunk));}
    const body=Buffer.concat(chunks).toString('utf8');
    const rows=body.split(/\r?\n/).filter(Boolean).map(JSON.parse);if(!rows.length||rows.length>5000)throw Error('ROW_COUNT');
    let previous='';for(const row of rows){if(row.symbol!==symbol||!Number.isFinite(Date.parse(row.timestamp))||typeof row.close!=='number'||!Number.isFinite(row.close)||row.close<=0||previous&&row.timestamp<=previous)throw Error('BAR_INVALID');previous=row.timestamp;}
    const digest=hash(body),relative='raw/'+symbol+'_'+digest+'.jsonl',dest=path.join(raw,symbol+'_'+digest+'.jsonl');
    if(!fs.existsSync(dest))fs.writeFileSync(dest,body,{flag:'wx'});if(hash(fs.readFileSync(dest))!==digest)throw Error('RAW_READBACK');
    const dates=rows.map(r=>nyDate.format(new Date(r.timestamp))).sort();
    const entry={path:relative,sha256:digest,source:'https://getmarkethistory.com',collectedAt:requestedAt,observationFrom:dates[0],observationThrough:dates.at(-1),priceMode:'RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE',schemaVersion:'GMH_NDJSON_1H_COLUMNS_V1'};
    const prior=manifest.files.find(f=>f.path===relative);if(prior&&prior.sha256!==digest)throw Error('MANIFEST_CONFLICT');if(!prior)manifest.files.push(entry);atomic(manifestFile,manifest);
    const next=res.headers.get('x-next-cursor');if(next&&next===checkpoint.cursor)throw Error('CURSOR_NOT_ADVANCING');
    checkpoint.files.push({path:relative,sha256:digest});checkpoint.pages++;checkpoint.complete=!next;checkpoint.cursor=next;delete state.failedAt;delete state.reason;atomic(stateFile,state);report.rawFilesStored++;
   }
  }
  report.status=pairs[themeId].every(s=>state.symbols[s].complete)?'PRIVATE_RAW_COLLECTION_COMPLETE':'CHECKPOINT_READY_TO_RESUME';
  report.symbols=Object.fromEntries(pairs[themeId].map(s=>[s,{complete:state.symbols[s].complete,pages:state.symbols[s].pages}]));return report;
 }finally{fs.unlinkSync(lock);}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [mode,themeId,start,end]=process.argv.slice(2);
 if(mode!=='--collect'||!pairs[themeId]||!validDate(start)||!validDate(end)){console.log('READ_ONLY_DEFAULT: --collect <ai-semiconductor|biotech> <YYYY-MM-DD> <YYYY-MM-DD>; max 4 GETs per run, resume exact dates.');}
 else try{const report=await collectOptional({dataRoot:process.env.ZGMINI_DATA_ROOT??'E:/ZGmini/data',themeId,start,end});console.log(JSON.stringify(report));if(report.status.startsWith('STOP'))process.exitCode=2;}catch{console.error('OPTIONAL_COLLECTION_STOP_CHECK_LOCAL_CHECKPOINT');process.exitCode=1;}
}
