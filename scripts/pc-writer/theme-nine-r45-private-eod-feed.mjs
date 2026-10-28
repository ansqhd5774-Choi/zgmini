// R45: isolate the existing MarketParquet raw daily ETF universe into an
// approved-63 + SPY private input. It DOES NOT calculate the R32 raw-1h score.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const DATA_ROOT='E:\\ZGmini\\data';
const SOURCE='MARKETPARQUET_ETF_DAILY_SPLIT_ADJUSTED';
const PRICE_MODE='DAILY_SPLIT_ADJUSTED_NOT_R32_RAW_1H';
const ROSTER_SHA='e2ea97ce0ed0bf15cb083237d63d3cf520e090d8bd229a837bad393c3f8b0c6c';
const PINNED={
 '2026-10-23':'4f0bbb08f4a67818209d6d32d465006111c6d6b0c958caf7f9202a49ca8c8f45',
 '2026-10-26':'002465943c1cdb51191d528032652ad87ee0ab06f6bacb163b1ff4ce04a9174a',
};
const MAX_DATES=628,MAX_FILE_BYTES=512*1024*1024;
const sha=b=>createHash('sha256').update(b).digest('hex');
function fail(code){throw Object.assign(new Error('R45_'+code),{code:'R45_'+code});}
const positive=x=>typeof x==='number'&&Number.isFinite(x)&&x>0;
function day(x){
 if(x instanceof Date&&!Number.isNaN(x.valueOf()))return x.toISOString().slice(0,10);
 if(typeof x==='string'&&/^\d{4}-\d{2}-\d{2}(?:$|T| )/.test(x))return x.slice(0,10);
 if(Number.isInteger(x)&&x>=10000&&x<100000)return new Date(x*86400000).toISOString().slice(0,10);
 if(typeof x==='bigint'&&x>100000000000n)return new Date(Number(x>100000000000000n?x/1000n:x)).toISOString().slice(0,10);
 if(typeof x==='number'&&Number.isFinite(x)&&x>100000000000)return new Date(x>100000000000000?x/1000:x).toISOString().slice(0,10);
 return null;
}
function approvedSymbols(roster){
 if(roster?.schema!=='zgmini.theme-nine.r20-approved-three-gate-candidates.v1'||
   roster?.counts?.themes!==9||roster.counts.positions!==64||
   roster.counts.uniqueTickers!==63||roster.groups?.length!==9)fail('ROSTER_CONTRACT');
 const positions=roster.groups.flatMap(g=>g.tickers.map(t=>t.ticker));
 const approved=[...new Set(positions)].sort();
 if(positions.length!==64||approved.length!==63||
   approved.some(s=>typeof s!=='string'||!/^[A-Z][A-Z0-9.]{0,11}$/.test(s)))fail('ROSTER_SYMBOLS');
 return approved;
}

export function compileNineR45PrivateEodFeed({roster,verifiedRowsByDate,shaByDate}={}){
 const approved=approvedSymbols(roster);
 if(!(verifiedRowsByDate instanceof Map)||!(shaByDate instanceof Map)||
   verifiedRowsByDate.size<1||verifiedRowsByDate.size>MAX_DATES||
   shaByDate.size!==verifiedRowsByDate.size)fail('INPUT_DATES');
 const dates=[...verifiedRowsByDate.keys()].sort();
 if(dates.some(d=>!/^\d{4}-\d{2}-\d{2}$/.test(d)))fail('DATE_FORMAT');
 const wanted=new Set([...approved,'SPY']);
 const series=Object.fromEntries([...approved,'SPY'].map(s=>[s,[]]));
 const observedByDate={},sources=[];
 for(const d of dates){
  const rows=verifiedRowsByDate.get(d),digest=shaByDate.get(d);
  if(!Array.isArray(rows)||typeof digest!=='string'||
    !/^[a-f0-9]{64}$/.test(digest))fail('UNVERIFIED_ROWS_'+d);
  if(PINNED[d]&&PINNED[d]!==digest)fail('PINNED_SHA_DRIFT_'+d);
  const present=new Map();
  for(const row of rows){
   if(typeof row?.symbol!=='string')continue;
   const symbol=row.symbol.toUpperCase();
   if(!wanted.has(symbol))continue;
   if(day(row.date??row.timestamp)!==d||!positive(row.close)||
     row.asset_type&&String(row.asset_type).toLowerCase()!=='etf'||
     present.has(symbol))fail('ETF_ROW_INVALID_'+d+'_'+symbol);
   present.set(symbol,row.close);
  }
  for(const [s,price] of present)series[s].push({date:d,close:price});
  observedByDate[d]={spy:present.has('SPY'),etfs:approved.filter(s=>present.has(s)).length};
  sources.push({date:d,sha256:digest});
 }
 const spyDays=new Set(series.SPY.map(x=>x.date));
 const coverage=Object.fromEntries(approved.map(s=>{
  const paired=series[s].filter(x=>spyDays.has(x.date));
  return [s,{savedEodDates:series[s].length,spyPairedDates:paired.length,
   firstPairedDate:paired[0]?.date??null,lastPairedDate:paired.at(-1)?.date??null,
   atLeast40:paired.length>=40,atLeast377:paired.length>=377,
   atLeast628:paired.length>=628}];
 }));
 const latest=dates.at(-1),latestDay=observedByDate[latest];
 return {
  schema:'zgmini.theme-nine.r45.private-eod-source.v1',
  status:'PRIVATE_EOD_INPUT_EXTRACTED_R32_BLOCKED',
  source:SOURCE,priceMode:PRICE_MODE,approvedRosterSha256:ROSTER_SHA,
  approvedETFCount:63,themeCount:9,positions:64,
  verifiedSavedDates:dates.length,firstVerifiedDate:dates[0],latestVerifiedDate:latest,
  latestETFCount:latestDay.etfs,latestSPYPresent:latestDay.spy,
  latestMissingETFs:approved.filter(s=>!series[s].some(x=>x.date===latest)),
  sourceFiles:sources,observedByDate,series,coverage,
  r32RawPriceCompatibility:'NOT_VERIFIED',r32CalculationAuthorized:false,
  publicPublishAuthorized:false,providerCalls:0,sourceWrites:0,
  dbWrites:0,d1Writes:0,schedulerWrites:0,
 };
}

