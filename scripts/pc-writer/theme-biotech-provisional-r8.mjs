// R8: additive biotech-only secondary lane over the existing R7 confirmed lane.
// Reuse the seven-theme MarketParquet R165 archive, never collect it a second time.
// All prices are read from previously stored SHA-checked raw files before scoring.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {regularHour15Rows,scoreAll252} from './theme-optional-score-r188.mjs';

export const BIOTECH_PROVISIONAL_KEY='theme-biotech-provisional-r1';
export const BIOTECH_PROVISIONAL_VERSION='THEME_BIOTECH_MARKETPARQUET_PROVISIONAL_R1';
const SYMBOLS=['IBB','XBI','SPY'];
const SOURCE='MARKETPARQUET_ETF_DAILY_SPLIT_ADJUSTED';
const gmSource='https://getmarkethistory.com';
const gmMode='RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE';
const hash=b=>createHash('sha256').update(b).digest('hex');
const fail=s=>{throw Object.assign(new Error(s),{code:s});};
const check=(condition,s)=>{if(!condition)fail(s);};
const score=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=100;
const price=x=>typeof x==='number'&&Number.isFinite(x)&&x>0;
const date=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
const dateOnly=x=>x instanceof Date?x.toISOString().slice(0,10):typeof x==='string'?x.slice(0,10):
 typeof x==='number'&&Number.isInteger(x)&&x>10000&&x<100000?new Date(x*86400000).toISOString().slice(0,10):null;

// Price tables use the exact same saved GMH hourly selection and R188 math as R7.
export function readVerifiedBiotechGmhPrices(dataRoot){
 const home=path.join(dataRoot,'themes','biotech');
 const file=path.join(home,'raw-manifest.json');
 check(fs.existsSync(file),'R8_BIOTECH_MANIFEST_MISSING');
 const bytes=fs.readFileSync(file),manifest=JSON.parse(bytes);
 check(manifest.version===1&&manifest.themeId==='biotech'&&Array.isArray(manifest.files),'R8_BIOTECH_MANIFEST_INVALID');
 const received={},bars=Object.fromEntries(SYMBOLS.map(s=>[s,new Map()]));
 for(const entry of manifest.files){
  check(/^raw\/(IBB|XBI|SPY)_[a-f0-9]{64}\.jsonl$/.test(entry.path??'')&&
   /^[a-f0-9]{64}$/.test(entry.sha256??'')&&entry.path.endsWith(entry.sha256+'.jsonl')&&
   entry.source===gmSource&&entry.priceMode===gmMode&&Number.isFinite(Date.parse(entry.collectedAt)),
   'R8_GMH_MANIFEST_ENTRY_INVALID');
  const target=path.join(home,entry.path),real=fs.realpathSync(target);
  check(real.startsWith(fs.realpathSync(home)+path.sep),'R8_GMH_PATH_ESCAPE');
  const raw=fs.readFileSync(real);check(hash(raw)===entry.sha256,'R8_GMH_RAW_SHA_MISMATCH');
  const symbol=entry.path.slice(4,entry.path.indexOf('_'));
  let previous='';
  for(const line of raw.toString('utf8').split(/\r?\n/).filter(Boolean)){
   const row=JSON.parse(line);
   check(row.symbol===symbol&&typeof row.timestamp==='string'&&Number.isFinite(Date.parse(row.timestamp))&&
    price(row.close)&&(!previous||row.timestamp>previous),'R8_GMH_BAR_INVALID');
   previous=row.timestamp;
   if(row.is_gap===true)continue;
   const older=bars[symbol].get(row.timestamp);
   check(!older||older.close===row.close,'R8_GMH_DUPLICATE_CONFLICT');
   bars[symbol].set(row.timestamp,row);
  }
  received[symbol]=[received[symbol],entry.collectedAt].filter(Boolean).sort().at(-1);
 }
 check(SYMBOLS.every(s=>bars[s].size>=628),'R8_GMH_WARMUP_MISSING');
 const tables=Object.fromEntries(SYMBOLS.map(s=>[s,new Map(regularHour15Rows(
  [...bars[s].values()].sort((a,b)=>a.timestamp.localeCompare(b.timestamp))).map(p=>[p.date,p.close]))]));
 const common=[...tables.SPY.keys()].filter(d=>SYMBOLS.every(s=>tables[s].has(d))).sort();
 check(common.length>=628,'R8_GMH_COMMON_SESSIONS_MISSING');
 return {tables,common,manifestSha256:hash(bytes),received};
}

export async function decodeVerifiedBiotechParquetR8(mod,verifiedBytes){
 // The R165 archive was already read and SHA-verified. Decode those exact
 // bytes; an ArrayBuffer is a supported hyparquet file input in Node/browser.
 // This also works with the existing browser/core src/index.js export, which
 // does NOT export the Node-only asyncBufferFromFile helper.
 check(typeof mod?.parquetReadObjects==='function','R8_PARQUET_ADAPTER_INVALID');
 check(Buffer.isBuffer(verifiedBytes),'R8_PARQUET_VERIFIED_BYTES_REQUIRED');
 const file=verifiedBytes.buffer.slice(verifiedBytes.byteOffset,
  verifiedBytes.byteOffset+verifiedBytes.byteLength);
 return mod.parquetReadObjects({file,columns:['date','symbol','asset_type','close']});
}

