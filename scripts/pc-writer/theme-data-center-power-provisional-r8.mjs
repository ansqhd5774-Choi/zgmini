// R8 data-center/power provisional scorer: saved-only DTCR/GRID/SPY prices.
// The R188 formula, confirmed D1 key and original 252 historical points stay fixed.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {regularHour15Rows,scoreAll252} from './theme-optional-score-r188.mjs';
import {calculateDataCenterPower} from './theme-data-center-power-r1.mjs';
import {DC_POWER_PROVISIONAL_VERSION,DC_POWER_PROVISIONAL_METHOD,
 DC_POWER_PROVISIONAL_PRICE_MODE} from '../../worker/theme-data-center-power-provisional-r1.mjs';

const SOURCE='MARKETPARQUET_ETF_DAILY_SPLIT_ADJUSTED';
const SYMBOLS=['DTCR','GRID','SPY'];
const sha=b=>createHash('sha256').update(b).digest('hex');
const need=(ok,code)=>{if(!ok)throw Object.assign(new Error(code),{code});};
const positive=n=>typeof n==='number'&&Number.isFinite(n)&&n>0;
const score=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=100;
const date=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&
 Number.isFinite(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
const dateOnly=x=>x instanceof Date?x.toISOString().slice(0,10):
 typeof x==='string'?x.slice(0,10):Number.isInteger(x)&&x>10000&&x<100000?
 new Date(x*86400000).toISOString().slice(0,10):null;

export function readVerifiedDcGmhR8(dataRoot){
 const home=fs.realpathSync(path.join(dataRoot,'themes','data-center-power'));
 const manifestFile=path.join(home,'raw-manifest.json'),rawBytes=fs.readFileSync(manifestFile);
 const manifest=JSON.parse(rawBytes);
 need(manifest.version===1&&manifest.themeId==='data-center-power'&&
  Array.isArray(manifest.files)&&manifest.files.length>=3,'DC_R8_GMH_MANIFEST_INVALID');
 const bars=Object.fromEntries(SYMBOLS.map(s=>[s,new Map()]));
 const seen=new Set();
 for(const entry of manifest.files){
  need(/^raw\/(DTCR|GRID|SPY)_[a-f0-9]{64}\.jsonl$/.test(entry.path??'')&&
   /^[a-f0-9]{64}$/.test(entry.sha256??'')&&entry.path.endsWith(entry.sha256+'.jsonl')&&
   entry.source==='https://getmarkethistory.com'&&
   entry.priceMode==='RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE'&&
   Number.isFinite(Date.parse(entry.collectedAt)),'DC_R8_GMH_ENTRY_INVALID');
  const file=fs.realpathSync(path.join(home,entry.path));
  need(file.startsWith(home+path.sep),'DC_R8_GMH_PATH_ESCAPE');
  const bytes=fs.readFileSync(file);
  need(sha(bytes)===entry.sha256,'DC_R8_GMH_HASH_MISMATCH');
  const symbol=entry.path.slice(4).split('_')[0];seen.add(symbol);
  let previous='';
  for(const line of bytes.toString('utf8').split(/\r?\n/).filter(Boolean)){
   const row=JSON.parse(line);
   need(row.symbol===symbol&&typeof row.timestamp==='string'&&
    Number.isFinite(Date.parse(row.timestamp))&&positive(row.close)&&
    (!previous||row.timestamp>previous),'DC_R8_GMH_BAR_INVALID');
   previous=row.timestamp;
   if(row.is_gap===true)continue;
   const older=bars[symbol].get(row.timestamp);
   need(!older||older.close===row.close,'DC_R8_GMH_PRICE_CONFLICT');
   bars[symbol].set(row.timestamp,row);
  }
 }
 need(SYMBOLS.every(s=>seen.has(s)),'DC_R8_GMH_SYMBOL_MISSING');
 const tables=Object.fromEntries(SYMBOLS.map(s=>[s,new Map(regularHour15Rows(
  [...bars[s].values()].sort((a,b)=>a.timestamp.localeCompare(b.timestamp)))
  .map(x=>[x.date,x.close]))]));
 const common=[...tables.SPY.keys()].filter(day=>SYMBOLS.every(s=>tables[s].has(day))).sort();
 need(common.length>=628,'DC_R8_GMH_628_COMMON_DATES_MISSING');
 return {tables,common,manifestSha256:sha(rawBytes)};
}

async function existingDecoder(dataRoot){
 try{const mod=await import('hyparquet');if(typeof mod.parquetReadObjects==='function')return mod;}catch{}
 const paths=[process.env.ZGMINI_HYPARQUET_MODULE,
  path.join(dataRoot,'theme-market-history-r131','marketparquet-r167','node_modules','hyparquet','src','index.js')];
 for(const projects of [path.resolve(dataRoot,'..','projects'),path.join(dataRoot,'projects')]){
  if(!fs.existsSync(projects))continue;
  for(const name of fs.readdirSync(projects).slice(0,80)){
   paths.push(path.join(projects,name,'node_modules','hyparquet','src','index.js'));
   paths.push(path.join(projects,name,'zgmini','node_modules','hyparquet','src','index.js'));
  }
 }
 for(const filename of paths){
  if(typeof filename!=='string'||!fs.existsSync(filename))continue;
  try{const mod=await import(pathToFileURL(fs.realpathSync(filename)).href);
   if(typeof mod.parquetReadObjects==='function')return mod;}catch{}
 }
 need(false,'DC_R8_APPROVED_EXISTING_PARQUET_DECODER_MISSING');
}

export async function readDcParquetR8(dataRoot,{confirmedDate,decoder}={}){
 need(date(confirmedDate),'DC_R8_CONFIRMED_DATE_INVALID');
 const root=path.join(dataRoot,'theme-market-history-r131');
 const archive=path.join(root,'marketparquet-r165'),audits=path.join(root,'marketparquet-r167');
 need(fs.existsSync(archive)&&fs.existsSync(audits),'DC_R8_SAVED_ARCHIVE_MISSING');
 const files=fs.readdirSync(archive).filter(n=>/^etf_daily_\d{4}-\d{2}-\d{2}\.parquet$/.test(n))
  .map(name=>({name,date:name.slice(10,20)})).filter(x=>x.date>=confirmedDate)
  .sort((a,b)=>a.date.localeCompare(b.date));
 if(files[0]?.date!==confirmedDate)return {status:'NO_VERIFIED_BASE_OVERLAP',dates:[]};
 if(files.length>3)return {status:'CONFIRMED_REFRESH_NEEDED_FOR_BACKLOG',dates:[]};
 const mod=decoder??await existingDecoder(dataRoot);
 need(typeof mod?.parquetReadObjects==='function','DC_R8_PARQUET_DECODER_INVALID');
 const results=[];
 for(const {name,date:day} of files){
  const filename=path.join(archive,name),bytes=fs.readFileSync(filename);
  need(bytes.length>=12&&bytes.toString('ascii',0,4)==='PAR1'&&
   bytes.toString('ascii',bytes.length-4)==='PAR1'&&
   bytes.readUInt32LE(bytes.length-8)>0&&bytes.readUInt32LE(bytes.length-8)<=bytes.length-12,
   'DC_R8_PARQUET_CONTAINER_INVALID');
  const digest=sha(bytes),auditFile=path.join(audits,name.replace('.parquet','.audit.json'));
  need(fs.existsSync(auditFile),'DC_R8_PARQUET_AUDIT_MISSING');
  const audit=JSON.parse(fs.readFileSync(auditFile,'utf8'));
  need(audit.date===day&&audit.sha256===digest&&audit.complete===true&&
   audit.source===SOURCE,'DC_R8_PARQUET_AUDIT_INVALID');
  const buffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
  const rows=await mod.parquetReadObjects({file:buffer,columns:['date','symbol','asset_type','close']});
  need(Array.isArray(rows),'DC_R8_PARQUET_ROWS_INVALID');
  const prices={};
  for(const row of rows){
   const symbol=typeof row?.symbol==='string'?row.symbol.toUpperCase():'';
   if(!SYMBOLS.includes(symbol))continue;
   need(dateOnly(row.date)===day&&positive(row.close)&&
    (!row.asset_type||String(row.asset_type).toLowerCase()==='etf')&&
    !Object.hasOwn(prices,symbol),'DC_R8_PARQUET_TARGET_ROW_INVALID_'+symbol);
   prices[symbol]=row.close;
  }
  if(SYMBOLS.some(s=>!positive(prices[s])))
   return {status:'MISSING_REAL_TARGET_ROWS',dates:results,missingDate:day};
  results.push({date:day,prices,fileSha256:digest,
   sourceStoredAt:new Date(fs.statSync(filename).mtimeMs).toISOString()});
 }
 return {status:'VERIFIED',dates:results};
}

export function calculateDcProvisionalR8({confirmed,gmh,parquet,now=Date.now()}={}){
 const baseDate=confirmed?.observationDate;
 need(confirmed?.status==='READY'&&confirmed.phase==='CONFIRMED'&&
  confirmed.theme==='데이터센터·전력'&&confirmed.etfs?.join(',')==='DTCR,GRID'&&
  confirmed.referenceSymbol==='SPY'&&confirmed.licensingRiskAcceptedByPublisher===true&&
  confirmed.methodologyVersion===DC_POWER_PROVISIONAL_METHOD&&
  confirmed.history?.length===252&&date(baseDate)&&score(confirmed.score)&&
  confirmed.history.at(-1)?.date===baseDate&&confirmed.history.at(-1)?.score===confirmed.score,
  'DC_R8_CONFIRMED_D1_INVALID');
 need(confirmed.sourceVersion===`GMH_MANIFEST_SHA256_${gmh?.manifestSha256}`&&
  gmh?.common?.includes(baseDate),'DC_R8_CONFIRMED_SOURCE_DRIFT');
 need(parquet?.status==='VERIFIED'&&parquet.dates?.[0]?.date===baseDate,
  'DC_R8_SAVED_PARQUET_OVERLAP_REQUIRED');
 const pending=parquet.dates.slice(1);
 if(!pending.length)return {status:'NO_NEW_VERIFIED_PROVISIONAL',points:[]};
 need(pending.length<=2&&pending.every((p,i)=>date(p.date)&&p.date>baseDate&&
  (i===0||p.date>pending[i-1].date)&&Date.parse(p.date+'T00:00:00Z')<=now&&
  SYMBOLS.every(s=>positive(p.prices?.[s]))),'DC_R8_PENDING_DATE_OR_PRICE_INVALID');
 const overlap=parquet.dates[0],bridge={};
 for(const s of SYMBOLS){
  const base=gmh.tables?.[s]?.get(baseDate);
  need(positive(base)&&positive(overlap.prices[s]),'DC_R8_OVERLAP_PRICE_MISSING_'+s);
  bridge[s]=Math.abs(overlap.prices[s]/base-1);
  need(bridge[s]<=0.05,'DC_R8_PRICE_MODE_BRIDGE_FAILED_'+s);
 }
 const end=gmh.common.indexOf(baseDate);
 need(end>=627&&gmh.common[end]===baseDate,'DC_R8_628_BASE_LOOKBACK_MISSING');
 const days=gmh.common.slice(end-627,end+1);
 const baseline=Object.fromEntries(SYMBOLS.map(s=>[s,days.map(day=>gmh.tables[s].get(day))]));
 const baseEtf= ['DTCR','GRID'].map(s=>scoreAll252(baseline[s],baseline.SPY).at(-1));
 need(Number(((baseEtf[0]+baseEtf[1])/2).toFixed(5))===confirmed.score,
  'DC_R8_R188_CONFIRMED_REPLAY_MISMATCH');
 const points=[];
 for(let i=0;i<pending.length;i++){
  const spy=[...baseline.SPY,...pending.slice(0,i+1).map(p=>p.prices.SPY)];
  const s=['DTCR','GRID'].map(sym=>scoreAll252(
   [...baseline[sym],...pending.slice(0,i+1).map(p=>p.prices[sym])],spy).at(-1));
  const value=Number(((s[0]+s[1])/2).toFixed(5));
  need(score(value),'DC_R8_PROVISIONAL_SCORE_INVALID');
  points.push({date:pending[i].date,score:value,etfs:['DTCR','GRID']});
 }
 const sourceStoredAt=pending.map(p=>p.sourceStoredAt).sort().at(-1);
 const sourceVersion='DC_POWER_R8_'+sha(Buffer.from(JSON.stringify({base:baseDate,
  manifest:gmh.manifestSha256,files:parquet.dates.map(p=>[p.date,p.fileSha256])})));
 const record={status:'READY',version:DC_POWER_PROVISIONAL_VERSION,phase:'PROVISIONAL',
  theme:'데이터센터·전력',etfs:['DTCR','GRID'],referenceSymbol:'SPY',
  methodologyVersion:DC_POWER_PROVISIONAL_METHOD,individualStocksUsed:0,
  publicationAuthorized:true,derivedOnlyNoRaw:true,
  licensingRiskAcceptedByPublisher:confirmed.licensingRiskAcceptedByPublisher===true,
  upstreamCommercialRightsVerified:false,derivedLicenseVerified:false,sourcePriceReconciled:false,
  sourcePriceMode:DC_POWER_PROVISIONAL_PRICE_MODE,
  sourceName:'MARKETPARQUET_ALREADY_STORED_SEVEN_THEME_ARCHIVE',
  sourceVersion,sourceStoredAt,sourceTimestampBasis:'LOCAL_PARQUET_FILE_MTIME',
  confirmedObservationDate:baseDate,confirmedScore:confirmed.score,
  observationDate:points.at(-1).date,points,overlapPriceDifferences:bridge,
  sourceFiles:parquet.dates.map(p=>({date:p.date,sha256:p.fileSha256})),
  asOf:new Date(now).toISOString()};
 return {status:'PRIVATE_PROVISIONAL_CANDIDATE',record,points};
}

export async function buildDcProvisionalFromStorageR8({dataRoot,confirmed,now=Date.now(),decoder}={}){
 // The immutable confirmed R1 candidate must replay exactly before any append.
 const candidate=calculateDataCenterPower({dataRoot});
 need(candidate.observationDate===confirmed?.observationDate&&
  candidate.score===confirmed.score&&candidate.sourceVersion===confirmed.sourceVersion&&
  candidate.history.length===confirmed.history.length&&
  candidate.history.every((p,i)=>p.date===confirmed.history[i].date&&
   p.score===confirmed.history[i].score),'DC_R8_CONFIRMED_HISTORY_PARITY_FAILED');
 const gmh=readVerifiedDcGmhR8(dataRoot);
 const parquet=await readDcParquetR8(dataRoot,{confirmedDate:confirmed.observationDate,decoder});
 if(parquet.status!=='VERIFIED')return parquet;
 return calculateDcProvisionalR8({confirmed,gmh,parquet,now});
}