function decoderPaths(root){
 const candidates=[];
 try{candidates.push(createRequire(import.meta.url).resolve('hyparquet'));}catch{}
 const biotech=path.join(root,'themes','biotech','source-r8','scripts',
  'pc-writer','theme-biotech-provisional-r8.mjs');
 if(fs.existsSync(biotech))try{
  candidates.push(createRequire(pathToFileURL(biotech).href).resolve('hyparquet'));
 }catch{}
 for(const base of [HERE,path.join(root,'theme-market-history-r131','marketparquet-r167'),
  'E:\\ZGmini\\runtime'])for(const suffix of [
   'node_modules/hyparquet/src/index.js','node_modules/hyparquet/dist/index.js'])
   candidates.push(path.join(base,suffix));
 const projects='E:\\ZGmini\\projects';
 if(fs.existsSync(projects))for(const entry of fs.readdirSync(projects,{withFileTypes:true})
  .filter(e=>e.isDirectory()).slice(0,80))for(const base of [entry.name,path.join(entry.name,'zgmini')])
  for(const suffix of ['node_modules/hyparquet/src/index.js',
   'node_modules/hyparquet/dist/index.js'])candidates.push(path.join(projects,base,suffix));
 return [...new Set(candidates)];
}
async function parquetDecoder(root){
 for(const candidate of decoderPaths(root)){
  if(!fs.existsSync(candidate))continue;
  try{const m=await import(pathToFileURL(fs.realpathSync(candidate)).href);
   if(typeof m.parquetReadObjects==='function')return m.parquetReadObjects;
  }catch{}
 }
 fail('LOCAL_PARQUET_DECODER_MISSING');
}
function sourceInventory(root){
 const raw=path.join(root,'theme-market-history-r131','marketparquet-r165');
 if(!fs.existsSync(raw))fail('EXISTING_RAW_PARQUET_DIR_MISSING');
 const dates=fs.readdirSync(raw).flatMap(n=>{
  const m=/^etf_daily_(\d{4}-\d{2}-\d{2})\.parquet$/.exec(n);return m?[m[1]]:[];
 }).sort();
 if(!dates.length)fail('NO_EXISTING_PARQUET');
 return {raw,dates:dates.slice(-MAX_DATES),inventoryCount:dates.length};
}
async function readAudited(root,raw,date,decoder){
 const file=path.join(raw,`etf_daily_${date}.parquet`);
 const auditFile=path.join(root,'theme-market-history-r131','marketparquet-r167',
  `etf_daily_${date}.audit.json`);
 if(!fs.existsSync(auditFile))fail('AUDIT_MISSING_'+date);
 const bytes=fs.readFileSync(file),digest=sha(bytes);
 if(bytes.length<12||bytes.length>MAX_FILE_BYTES||
  bytes.toString('ascii',0,4)!=='PAR1'||
  bytes.toString('ascii',bytes.length-4)!=='PAR1'||
  bytes.readUInt32LE(bytes.length-8)<1||
  bytes.readUInt32LE(bytes.length-8)>bytes.length-12)fail('PARQUET_FORMAT_'+date);
 const audit=JSON.parse(fs.readFileSync(auditFile,'utf8'));
 if(audit?.date!==date||audit.sha256!==digest||
  audit.complete!==true||audit.source!==SOURCE)fail('AUDIT_MISMATCH_'+date);
 if(PINNED[date]&&digest!==PINNED[date])fail('PINNED_PARQUET_DRIFT_'+date);
 const data=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
 const rows=await decoder({file:data,columns:['date','symbol','asset_type','close']});
 if(!Array.isArray(rows))fail('DECODER_RESULT_'+date);
 return {rows,digest};
}
export async function collectNineR45FromSavedMarketParquet({dataRoot=DATA_ROOT}={}){
 const rosterFile=path.join(HERE,'theme-nine-r20-approved-candidates.json');
 if(!fs.existsSync(rosterFile))fail('APPROVED_ROSTER_FILE_MISSING');
 const rosterBytes=fs.readFileSync(rosterFile);
 if(sha(rosterBytes)!==ROSTER_SHA)fail('APPROVED_ROSTER_SHA_DRIFT');
 const roster=JSON.parse(rosterBytes.toString('utf8'));
 const {raw,dates,inventoryCount}=sourceInventory(dataRoot);
 const parse=await parquetDecoder(dataRoot),byDate=new Map(),digests=new Map();
 for(const d of dates){
  const {rows,digest}=await readAudited(dataRoot,raw,d,parse);
  byDate.set(d,rows);digests.set(d,digest);
 }
 return {...compileNineR45PrivateEodFeed({roster,verifiedRowsByDate:byDate,shaByDate:digests}),
  existingParquetInventory:inventoryCount};
}