async function defaultParquetReader(filename,verifiedBytes){
 // The site's existing package.json already includes hyparquet: no new paid API
 // or download is performed by this writer. Resolve the configured local copy.
 let mod;
 try{mod=await import('hyparquet');}
 catch{
  const dataRoot=path.resolve(filename,'..','..','..','..');
  const projects=path.join(dataRoot,'projects');
  const known=[process.env.ZGMINI_HYPARQUET_MODULE,
   path.join(path.dirname(filename),'..','marketparquet-r167','node_modules','hyparquet','src','index.js')];
  if(fs.existsSync(projects))for(const name of fs.readdirSync(projects).slice(0,80)){
   for(const relative of ['node_modules/hyparquet/src/index.js','zgmini/node_modules/hyparquet/src/index.js'])
    known.push(path.join(projects,name,relative));
  }
  const resolved=known.find(loc=>typeof loc==='string'&&fs.existsSync(loc));
  check(resolved,'R8_EXISTING_HYPARQUET_MODULE_NOT_RESOLVED');
  mod=await import(pathToFileURL(fs.realpathSync(resolved)).href);
 }
 return decodeVerifiedBiotechParquetR8(mod,verifiedBytes);
}

export async function readVerifiedMarketParquetBiotech(dataRoot,{confirmedDate,parquetReader=defaultParquetReader}={}){
 check(date(confirmedDate),'R8_BASE_DATE_INVALID');
 const parent=path.join(dataRoot,'theme-market-history-r131');
 const archive=path.join(parent,'marketparquet-r165'),audits=path.join(parent,'marketparquet-r167');
 check(fs.existsSync(archive)&&fs.existsSync(audits),'R8_SEVEN_THEME_ARCHIVE_UNAVAILABLE');
 const available=fs.readdirSync(archive).filter(n=>/^etf_daily_\d{4}-\d{2}-\d{2}\.parquet$/.test(n))
  .map(name=>({name,date:name.slice(10,20)})).filter(x=>x.date>=confirmedDate).sort((a,b)=>a.date.localeCompare(b.date));
 // Always verify an overlap date before appending secondary prices.
 if(!available.some(x=>x.date===confirmedDate))return {status:'NO_OVERLAP_PARQUET',dates:[]};
 const relevant=available.slice(0,3);
 const results=[];
 for(const {name,date:observation} of relevant){
  const filename=path.join(archive,name),bytes=fs.readFileSync(filename);
  check(bytes.length>=12&&bytes.toString('ascii',0,4)==='PAR1'&&bytes.toString('ascii',bytes.length-4)==='PAR1',
   'R8_PARQUET_MAGIC_INVALID');
  const footer=bytes.readUInt32LE(bytes.length-8);
  check(footer>0&&footer<=bytes.length-12,'R8_PARQUET_FOOTER_INVALID');
  const digest=hash(bytes),auditPath=path.join(audits,name.replace('.parquet','.audit.json'));
  check(fs.existsSync(auditPath),'R8_SEVEN_THEME_AUDIT_MISSING');
  const audit=JSON.parse(fs.readFileSync(auditPath,'utf8'));
  check(audit.date===observation&&audit.sha256===digest&&audit.complete===true&&audit.source===SOURCE,
   'R8_SEVEN_THEME_AUDIT_MISMATCH');
  const rows=await parquetReader(filename,bytes),actual={};
  check(Array.isArray(rows),'R8_PARQUET_ROWS_INVALID');
  for(const row of rows){
   const ticker=typeof row.symbol==='string'?row.symbol.toUpperCase():null;
   if(!SYMBOLS.includes(ticker))continue;
   const rowDate=dateOnly(row.date);
   check(rowDate===observation&&price(row.close)&&
    (!row.asset_type||String(row.asset_type).toLowerCase()==='etf'),'R8_PARQUET_TARGET_ROW_INVALID');
   check(!Object.hasOwn(actual,ticker),'R8_PARQUET_TARGET_DUPLICATE');
   actual[ticker]=row.close;
  }
  if(SYMBOLS.some(t=>!price(actual[t])))return {status:'MISSING_REAL_TARGET_ROWS',dates:results.map(r=>r.date),missingDate:observation};
  results.push({date:observation,prices:actual,fileSha256:digest,
   sourceStoredAt:new Date(fs.statSync(filename).mtimeMs).toISOString()});
 }
 return {status:'VERIFIED',dates:results};
}

