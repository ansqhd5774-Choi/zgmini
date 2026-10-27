// Read-only R39: can the already-saved 2026-10-26 split-adjusted MarketParquet
// cover the 63 research ETF tickers? No price mixing, scoring, API or D1 writes.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const BASE='2026-10-23',NEXT='2026-10-26';
const ROSTER_SHA='e2ea97ce0ed0bf15cb083237d63d3cf520e090d8bd229a837bad393c3f8b0c6c';
const ARCHIVE_SHAS={
 [BASE]:'4f0bbb08f4a67818209d6d32d465006111c6d6b0c958caf7f9202a49ca8c8f45',
 [NEXT]:'002465943c1cdb51191d528032652ad87ee0ab06f6bacb163b1ff4ce04a9174a',
};
const SOURCE='MARKETPARQUET_ETF_DAILY_SPLIT_ADJUSTED';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const fail=code=>{throw Object.assign(new Error('R39_'+code),{code:'R39_'+code});};
const positive=n=>typeof n==='number'&&Number.isFinite(n)&&n>0;

export function inspectNineR39WithRows({roster,baseRows,nextRows}={}){
 if(roster?.schema!=='zgmini.theme-nine.r20-approved-three-gate-candidates.v1'||
  roster?.counts?.themes!==9||roster.counts.positions!==64||
  roster.counts.uniqueTickers!==63||!Array.isArray(roster.groups)||
  roster.groups.length!==9)fail('ROSTER_CONTRACT');
 const positions=roster.groups.flatMap(g=>g.tickers.map(t=>t.ticker));
 const symbols=[...new Set(positions)].sort();
 if(positions.length!==64||symbols.length!==63||
  symbols.some(s=>!/^[A-Z][A-Z0-9.]{0,11}$/.test(s)))fail('ROSTER_SYMBOLS');
 const expected=new Set([...symbols,'SPY']);
 const normal=(rows,date)=>{
  if(!Array.isArray(rows))fail('PARQUET_ROWS_NOT_ARRAY_'+date);
  const prices=new Map();
  for(const row of rows){
   if(!row||typeof row.symbol!=='string')continue;
   const s=row.symbol.toUpperCase();
   if(!expected.has(s))continue;
   const observation=row.date instanceof Date?row.date.toISOString().slice(0,10):
    typeof row.date==='string'?row.date.slice(0,10):
    Number.isInteger(row.date)&&row.date>=10000&&row.date<100000?
     new Date(row.date*86400000).toISOString().slice(0,10):null;
   if(observation!==date||!positive(row.close)||
    (row.asset_type&&String(row.asset_type).toLowerCase()!=='etf')||
    prices.has(s))fail('PARQUET_ROW_INVALID_'+date+'_'+s);
   prices.set(s,row.close);
  }
  return prices;
 };
 const base=normal(baseRows,BASE),next=normal(nextRows,NEXT);
 const observedBase=symbols.filter(s=>base.has(s));
 const observedNext=symbols.filter(s=>next.has(s));
 const common=symbols.filter(s=>base.has(s)&&next.has(s));
 return {
  contract:'THEME_NINE_R39_EXISTING_PARQUET_COVERAGE_V1',
  status:base.has('SPY')&&next.has('SPY')&&common.length===63?
   'COMPLETE_DAILY_ETF_COVERAGE_ONLY':'PARTIAL_DAILY_ETF_COVERAGE_ONLY',
  source:SOURCE,priceMode:'DAILY_SPLIT_ADJUSTED_NOT_R32_RAW_1H',
  baseDate:BASE,nextDate:NEXT,rosterSha256:ROSTER_SHA,
  candidateThemeCount:9,candidatePositions:64,uniqueETFs:63,
  spyPresentBase:base.has('SPY'),spyPresentNext:next.has('SPY'),
  baseETFsPresent:observedBase.length,nextETFsPresent:observedNext.length,
  presentBothDates:common.length,
  missingBase:symbols.filter(s=>!base.has(s)),
  missingNext:symbols.filter(s=>!next.has(s)),
  missingEither:symbols.filter(s=>!base.has(s)||!next.has(s)),
  provisionalCalculation:'NOT_PERFORMED_PRICE_MODE_BRIDGE_NOT_VERIFIED',
  publicationAuthorized:false,providerCalls:0,rawWrites:0,
  dbWrites:0,d1Writes:0,schedulerWrites:0,
 };
}

function readRoster(){
 const candidates=[path.join(HERE,'theme-nine-r20-approved-candidates.json'),
  path.join(HERE,'..','..','config','theme-nine-r20-approved-candidates.json')];
 const file=candidates.find(f=>fs.existsSync(f));
 if(!file)fail('APPROVED_ROSTER_MISSING');
 const bytes=fs.readFileSync(file);
 if(sha(bytes)!==ROSTER_SHA)fail('APPROVED_ROSTER_SHA_DRIFT');
 return JSON.parse(bytes.toString('utf8'));
}

function decoderCandidates(dataRoot){
 const r8=path.join(dataRoot,'themes','biotech','source-r8','scripts',
  'pc-writer','theme-biotech-provisional-r8.mjs');
 const roots=[HERE,path.dirname(r8),path.dirname(path.dirname(r8)),
  path.join(dataRoot,'theme-market-history-r131','marketparquet-r167'),
  'E:\\ZGmini\\runtime'];
 for(const parent of ['E:\\ZGmini\\projects',path.join(dataRoot,'projects')]){
  if(!fs.existsSync(parent))continue;
  for(const entry of fs.readdirSync(parent,{withFileTypes:true})
   .filter(e=>e.isDirectory()).slice(0,80)){
   roots.push(path.join(parent,entry.name),path.join(parent,entry.name,'zgmini'));
  }
 }
 const found=[];
 if(fs.existsSync(r8))try{found.push(createRequire(pathToFileURL(r8).href).resolve('hyparquet'));}catch{}
 for(const root of roots)for(const suffix of ['node_modules/hyparquet/src/index.js',
  'node_modules/hyparquet/dist/index.js'])found.push(path.join(root,suffix));
 return [...new Set(found)];
}

