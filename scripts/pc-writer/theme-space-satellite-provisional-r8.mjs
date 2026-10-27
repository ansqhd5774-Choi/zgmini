// Additive R8 Space provisional computation, reading ONLY previously persisted,
// SHA-audited GMH hourly source and seven-theme MarketParquet daily archive.
// Uses the approved R32 basket, adaptive timeline and dated issuer AUM as-is.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {readApprovedSpacePrices} from './theme-space-satellite-operational-r28.mjs';
import {readVerifiedSharedSpy} from './theme-shared-spy-readonly-r1.mjs';
import {selectRealHourlySessions} from './theme-space-satellite-adaptive-r2.mjs';
import {scoreAdaptiveTimeline} from './theme-optional-adaptive-r2.mjs';
import {calculateApprovedSpaceBasket} from './theme-space-satellite-approved-r27.mjs';
import {SPACE_PROVISIONAL_VERSION,SPACE_PROVISIONAL_METHOD,
 SPACE_PROVISIONAL_PRICE_MODE} from '../../worker/theme-space-satellite-provisional-r1.mjs';

export const SPACE_PROVISIONAL_SOURCE='MARKETPARQUET_ALREADY_STORED_SEVEN_THEME_ARCHIVE';
const parquetMode='MARKETPARQUET_ETF_DAILY_SPLIT_ADJUSTED';
const rosterPath=new URL('./theme-space-satellite-r26-approved-roster.json',import.meta.url);
const aumPath=new URL('./theme-space-satellite-r23-dated-aum-evidence.json',import.meta.url);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const check=(ok,code)=>{if(!ok)throw Object.assign(new Error(code),{code});};
const positive=n=>typeof n==='number'&&Number.isFinite(n)&&n>0;
const score=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=100;
const date=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&
 Number.isFinite(Date.parse(s+'T00:00:00Z'))&&
 new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
const dateOnly=x=>x instanceof Date?x.toISOString().slice(0,10):
 typeof x==='string'?x.slice(0,10):Number.isInteger(x)&&x>10000&&x<100000?
 new Date(x*86400000).toISOString().slice(0,10):null;

async function existingHyparquet({dataRoot,location}){
 try{const m=await import('hyparquet');if(typeof m.parquetReadObjects==='function')return m;}catch{}
 const roots=[process.env.ZGMINI_HYPARQUET_MODULE,
  path.join(dataRoot,'theme-market-history-r131','marketparquet-r167','node_modules','hyparquet','src','index.js'),
  path.join(path.dirname(location),'..','marketparquet-r167','node_modules','hyparquet','src','index.js')];
 const projects=path.join(dataRoot,'projects');
 if(fs.existsSync(projects))for(const name of fs.readdirSync(projects).slice(0,80)){
  roots.push(path.join(projects,name,'node_modules','hyparquet','src','index.js'));
  roots.push(path.join(projects,name,'zgmini','node_modules','hyparquet','src','index.js'));
 }
 for(const file of roots){
  if(typeof file!=='string'||!fs.existsSync(file))continue;
  try{const m=await import(pathToFileURL(fs.realpathSync(file)).href);
   if(typeof m.parquetReadObjects==='function')return m;}catch{}
 }
 check(false,'SPACE_R8_APPROVED_EXISTING_PARQUET_DECODER_MISSING');
}

