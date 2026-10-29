// R51: bounded Alpaca price evidence for the existing market-calendar ticker set.
// Isolated local raw responses and derived rows only. No R10, SQLite, D1, stars or schedules are changed.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {fileURLToPath} from 'node:url';
import {parseCalendar} from './market-calendar-r48-quality-readonly.mjs';
import {scanCachedPrices} from './market-calendar-r50-bulk-facts-readonly.mjs';
import {loadLocalProviders} from './local-env.mjs';

const FEED_KEY='market-calendar:earnings-display-html';
const COLLECTION='market-calendar-r51-alpaca';
const BATCH_SIZE=120, GROUP_SIZE=40, MAX_PAGES=12, MAX_RESPONSE_BYTES=4*1024*1024;
const S='R51_MARKET_CALENDAR_PRICE_V1';
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const kstDay=()=>new Date(Date.now()+9*3600_000).toISOString().slice(0,10);
const validDay=d=>typeof d==='string'&&/^20\d{2}-\d{2}-\d{2}$/.test(d)&&!Number.isNaN(Date.parse(d+'T00:00:00Z'))&&new Date(d+'T00:00:00Z').toISOString().slice(0,10)===d;
const shiftDay=(d,n)=>new Date(Date.parse(d+'T00:00:00Z')+n*86400000).toISOString().slice(0,10);
const validTicker=s=>typeof s==='string'&&/^[A-Z0-9.-]{1,12}$/.test(s);
const readJson=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const planDigest=plan=>sha(JSON.stringify(plan));
const makeDir=p=>fs.mkdirSync(p,{recursive:true});
const localDir=pcHome=>path.join(pcHome,COLLECTION);
const noSymbolReport=({status,asOf,other={}})=>({status,asOf,providerRequests:0,dbWrites:0,d1Writes:0,productionStarsChanged:false,publicDisplayRightsVerified:false,...other});