async function decoder(dataRoot){
 try{const m=await import('hyparquet');
  if(typeof m.parquetReadObjects==='function')return m;
 }catch{}
 for(const file of decoderCandidates(dataRoot)){
  if(!fs.existsSync(file))continue;
  try{const m=await import(pathToFileURL(fs.realpathSync(file)).href);
   if(typeof m.parquetReadObjects==='function')return m;
  }catch{}
 }
 fail('APPROVED_PARQUET_DECODER_NOT_FOUND');
}

async function readSnapshot(dataRoot,date,mod){
 const root=path.join(dataRoot,'theme-market-history-r131');
 const file=path.join(root,'marketparquet-r165',`etf_daily_${date}.parquet`);
 const evidence=path.join(root,'marketparquet-r167',`etf_daily_${date}.audit.json`);
 if(!fs.existsSync(file)||!fs.existsSync(evidence))fail('SAVED_PARQUET_OR_AUDIT_MISSING_'+date);
 const bytes=fs.readFileSync(file),digest=sha(bytes);
 if(bytes.length<12||bytes.toString('ascii',0,4)!=='PAR1'||
  bytes.toString('ascii',bytes.length-4)!=='PAR1'||
  bytes.readUInt32LE(bytes.length-8)<1||
  bytes.readUInt32LE(bytes.length-8)>bytes.length-12||
  digest!==ARCHIVE_SHAS[date])fail('SAVED_PARQUET_SHA_OR_FORMAT_DRIFT_'+date);
 const audit=JSON.parse(fs.readFileSync(evidence,'utf8'));
 if(audit?.date!==date||audit?.sha256!==digest||
  audit?.complete!==true||audit?.source!==SOURCE)fail('SAVED_PARQUET_AUDIT_DRIFT_'+date);
 const buffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
 const rows=await mod.parquetReadObjects({file:buffer,
  columns:['date','symbol','asset_type','close']});
 if(!Array.isArray(rows))fail('PARQUET_DECODE_FAILED_'+date);
 return rows;
}

export async function inspectNineR39SavedParquet({dataRoot='E:\\ZGmini\\data'}={}){
 if(!fs.existsSync(dataRoot))fail('DATA_ROOT_MISSING');
 const roster=readRoster();
 const mod=await decoder(dataRoot);
 const [baseRows,nextRows]=await Promise.all([readSnapshot(dataRoot,BASE,mod),
  readSnapshot(dataRoot,NEXT,mod)]);
 return {...inspectNineR39WithRows({roster,baseRows,nextRows}),
  parquetBaseSha256:ARCHIVE_SHAS[BASE],parquetNextSha256:ARCHIVE_SHAS[NEXT],
  savedSourceReadback:'PINNED_PARQUET_SHA_AND_AUDIT_VERIFIED'};
}

function desktopDir(){
 const override=process.env.R39_REPORT_DIR;
 if(override&&fs.existsSync(override))return path.resolve(override);
 if(process.platform==='win32')try{
  const stdout=execFileSync('reg',['query',
   'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Shell Folders',
   '/v','Desktop'],{encoding:'utf8',timeout:5000});
  const match=stdout.match(/^\s*Desktop\s+REG_(?:EXPAND_)?SZ\s+(.+)$/m);
  if(match&&fs.existsSync(match[1].trim()))return match[1].trim();
 }catch{}
 const account=process.env.USERPROFILE;
 for(const loc of account?[path.join(account,'Desktop'),
  path.join(account,'OneDrive','Desktop')]:[])
  if(fs.existsSync(loc))return loc;
 fail('DESKTOP_LOCATION_NOT_FOUND');
}
function writeReport(out){
 const home=desktopDir();
 const id=new Date().toISOString().replaceAll(/[-:.TZ]/g,'').slice(0,14);
 const file=path.join(home,`THEME_NINE_R39_PARQUET_COVERAGE_RESULT_${id}_${process.pid}.txt`);
 const fields=Object.entries(out).map(([name,v])=>`${name.toUpperCase()}=${
  Array.isArray(v)?v.join(','):typeof v==='object'?JSON.stringify(v):v}`).join('\r\n');
 fs.writeFileSync(file,'REPORT=THEME_NINE_R39_PARQUET_COVERAGE\r\n'+fields+'\r\n',{
  encoding:'utf8',flag:'wx'});
 return file;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 let result;
 try{
  if(process.argv.length!==3||process.argv[2]!=='--inspect')fail('USAGE');
  result=await inspectNineR39SavedParquet({dataRoot:process.env.ZGMINI_DATA_ROOT||
   'E:\\ZGmini\\data'});
 }catch(error){result={status:'STOP_R39_READONLY_INSPECTION',
  error:error.code||'UNEXPECTED_ERROR',
  detail:error.code?undefined:String(error.message).slice(0,220),
  providerCalls:0,rawWrites:0,dbWrites:0,d1Writes:0,schedulerWrites:0};
  process.exitCode=1;
 }
 try{
  const file=writeReport(result);
  process.stdout.write(JSON.stringify({status:result.status,error:result.error||null,
   reportFile:file,basePresent:result.baseETFsPresent??null,
   nextPresent:result.nextETFsPresent??null,
   paired:result.presentBothDates??null},null,2)+'\n');
 }catch(error){process.stderr.write('R39_REPORT_WRITE_FAILED '+String(error.message)+'\n');
  process.exitCode=1;}
}
