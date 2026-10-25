// R7 NASA-only bounded collection. Reuse all existing UFO and SPY PC raw files.
// Never score, publish, modify other themes, install a scheduler, or retry errors.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const symbol='NASA';
const scope='SPACE_NASA_ONLY_R7';
const nyDate=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'});
const validDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
const atomic=(file,value)=>{const tmp=file+'.'+process.pid+'.tmp';fs.writeFileSync(tmp,JSON.stringify(value,null,2)+'\n',{flag:'wx'});try{fs.renameSync(tmp,file)}finally{if(fs.existsSync(tmp))fs.unlinkSync(tmp)}};
function ensureDir(root,relative){const base=fs.realpathSync(root),dest=path.join(base,relative);fs.mkdirSync(dest,{recursive:true});const actual=fs.realpathSync(dest),rel=path.relative(base,actual);if(path.isAbsolute(rel)||rel==='..'||rel.startsWith('..'+path.sep))throw Error('ROOT_ESCAPE');return actual;}

export async function collectNASA({dataRoot,start,end,maxRequests=4,fetchImpl=fetch,now=()=>new Date().toISOString()}={}){
 if(!dataRoot||!validDate(start)||!validDate(end)||start>end||!Number.isInteger(maxRequests)||maxRequests<1||maxRequests>4)throw Error('COLLECTION_ARGUMENTS');
 const home=ensureDir(dataRoot,'themes/space-satellite'),raw=ensureDir(home,'raw'),stateDir=ensureDir(home,'state');
 const stateFile=path.join(stateDir,'collection-nasa-r7-'+hash(JSON.stringify({scope,start,end})).slice(0,16)+'.json');
 const lock=path.join(stateDir,'collection.lock'),manifestFile=path.join(home,'raw-manifest.json');
 const report={scope,symbol,status:'RUNNING',providerCalls:0,rawFilesStored:0,publicWrites:0,d1Writes:0,schedulerWrites:0};
 const lockFd=fs.openSync(lock,'wx');fs.writeSync(lockFd,JSON.stringify({pid:process.pid,at:now()}));fs.closeSync(lockFd);
 try{
  const stateExists=fs.existsSync(stateFile);
  const state=stateExists?JSON.parse(fs.readFileSync(stateFile,'utf8')):{version:1,scope,start,end,complete:false,cursor:null,pages:0,files:[]};
  if(state.version!==1||state.scope!==scope||state.start!==start||state.end!==end||!Array.isArray(state.files))throw Error('CHECKPOINT_IDENTITY');
  const manifest=fs.existsSync(manifestFile)?JSON.parse(fs.readFileSync(manifestFile,'utf8')):{version:1,themeId:'space-satellite',files:[]};
  if(manifest.version!==1||manifest.themeId!=='space-satellite'||!Array.isArray(manifest.files))throw Error('MANIFEST_IDENTITY');
  // Existing NASA from an earlier attempt must be inspected, never collected over silently.
  if(!stateExists&&manifest.files.some(f=>/^raw\/NASA_[a-f0-9]{64}\.jsonl$/.test(f.path))){report.status='STOP_NASA_RAW_ALREADY_PRESENT_REVIEW';return report;}
  if(state.failedAt){report.status='STOP_PREVIOUS_FAILURE_REVIEW_REQUIRED';return report;}
  for(const file of state.files){
   if(!/^raw\/NASA_[a-f0-9]{64}\.jsonl$/.test(file.path)||hash(fs.readFileSync(path.join(home,file.path)))!==file.sha256||!manifest.files.some(f=>f.path===file.path&&f.sha256===file.sha256))throw Error('CHECKPOINT_RAW_HASH');
  }
  while(!state.complete&&report.providerCalls<maxRequests){
   const url=new URL('https://getmarkethistory.com/api/v1/bars/stocks/NASA/1h');
   for(const [key,value] of Object.entries({start,end,limit:'5000',format:'jsonl',columns:'timestamp,close,symbol,is_gap'}))url.searchParams.set(key,value);
   if(state.cursor)url.searchParams.set('cursor',state.cursor);
   const requestedAt=now();report.providerCalls++;
   state.failedAt=requestedAt;state.reason='REQUEST_NOT_COMMITTED';atomic(stateFile,state);
   let res;
   try{res=await fetchImpl(url,{headers:{accept:'application/x-ndjson'},signal:AbortSignal.timeout(23000),redirect:'error'});}
   catch{state.reason='NETWORK_OR_TIMEOUT';atomic(stateFile,state);report.status='STOP_NETWORK_OR_TIMEOUT';return report;}
   if(!res.ok){state.reason='HTTP_'+res.status;atomic(stateFile,state);report.status='STOP_HTTP_'+res.status;return report;}
   if(Number(res.headers.get('content-length')??0)>6_000_000)throw Error('BODY_LIMIT');
   const chunks=[];let size=0;
   for await(const chunk of res.body){size+=chunk.byteLength;if(size>6_000_000)throw Error('BODY_LIMIT');chunks.push(Buffer.from(chunk));}
   const body=Buffer.concat(chunks).toString('utf8');
   const rows=body.split(/\r?\n/).filter(Boolean).map(JSON.parse);
   if(!rows.length||rows.length>5000)throw Error('ROW_COUNT');
   let previous='';
   for(const row of rows){if(row.symbol!==symbol||!Number.isFinite(Date.parse(row.timestamp))||typeof row.close!=='number'||!Number.isFinite(row.close)||row.close<=0||(previous&&row.timestamp<=previous))throw Error('BAR_INVALID');previous=row.timestamp;}
   const digest=hash(body),relative='raw/NASA_'+digest+'.jsonl',dest=path.join(raw,'NASA_'+digest+'.jsonl');
   if(!fs.existsSync(dest))fs.writeFileSync(dest,body,{flag:'wx'});
   if(hash(fs.readFileSync(dest))!==digest)throw Error('RAW_READBACK');
   const dates=rows.map(row=>nyDate.format(new Date(row.timestamp))).sort();
   const entry={path:relative,sha256:digest,source:'https://getmarkethistory.com',collectedAt:requestedAt,observationFrom:dates[0],observationThrough:dates.at(-1),priceMode:'RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE',schemaVersion:'GMH_NDJSON_1H_COLUMNS_V1'};
   const prior=manifest.files.find(file=>file.path===relative);
   if(prior&&prior.sha256!==digest)throw Error('MANIFEST_CONFLICT');
   if(!prior)manifest.files.push(entry);
   atomic(manifestFile,manifest);
   const next=res.headers.get('x-next-cursor');
   if(next&&next===state.cursor)throw Error('CURSOR_NOT_ADVANCING');
   if(!state.files.some(f=>f.path===relative))state.files.push({path:relative,sha256:digest});
   state.pages++;state.complete=!next;state.cursor=next;
   delete state.failedAt;delete state.reason;atomic(stateFile,state);report.rawFilesStored++;
  }
  report.status=state.complete?'PRIVATE_NASA_RAW_COLLECTION_COMPLETE':'CHECKPOINT_READY_TO_RESUME';
  report.pages=state.pages;report.complete=state.complete;return report;
 }finally{fs.unlinkSync(lock);}
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [mode,themeId,start,end]=process.argv.slice(2);
 if(mode!=='--collect'||themeId!=='space-satellite'||!validDate(start)||!validDate(end))console.log('READ_ONLY_DEFAULT: --collect space-satellite YYYY-MM-DD YYYY-MM-DD; NASA only, max 4 GETs per manual run.');
 else try{const report=await collectNASA({dataRoot:process.env.ZGMINI_DATA_ROOT??'E:/ZGmini/data',start,end});console.log(JSON.stringify(report));if(report.status.startsWith('STOP'))process.exitCode=2;}
 catch(error){console.error('NASA_R7_COLLECTION_STOP_REVIEW',error?.message??'UNKNOWN');process.exitCode=1;}
}