function writeOnce(file,body){
 if(fs.existsSync(file))throw Error('R51_TARGET_ALREADY_EXISTS_STOP');
 const staged=`${file}.part-${process.pid}`;
 fs.writeFileSync(staged,body,{flag:'wx',encoding:'utf8'});
 if(fs.readFileSync(staged,'utf8')!==body)throw Error('R51_READBACK_FAILED');
 if(fs.existsSync(file))throw Error('R51_TARGET_ALREADY_EXISTS_STOP');
 fs.renameSync(staged,file);
 if(fs.readFileSync(file,'utf8')!==body)throw Error('R51_READBACK_FAILED');
}
function verifyPlan(plan){
 if(plan?.schema!==S||!validDay(plan.asOf)||!validDay(plan.start)||!validDay(plan.end)||plan.end!==shiftDay(plan.asOf,-1)||plan.start!==shiftDay(plan.asOf,-14)||plan.feed!=='iex'||plan.adjustment!=='split'||!Array.isArray(plan.tickers)||plan.tickers.length>5000||!plan.tickers.every(validTicker)||new Set(plan.tickers).size!==plan.tickers.length||plan.tickers.some((v,i)=>i&&v<=plan.tickers[i-1]))throw Error('R51_PLAN_CONTRACT_INVALID');
 return plan;
}
function loadPlan(directory){
 const file=path.join(directory,'plan.json');
 const wrapped=readJson(file);
 verifyPlan(wrapped.plan);
 if(wrapped.sha256!==planDigest(wrapped.plan))throw Error('R51_PLAN_HASH_MISMATCH');
 return wrapped;
}
export function readMissingUniverse({pcHome,asOf=kstDay()}={}){
 if(!validDay(asOf))throw Error('R51_ASOF_INVALID');
 const dbFile=path.join(pcHome,'storage','core.sqlite');
 const db=new DatabaseSync(dbFile,{readOnly:true});let calendar;
 try{
  db.exec('PRAGMA query_only=ON');
  const row=db.prepare("SELECT body FROM public_feed_snapshots_v1 WHERE kind='output' AND feed_key=? AND snapshot_key='current'").get(FEED_KEY);
  if(!row)throw Error('R51_CALENDAR_MISSING');
  calendar=parseCalendar(row.body);
 }finally{db.close();}
 const prices=scanCachedPrices(path.join(pcHome,'asset-r10-alpaca','incremental'),calendar.tickers,asOf);
 if(prices.status!=='ALL_MATCHING_FILES_SCANNED')throw Error('R51_EXISTING_PRICES_INCOMPLETE');
 if(prices.conflicts.size)throw Error('R51_EXISTING_PRICE_CONFLICT');
 const missing=[...calendar.tickers].filter(s=>!prices.latest.has(s)).sort();
 const plan=verifyPlan({schema:S,asOf,start:shiftDay(asOf,-14),end:shiftDay(asOf,-1),feed:'iex',adjustment:'split',tickers:missing});
 return {plan,calendarTickers:calendar.tickers.size,cachedTickers:prices.latest.size,priceFiles:prices.readFiles,sourceCheckedAt:calendar.checkedAt};
}
export function preflight({pcHome,asOf=kstDay()}={}){
 if(!pcHome||!fs.existsSync(pcHome))throw Error('R51_PC_HOME_ABSENT');
 const destination=localDir(pcHome),file=path.join(destination,'plan.json');
 if(fs.existsSync(path.join(destination,'run.lock')))throw Error('R51_CONCURRENT_RUN_STOP');
 if(fs.existsSync(file)){
  const existing=loadPlan(destination);
  return noSymbolReport({status:'R51_EXISTING_PLAN_VALID',asOf:existing.plan.asOf,other:{missingTickerCount:existing.plan.tickers.length,planSha256:existing.sha256,batchCount:Math.ceil(existing.plan.tickers.length/BATCH_SIZE),note:'NO_PROVIDER_REQUESTS; NO_NEW_PLAN'}});
 }
 if(fs.existsSync(destination))throw Error('R51_STAGE_DIRECTORY_ALREADY_EXISTS_STOP');
 const data=readMissingUniverse({pcHome,asOf});
 const env=loadLocalProviders(pcHome);
 if(!env.APCA_API_KEY_ID||!env.APCA_API_SECRET_KEY)throw Error('R51_CREDENTIALS_UNAVAILABLE');
 makeDir(destination);
 const digest=planDigest(data.plan);writeOnce(file,JSON.stringify({sha256:digest,plan:data.plan}));
 const check=loadPlan(destination);if(check.sha256!==digest)throw Error('R51_PLAN_READBACK_FAILED');
 return noSymbolReport({status:'R51_PLAN_STAGED',asOf,other:{calendarTickerCount:data.calendarTickers,cachedPriceTickerCount:data.cachedTickers,missingTickerCount:data.plan.tickers.length,priceFilesScanned:data.priceFiles,batchCount:Math.ceil(data.plan.tickers.length/BATCH_SIZE),planSha256:digest,sourceCheckedAt:data.sourceCheckedAt,note:'LOCAL_NEW_FOLDER_ONLY; NO_PUBLIC_CAP_OR_STARS'}});
}