export async function readSpaceParquetR8(dataRoot,{confirmedDate,decoder}={}){
 check(date(confirmedDate),'SPACE_R8_CONFIRMED_DATE_INVALID');
 const parent=path.join(dataRoot,'theme-market-history-r131');
 const archive=path.join(parent,'marketparquet-r165');
 const audits=path.join(parent,'marketparquet-r167');
 check(fs.existsSync(archive)&&fs.existsSync(audits),'SPACE_R8_SAVED_SEVEN_ARCHIVE_MISSING');
 const files=fs.readdirSync(archive).filter(n=>/^etf_daily_\d{4}-\d{2}-\d{2}\.parquet$/.test(n))
  .map(name=>({name,date:name.slice(10,20)})).filter(x=>x.date>=confirmedDate)
  .sort((a,b)=>a.date.localeCompare(b.date));
 if(files[0]?.date!==confirmedDate)return {status:'NO_VERIFIED_BASE_OVERLAP',dates:[]};
 if(files.length>3)return {status:'CONFIRMED_REFRESH_NEEDED_FOR_BACKLOG',dates:[]};
 const target=files.slice(0,3);
 const columns=['date','symbol','asset_type','close'];
 const symbols=['SPY','UFO','NASA','WARP','ROKT'];
 const results=[];
 for(const {name,date:day} of target){
  const location=path.join(archive,name),bytes=fs.readFileSync(location);
  check(bytes.length>=12&&bytes.toString('ascii',0,4)==='PAR1'&&
   bytes.toString('ascii',bytes.length-4)==='PAR1'&&
   bytes.readUInt32LE(bytes.length-8)>0&&bytes.readUInt32LE(bytes.length-8)<=bytes.length-12,
   'SPACE_R8_PARQUET_CONTAINER_INVALID');
  const digest=sha(bytes),auditFile=path.join(audits,name.replace('.parquet','.audit.json'));
  check(fs.existsSync(auditFile),'SPACE_R8_PARQUET_AUDIT_MISSING');
  const audit=JSON.parse(fs.readFileSync(auditFile,'utf8'));
  check(audit.date===day&&audit.sha256===digest&&audit.complete===true&&
   audit.source===parquetMode,'SPACE_R8_PARQUET_AUDIT_MISMATCH');
  const m=decoder??await existingHyparquet({dataRoot,location});
  check(typeof m?.parquetReadObjects==='function','SPACE_R8_PARQUET_DECODER_INVALID');
  const buffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
  const rows=await m.parquetReadObjects({file:buffer,columns});
  check(Array.isArray(rows),'SPACE_R8_PARQUET_ROWS_INVALID');
  const prices={};
  for(const row of rows){
   const sym=typeof row?.symbol==='string'?row.symbol.toUpperCase():'';
   if(!symbols.includes(sym))continue;
   check(dateOnly(row.date)===day&&positive(row.close)&&
    (!row.asset_type||String(row.asset_type).toLowerCase()==='etf')&&
    !Object.hasOwn(prices,sym),'SPACE_R8_PARQUET_TARGET_ROW_INVALID_'+sym);
   prices[sym]=row.close;
  }
  results.push({date:day,prices,fileSha256:digest,
   sourceStoredAt:new Date(fs.statSync(location).mtimeMs).toISOString()});
 }
 return {status:'VERIFIED',dates:results};
}