function writeFiles(outDir,result){
 if(!fs.existsSync(outDir)||!fs.statSync(outDir).isDirectory())fail('OUTPUT_DIR_MISSING');
 const suffix=new Date().toISOString().replace(/[-:.TZ]/g,'').slice(0,14)+'_'+process.pid;
 const base='THEME_NINE_R45_PRIVATE_EOD_INPUT_'+suffix;
 let manifestFile=null;
 if(result.schema){
  manifestFile=path.join(outDir,base+'.json');
  fs.writeFileSync(manifestFile,JSON.stringify(result)+'\r\n',{flag:'wx'});
 }
 const reportFile=path.join(outDir,base+'_RESULT.txt');
 const list=['REPORT=THEME_NINE_R45_PRIVATE_EOD_INPUT',
  'STATUS='+result.status,'ERROR='+(result.error??'NONE'),
  'VERIFIED_SAVED_EOD_DATES='+(result.verifiedSavedDates??0),
  'FIRST_VERIFIED_DATE='+(result.firstVerifiedDate??'NONE'),
  'LATEST_VERIFIED_DATE='+(result.latestVerifiedDate??'NONE'),
  'LATEST_ETF_COUNT='+(result.latestETFCount??0),
  'LATEST_SPY_PRESENT='+(result.latestSPYPresent??false),
  'MISSING_LATEST_ETFS='+(result.latestMissingETFs?.join(',')??'UNKNOWN'),
  'R32_RAW_PRICE_COMPATIBILITY=NOT_VERIFIED',
  'R32_CALCULATION_AUTHORIZED=FALSE','PUBLIC_PUBLISH_AUTHORIZED=FALSE',
  'SOURCE_MODE='+PRICE_MODE,'EXISTING_7_TASK_CHANGED=NO',
  'PROVIDER_CALLS=0','DB_D1_SCHEDULER_WRITES=0',
  'PRIVATE_JSON_FILE='+(manifestFile?path.basename(manifestFile):'NONE'),
  'PRIVATE_JSON_SHA256='+(manifestFile?sha(fs.readFileSync(manifestFile)):'NONE')];
 fs.writeFileSync(reportFile,list.join('\r\n')+'\r\n',{flag:'wx'});
 return {reportFile,manifestFile};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 let result;
 try{
  if(process.argv[2]!=='--export' ||process.argv.length!==4)fail('USAGE');
  result=await collectNineR45FromSavedMarketParquet({
   dataRoot:process.env.ZGMINI_DATA_ROOT||DATA_ROOT});
 }catch(err){result={status:'STOP_R45_PRIVATE_INPUT',error:err.code||'UNEXPECTED_ERROR'};
  process.exitCode=1;}
 try{
  const dir=process.argv[3]?path.resolve(process.argv[3]):HERE;
  const file=writeFiles(dir,result);
  process.stdout.write(JSON.stringify({status:result.status,error:result.error||null,
   reportFile:file.reportFile,privateJsonFile:file.manifestFile,
   savedDates:result.verifiedSavedDates??null})+'\n');
 }catch(err){process.stderr.write('R45_REPORT_FAILED '+String(err.message)+'\n');
  process.exitCode=1;}
}