function parsePage(body,symbols,plan){
 const data=JSON.parse(body),wanted=new Set(symbols);
 if(!data||!data.bars||typeof data.bars!=='object'||Array.isArray(data.bars)||Object.keys(data.bars).length>symbols.length||data.next_page_token!==null&&data.next_page_token!==undefined&&(typeof data.next_page_token!=='string'||data.next_page_token.length>2048))throw Error('R51_PROVIDER_SCHEMA_INVALID');
 const rows=[];
 for(const [symbol,bars]of Object.entries(data.bars)){
  if(!wanted.has(symbol)||!Array.isArray(bars)||bars.length>1500)throw Error('R51_PROVIDER_SYMBOL_INVALID');
  for(const b of bars){
   if(typeof b?.t!=='string'||!/^20\d{2}-\d{2}-\d{2}T/.test(b.t)||!validDay(b.t.slice(0,10))||b.t.slice(0,10)<plan.start||b.t.slice(0,10)>plan.end||!Number.isFinite(b.c)||b.c<=0||!Number.isFinite(b.v)||b.v<0)throw Error('R51_PROVIDER_BAR_INVALID');
   rows.push({ticker:symbol,tradeDate:b.t.slice(0,10),currentClose:b.c,currentVolume:b.v,source:'ALPACA',feed:'iex',adjustmentStatus:'split'});
  }
 }
 return {rows,token:data.next_page_token||null};
}
async function readGroup({directory,batchIndex,groupIndex,symbols,plan,fetchImpl,wait,headers,counters}){
 const raw=path.join(directory,'raw');makeDir(raw);
 let page=0,token=null;const tokens=new Set(),latest=new Map();
 do{
  if(page>=MAX_PAGES)throw Error('R51_PAGINATION_BUDGET_STOP');
  const file=path.join(raw,`batch-${String(batchIndex).padStart(4,'0')}-group-${groupIndex}-page-${page}.json`);
  let body;
  if(fs.existsSync(file)){
   body=fs.readFileSync(file,'utf8');if(Buffer.byteLength(body)>MAX_RESPONSE_BYTES)throw Error('R51_STORED_PAGE_TOO_LARGE');
   counters.reusedPages++;
  }else{
   if(counters.requests>=MAX_PAGES)throw Error('R51_REQUEST_BUDGET_STOP');
   if(counters.requests>0)await wait(800);
   const url=new URL('https://data.alpaca.markets/v2/stocks/bars');
   url.search=new URLSearchParams({symbols:symbols.join(','),timeframe:'1Day',start:plan.start+'T00:00:00Z',end:plan.end+'T23:59:59Z',feed:'iex',adjustment:'split',limit:'10000',...(token?{page_token:token}:{})});
   counters.requests++;
   const response=await fetchImpl(url,{headers,signal:AbortSignal.timeout(20000),redirect:'error'});
   if(!response.ok)throw Error(`R51_PROVIDER_HTTP_${Number(response.status)||0}`);
   const length=Number(response.headers?.get?.('content-length')||0);
   if(length>MAX_RESPONSE_BYTES)throw Error('R51_RESPONSE_TOO_LARGE');
   body=await response.text();
   if(Buffer.byteLength(body)>MAX_RESPONSE_BYTES)throw Error('R51_RESPONSE_TOO_LARGE');
   parsePage(body,symbols,plan); // reject invalid provider data before creating evidence
   writeOnce(file,body);counters.newPages++;
  }
  const result=parsePage(body,symbols,plan);
  for(const row of result.rows){
   const prior=latest.get(row.ticker);
   if(prior?.tradeDate===row.tradeDate&&prior.currentClose!==row.currentClose)throw Error('R51_PRICE_CONFLICT_STOP');
   if(!prior||row.tradeDate>prior.tradeDate)latest.set(row.ticker,row);
  }
  token=result.token;
  if(token){if(tokens.has(token))throw Error('R51_PAGINATION_CYCLE_STOP');tokens.add(token);}
  page++;
 }while(token);
 return latest;
}