export function calculateSpaceProvisionalR8({confirmed,roster,evidence,original,spy,
 parquet,now=Date.now()}={}){
 const baseDate=confirmed?.observationDate;
 check(confirmed?.status==='READY'&&confirmed.phase==='CONFIRMED'&&date(baseDate)&&
  confirmed.theme==='우주·위성'&&confirmed.referenceSymbol==='SPY'&&
  confirmed.methodologyVersion===SPACE_PROVISIONAL_METHOD&&
  confirmed.history?.length===252&&confirmed.history.at(-1)?.date===baseDate&&
  confirmed.history.at(-1)?.score===confirmed.score&&score(confirmed.score),
  'SPACE_R8_CONFIRMED_R32_INPUT_INVALID');
 check(roster?.selectionApproved===true&&roster.maximumEtfCount===null&&
  roster.approvedThreePlusWeighting==='NORMALIZED_DATED_OFFICIAL_AUM'&&
  roster.approvedCurrentSymbols?.join(',')==='UFO,NASA,WARP,ROKT'&&
  evidence?.rows?.length===4,'SPACE_R8_APPROVED_ROSTER_OR_AUM_DRIFT');
 const symbols=roster.approvedCurrentSymbols;
 check(original?.symbols?.join(',')===symbols.join(',')&&
  /^[a-f0-9]{64}$/.test(original.manifestSha256??'')&&
  spy?.priceMode==='RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE'&&
  /^[a-f0-9]{64}$/.test(spy.manifestSha256??''),
  'SPACE_R8_SAVED_GMH_MANIFEST_MISSING');
 check(confirmed.sourceVersion===`GMH_MANIFEST_SHA256_${original.manifestSha256}`+
  `_SPY_SHA256_${spy.manifestSha256}`,
  'SPACE_R8_CONFIRMED_MANIFEST_PROVENANCE_DRIFT');
 const spySessions=selectRealHourlySessions(spy.bars);
 check(spySessions.at(-1)?.date===baseDate&&
  symbols.every(s=>original.sessions[s]?.at(-1)?.date<=baseDate),
  'SPACE_R8_CONFIRMED_GMH_ANCHOR_DRIFT');
 check(parquet?.status==='VERIFIED'&&parquet.dates?.[0]?.date===baseDate,
  'SPACE_R8_SAVED_PARQUET_OVERLAP_REQUIRED');
 const pending=parquet.dates.slice(1);
 if(!pending.length)return {status:'NO_NEW_VERIFIED_PROVISIONAL',points:[]};
 check(pending.length<=2&&pending.every((p,i)=>date(p.date)&&p.date>baseDate&&
  (i===0||p.date>pending[i-1].date)&&Date.parse(p.date+'T00:00:00Z')<=now&&
  positive(p.prices?.SPY)),'SPACE_R8_DAILY_DATES_OR_SPY_MISSING');
 const priceByDate=Object.fromEntries(symbols.map(s=>[s,new Map(
  original.sessions[s].filter(r=>r.date<=baseDate).map(r=>[r.date,r.close]))]));
 const overlap=parquet.dates[0],bridge={};
 for(const s of ['UFO','NASA','ROKT','SPY']){
  const old=s==='SPY'?spySessions.find(x=>x.date===baseDate)?.close:
   priceByDate[s].get(baseDate);
  check(positive(old)&&positive(overlap.prices[s]),'SPACE_R8_OVERLAP_PRICE_MISSING_'+s);
  bridge[s]=Math.abs(overlap.prices[s]/old-1);
  check(bridge[s]<=0.05,'SPACE_R8_PRICE_MODE_BRIDGE_FAILED_'+s);
 }
 const benchmark=[...spySessions],outputs=[];
 const build=()=>{
  const days=benchmark.map(p=>p.date),timelines={},observed={},sessionCounts={};
  for(const symbol of symbols){
   observed[symbol]=new Set(priceByDate[symbol].keys());
   let count=0;
   sessionCounts[symbol]=new Map(days.map(day=>{
    if(priceByDate[symbol].has(day))count++;
    return [day,count];
   }));
   timelines[symbol]=scoreAdaptiveTimeline(benchmark.map(p=>({date:p.date,
    own:priceByDate[symbol].get(p.date)??null,spy:p.close})));
  }
  return calculateApprovedSpaceBasket({dates:days,symbols,timelines,observed,
   sessionCounts,aumEvidence:evidence.rows,scoreAsOf:days.at(-1),
   historicalSingleContinuity:true});
 };
 const before=build();
 check(before.latest?.date===baseDate&&before.latest.score===confirmed.score&&
  before.latest.status==='APPROVED_THREE_PLUS_AUM',
  'SPACE_R8_R32_CONFIRMED_REPLAY_MISMATCH');
 let previousScore=before.latest.score;
 for(const p of pending){
  benchmark.push({date:p.date,close:p.prices.SPY});
  for(const s of symbols)if(positive(p.prices[s]))priceByDate[s].set(p.date,p.prices[s]);
  const next=build();
  check(next.history.at(-2)?.score===previousScore&&next.latest?.date===p.date&&
   next.latest.status==='APPROVED_THREE_PLUS_AUM'&&score(next.latest.score)&&
   next.latest.etfs.length>=3,'SPACE_R8_PROVISIONAL_REAL_COVERAGE_INCOMPLETE');
  outputs.push({date:p.date,score:next.latest.score,
   etfs:[...next.latest.etfs],weightsPercent:{...next.latest.weightsPercent}});
  previousScore=next.latest.score;
 }
 const last=outputs.at(-1),storedAt=pending.map(p=>p.sourceStoredAt).sort().at(-1);
 const hashInput={base:baseDate,spaceManifest:original.manifestSha256,
  spyManifest:spy.manifestSha256,aumDates:evidence.rows.map(r=>[r.symbol,r.aumAsOf,r.aumUsd]),
  files:parquet.dates.map(p=>[p.date,p.fileSha256])};
 const result={status:'READY',version:SPACE_PROVISIONAL_VERSION,phase:'PROVISIONAL',
  theme:'우주·위성',referenceSymbol:'SPY',methodologyVersion:SPACE_PROVISIONAL_METHOD,
  individualStocksUsed:0,approvedBasket:true,publicationAuthorized:true,
  derivedOnlyNoRaw:true,upstreamCommercialRightsVerified:false,
  derivedLicenseVerified:false,sourcePriceReconciled:false,
  sourcePriceMode:SPACE_PROVISIONAL_PRICE_MODE,sourceName:SPACE_PROVISIONAL_SOURCE,
  sourceVersion:'SPACE_R8_'+sha(Buffer.from(JSON.stringify(hashInput))),
  sourceStoredAt:storedAt,sourceTimestampBasis:'LOCAL_PARQUET_FILE_MTIME',
  confirmedObservationDate:baseDate,confirmedScore:confirmed.score,
  observationDate:last.date,points:outputs,
  aumAsOf:Object.fromEntries(evidence.rows.map(r=>[r.symbol,r.aumAsOf])),
  overlapPriceDifferences:bridge,
  sourceFiles:parquet.dates.map(p=>({date:p.date,sha256:p.fileSha256})),
  asOf:new Date(now).toISOString()};
 return {status:'PRIVATE_PROVISIONAL_CANDIDATE',record:result,points:outputs};
}

export async function buildSpaceProvisionalFromStorageR8({dataRoot,confirmed,now=Date.now(),decoder}={}){
 const roster=JSON.parse(fs.readFileSync(rosterPath,'utf8'));
 const evidence=JSON.parse(fs.readFileSync(aumPath,'utf8'));
 const original=readApprovedSpacePrices({dataRoot,symbols:roster.approvedCurrentSymbols});
 const spy=readVerifiedSharedSpy({dataRoot,sourceTheme:'data-center-power'});
 const parquet=await readSpaceParquetR8(dataRoot,{confirmedDate:confirmed.observationDate,decoder});
 if(parquet.status!=='VERIFIED')return parquet;
 return calculateSpaceProvisionalR8({confirmed,roster,evidence,original,spy,parquet,now});
}