export function calculateBiotechProvisionalR8({confirmed,gmh,parquet,now=Date.now()}={}){
 check(confirmed?.status==='READY'&&confirmed.phase==='CONFIRMED'&&
  confirmed.etfs?.join(',')==='IBB,XBI'&&confirmed.referenceSymbol==='SPY'&&
  confirmed.history?.length===252&&date(confirmed.observationDate)&&
  score(confirmed.score)&&confirmed.history.at(-1)?.date===confirmed.observationDate&&
  confirmed.history.at(-1)?.score===confirmed.score,'R8_CONFIRMED_BASE_INVALID');
 check(gmh?.tables&&gmh?.common?.includes(confirmed.observationDate),'R8_GMH_CONFIRMED_BASE_MISSING');
 check(parquet?.status==='VERIFIED'&&parquet.dates?.[0]?.date===confirmed.observationDate,'R8_SECONDARY_OVERLAP_MISSING');
 const pending=parquet.dates.slice(1);
 if(!pending.length)return {status:'NO_NEW_VERIFIED_PROVISIONAL',points:[]};
 check(pending.length<=2&&pending.every((r,i)=>date(r.date)&&r.date>confirmed.observationDate&&
  (i===0||r.date>pending[i-1].date)&&Date.parse(r.date+'T00:00:00Z')<=now&&
  SYMBOLS.every(s=>price(r.prices?.[s]))),'R8_PENDING_DATES_OR_PRICES_INVALID');
 // A split-adjusted EOD close must reasonably bridge the previously saved,
 // unadjusted 15:xx hourly proxy. Do not silently scale or invent prices.
 const overlap=parquet.dates[0];
 const bridge=Object.fromEntries(SYMBOLS.map(s=>[s,Math.abs(overlap.prices[s]/gmh.tables[s].get(confirmed.observationDate)-1)]));
 check(SYMBOLS.every(s=>Number.isFinite(bridge[s])&&bridge[s]<=0.05),'R8_PRICE_MODES_NOT_RECONCILED');
 const through=gmh.common.indexOf(confirmed.observationDate);
 check(through>=627,'R8_GMH_LOOKBACK_INSUFFICIENT');
 const days=gmh.common.slice(through-627,through+1);
 const snapshots={};
 for(const symbol of SYMBOLS){
  const series=days.map(d=>gmh.tables[symbol].get(d));
  for(const p of pending)series.push(p.prices[symbol]);
  snapshots[symbol]=series;
 }
 const ibb=scoreAll252(snapshots.IBB,snapshots.SPY),xbi=scoreAll252(snapshots.XBI,snapshots.SPY);
 const points=pending.map((p,i)=>({date:p.date,score:Number(((ibb[252-pending.length+i]+xbi[252-pending.length+i])/2).toFixed(5))}));
 check(points.every(p=>score(p.score)),'R8_SCORES_INVALID');
 const savedAt=pending.map(x=>x.sourceStoredAt).sort().at(-1);
 const output={status:'READY',version:BIOTECH_PROVISIONAL_VERSION,phase:'PROVISIONAL',
  theme:'바이오·신약',etfs:['IBB','XBI'],referenceSymbol:'SPY',
  methodologyVersion:'ETF_ONLY_T40_R20_V40_PAIR50',individualStocksUsed:0,scoreMethod:'ETF_ONLY_PROXY',
  publicationAuthorized:true,derivedOnlyNoRaw:true,licensingRiskAcceptedByPublisher:confirmed.licensingRiskAcceptedByPublisher,
  upstreamCommercialRightsVerified:false,derivedLicenseVerified:false,sourcePriceReconciled:false,
  sourcePriceMode:'GMH_UNADJUSTED_15_HOURLY_PROXY_PLUS_MARKETPARQUET_SPLIT_ADJUSTED_EOD',
  sourceName:'MARKETPARQUET_ALREADY_STORED_SEVEN_THEME_ARCHIVE',
  sourceStoredAt:savedAt,sourceTimestampBasis:'LOCAL_PARQUET_FILE_MTIME',
  sourceVersion:'BIOTECH_R8_'+hash(Buffer.from(JSON.stringify({base:confirmed.observationDate,
   manifest:gmh.manifestSha256,files:parquet.dates.map(x=>x.fileSha256)}))),
  confirmedObservationDate:confirmed.observationDate,confirmedScore:confirmed.score,
  observationDate:points.at(-1).date,points,coverage:{etfs:2,benchmark:'SPY',complete:true},
  overlapPriceDifferences:bridge,sourceFiles:parquet.dates.map(({date,fileSha256})=>({date,sha256:fileSha256})),
  asOf:new Date(now).toISOString()};
 return {status:'PRIVATE_PROVISIONAL_CANDIDATE',record:output,points};
}

export async function buildBiotechProvisionalFromStorageR8({dataRoot,confirmed,now=Date.now(),parquetReader}={}){
 const gmh=readVerifiedBiotechGmhPrices(dataRoot);
 const parquet=await readVerifiedMarketParquetBiotech(dataRoot,{confirmedDate:confirmed.observationDate,parquetReader});
 if(parquet.status!=='VERIFIED')return parquet;
 return calculateBiotechProvisionalR8({confirmed,gmh,parquet,now});
}