export async function collectOne({pcHome,fetchImpl=fetch,wait=ms=>new Promise(r=>setTimeout(r,ms))}={}){
 const directory=localDir(pcHome),wrapped=loadPlan(directory),plan=wrapped.plan;
 const rowsDir=path.join(directory,'rows');makeDir(rowsDir);
 const batches=Math.ceil(plan.tickers.length/BATCH_SIZE);
 let index=0;
 for(;index<batches;index++){
  const stored=path.join(rowsDir,`batch-${String(index).padStart(4,'0')}.json`);
  if(!fs.existsSync(stored))break;
  const previous=readJson(stored);
  const expected=new Set(plan.tickers.slice(index*BATCH_SIZE,(index+1)*BATCH_SIZE));
  if(previous?.planSha256!==wrapped.sha256||previous.index!==index||previous.expectedTickers!==expected.size||!Array.isArray(previous.rows)||previous.rows.length>expected.size||new Set(previous.rows.map(r=>r?.ticker)).size!==previous.rows.length||previous.rows.some(r=>!expected.has(r?.ticker)||!validDay(r.tradeDate)||r.tradeDate<plan.start||r.tradeDate>plan.end||!Number.isFinite(r.currentClose)||r.currentClose<=0||r.source!=='ALPACA'||r.feed!=='iex'||r.adjustmentStatus!=='split'))throw Error('R51_PREVIOUS_BATCH_CORRUPT_STOP');
 }
 if(index===batches)return noSymbolReport({status:'R51_ALL_BATCHES_STORED',asOf:plan.asOf,other:{batches,totalMissing:plan.tickers.length,providerRequests:0,gradeableTickerCount:0}});
 const env=loadLocalProviders(pcHome);
 if(!env.APCA_API_KEY_ID||!env.APCA_API_SECRET_KEY)throw Error('R51_CREDENTIALS_UNAVAILABLE');
 const lock=path.join(directory,'run.lock');let fd;
 try{fd=fs.openSync(lock,'wx');}catch{throw Error('R51_CONCURRENT_RUN_STOP');}
 const counters={requests:0,newPages:0,reusedPages:0};
 try{
  fs.writeSync(fd,`${process.pid}\n`);fs.closeSync(fd);fd=undefined;
  const members=plan.tickers.slice(index*BATCH_SIZE,(index+1)*BATCH_SIZE),all=new Map();
  const headers={'APCA-API-KEY-ID':env.APCA_API_KEY_ID,'APCA-API-SECRET-KEY':env.APCA_API_SECRET_KEY};
  for(let at=0;at<members.length;at+=GROUP_SIZE){
   const group=await readGroup({directory,batchIndex:index,groupIndex:Math.floor(at/GROUP_SIZE),symbols:members.slice(at,at+GROUP_SIZE),plan,fetchImpl,wait,headers,counters});
   for(const [ticker,row]of group){if(all.has(ticker)&&JSON.stringify(all.get(ticker))!==JSON.stringify(row))throw Error('R51_GROUP_PRICE_CONFLICT_STOP');all.set(ticker,row);}
  }
  const data={schema:S,planSha256:wrapped.sha256,index,expectedTickers:members.length,rows:[...all.values()].sort((a,b)=>a.ticker.localeCompare(b.ticker))};
  const file=path.join(rowsDir,`batch-${String(index).padStart(4,'0')}.json`);
  writeOnce(file,JSON.stringify(data));
  const readback=readJson(file);
  if(readback.planSha256!==wrapped.sha256||readback.rows.length!==all.size)throw Error('R51_BATCH_READBACK_FAILED');
  return noSymbolReport({status:'R51_BATCH_STORED',asOf:plan.asOf,other:{batchNumber:index+1,totalBatches:batches,plannedInBatch:members.length,newPriceTickerCandidates:all.size,noBarTickerCount:members.length-all.size,providerRequests:counters.requests,newRawPages:counters.newPages,reusedRawPages:counters.reusedPages,batchReadbackVerified:true,gradeableTickerCount:0,note:'IEX_LOCAL_ONLY; NO_MARKET_CAP_OR_STARS'}});
 }catch(error){
  return noSymbolReport({status:/^R51_[A-Z0-9_]+$/.test(error?.message)?error.message:'R51_LOCAL_OR_NETWORK_FAILURE',asOf:plan.asOf,other:{batchNumber:index+1,totalBatches:batches,providerRequests:counters.requests,newRawPages:counters.newPages,reusedRawPages:counters.reusedPages,gradeableTickerCount:0,note:'STOP; RAW_PAGES_PRESERVED; REVIEW_BEFORE_RESUME'}});
 }finally{try{if(fd!==undefined)fs.closeSync(fd);}catch{}try{fs.unlinkSync(lock);}catch{}}
}
export async function runPc({mode,pcHome=String.raw`E:\ZGmini\data\pc-writer`,outputDir=path.dirname(fileURLToPath(import.meta.url)),fetchImpl,wait,asOf}={}){
 let report;
 try{
  if(mode==='preflight')report=preflight({pcHome,asOf});
  else if(mode==='collect')report=await collectOne({pcHome,fetchImpl,wait});
  else throw Error('R51_MODE_INVALID');
 }catch(error){report=noSymbolReport({status:/^R51_[A-Z0-9_]+$/.test(error?.message)?error.message:'R51_LOCAL_OR_NETWORK_FAILURE',asOf:asOf??kstDay(),other:{note:'STOP; PRESERVE_EVIDENCE; DO_NOT_DELETE_LOCK_OR_RETRY_BLINDLY'}});}
 const filename=`MARKET_CALENDAR_R51_${mode==='collect'?'COLLECT':'PREFLIGHT'}_RESULT_${new Date().toISOString().replace(/[:.]/g,'').replace(/-/g,'')}_${process.pid}.txt`;
 const location=path.join(outputDir,filename);
 const content=['AUDIT=MARKET_CALENDAR_R51_PRICE_COVERAGE',...Object.entries(report).map(([k,v])=>`${k}=${JSON.stringify(v)}`)].join('\r\n')+'\r\n';
 writeOnce(location,content);
 return {status:report.status,file:filename};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const result=await runPc({mode:process.argv[2],pcHome:process.argv[3]||String.raw`E:\ZGmini\data\pc-writer`,outputDir:process.argv[4]?path.resolve(process.argv[4]):undefined});
 process.stdout.write(`STATUS=${result.status}\nRESULT=${result.file}\n`);
 if(!['R51_PLAN_STAGED','R51_EXISTING_PLAN_VALID','R51_BATCH_STORED','R51_ALL_BATCHES_STORED'].includes(result.status))process.exitCode=2;
}
