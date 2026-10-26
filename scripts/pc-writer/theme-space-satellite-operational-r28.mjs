// R28 PC-owned dynamic read path: approved space ETF prices + shared stored SPY.
// No new data source, account, collection attempt, D1/public write or scheduler.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {readVerifiedSharedSpy} from './theme-shared-spy-readonly-r1.mjs';
import {selectRealHourlySessions} from './theme-space-satellite-adaptive-r2.mjs';
import {scoreAdaptiveTimeline} from './theme-optional-adaptive-r2.mjs';
import {calculateApprovedSpaceBasket} from './theme-space-satellite-approved-r27.mjs';

const SOURCE='https://getmarkethistory.com';
const PRICE_MODE='RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const need=(ok,code)=>{if(!ok)throw Object.assign(new Error(code),{code});};
const within=(root,target)=>{const relative=path.relative(root,target);
 return relative!==''&&relative!=='..'&&!relative.startsWith('..'+path.sep)&&
  !path.isAbsolute(relative);};
const validDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&
 Number.isFinite(Date.parse(value+'T00:00:00Z'))&&
 new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;

export function readApprovedSpacePrices({dataRoot,symbols}={}){
 need(typeof dataRoot==='string'&&fs.existsSync(dataRoot)&&
  Array.isArray(symbols)&&symbols.length>=3&&new Set(symbols).size===symbols.length&&
  symbols.every(symbol=>/^[A-Z][A-Z0-9.-]{0,15}$/.test(symbol)),
 'SPACE_R28_READ_ARGS_INVALID');
 const root=fs.realpathSync(dataRoot),home=fs.realpathSync(path.join(root,'themes','space-satellite'));
 need(within(root,home),'SPACE_R28_RAW_HOME_ESCAPE');
 const filename=fs.realpathSync(path.join(home,'raw-manifest.json'));
 need(within(home,filename)&&fs.statSync(filename).size<=2_000_000,
 'SPACE_R28_MANIFEST_INVALID');
 const bytes=fs.readFileSync(filename),manifest=JSON.parse(bytes);
 need(manifest.version===1&&manifest.themeId==='space-satellite'&&
  Array.isArray(manifest.files),'SPACE_R28_MANIFEST_IDENTITY');
 const collection=new Map(symbols.map(symbol=>[symbol,new Map()]));
 const files=new Map(symbols.map(symbol=>[symbol,0]));
 for(const item of manifest.files){
  need(typeof item?.path==='string'&&
   /^raw\/[A-Z][A-Z0-9.-]*_[a-f0-9]{64}\.jsonl$/.test(item.path)&&
   item.path.endsWith(item.sha256+'.jsonl')&&
   item.source===SOURCE&&item.priceMode===PRICE_MODE&&
   Number.isFinite(Date.parse(item.collectedAt))&&
   validDate(item.observationFrom)&&validDate(item.observationThrough),
   'SPACE_R28_RAW_ENTRY_INVALID');
  const symbol=item.path.slice(4).split('_')[0];
  if(!collection.has(symbol))continue; // Known excluded old raw is preserved.
  const file=fs.realpathSync(path.join(home,item.path));
  need(within(home,file)&&fs.statSync(file).size<=6_000_000,
   'SPACE_R28_RAW_PATH_INVALID');
  const raw=fs.readFileSync(file);
  need(sha(raw)===item.sha256,'SPACE_R28_RAW_SHA_MISMATCH');
  files.set(symbol,files.get(symbol)+1);
  let previous='',count=0;
  for(const line of raw.toString('utf8').split(/\r?\n/).filter(Boolean)){
   count++;need(count<=5000,'SPACE_R28_RAW_ROWS_UNBOUNDED');
   const row=JSON.parse(line);
   need(row.symbol===symbol&&typeof row.timestamp==='string'&&
    Number.isFinite(Date.parse(row.timestamp))&&
    Number.isFinite(row.close)&&row.close>0&&
    (!previous||row.timestamp>previous),'SPACE_R28_RAW_BAR_INVALID');
   previous=row.timestamp;
   if(row.is_gap===true)continue;
   const prior=collection.get(symbol).get(row.timestamp);
   need(!prior||prior.close===row.close,'SPACE_R28_OVERLAP_CONFLICT');
   collection.get(symbol).set(row.timestamp,row);
  }
 }
 need(symbols.every(symbol=>files.get(symbol)>0),'SPACE_R28_APPROVED_ETF_RAW_MISSING');
 return {manifestSha256:sha(bytes),symbols:[...symbols],files:Object.fromEntries(files),
  sessions:Object.fromEntries(symbols.map(symbol=>[symbol,
   selectRealHourlySessions([...collection.get(symbol).values()]
    .sort((a,b)=>a.timestamp.localeCompare(b.timestamp)))])),
  providerCalls:0,rawFilesWritten:0,d1Writes:0,publicWrites:0};
}

export function runApprovedSpacePcR28({dataRoot,
 rosterFile=new URL('./theme-space-satellite-r26-approved-roster.json',import.meta.url),
 aumFile=new URL('./theme-space-satellite-r23-dated-aum-evidence.json',import.meta.url),
 rawReader=readApprovedSpacePrices,spyReader=readVerifiedSharedSpy}={}){
 const roster=JSON.parse(fs.readFileSync(rosterFile,'utf8'));
 need(roster.version===1&&roster.theme==='space-satellite'&&
  roster.selectionApproved===true&&roster.maximumEtfCount===null&&
  roster.selectionPolicy==='ALL_CURRENTLY_ELIGIBLE_NO_FIXED_ETF_COUNT'&&
  roster.approvedThreePlusWeighting==='NORMALIZED_DATED_OFFICIAL_AUM'&&
  Array.isArray(roster.approvedCurrentSymbols)&&
  roster.approvedCurrentSymbols.length>=3&&
  roster.approvedCurrentSymbols.every(symbol=>
   !roster.excludedFromCurrentSelectionNoRetry?.includes(symbol)),
 'SPACE_R28_SELECTION_INVALID');
 const symbols=roster.approvedCurrentSymbols;
 const evidence=JSON.parse(fs.readFileSync(aumFile,'utf8'));
 const original=rawReader({dataRoot,symbols});
 const benchmark=spyReader({dataRoot,sourceTheme:'data-center-power'});
 need(benchmark?.bars?.length>0&&benchmark.priceMode===PRICE_MODE&&
  /^[a-f0-9]{64}$/.test(original.manifestSha256)&&
  /^[a-f0-9]{64}$/.test(benchmark.manifestSha256),
 'SPACE_R28_VERIFIED_RAW_REQUIRED');
 const benchmarkSessions=selectRealHourlySessions(benchmark.bars);
 const dates=benchmarkSessions.map(row=>row.date);
 need(dates.length>0,'SPACE_R28_BENCHMARK_EMPTY');
 const priceByDate=Object.fromEntries(symbols.map(symbol=>[symbol,
  new Map(original.sessions[symbol].map(row=>[row.date,row.close]))]));
 const timelines={},observed={},sessionCounts={};
 for(const symbol of symbols){
  observed[symbol]=new Set(priceByDate[symbol].keys());
  let n=0;
  sessionCounts[symbol]=new Map(dates.map(date=>{
   if(priceByDate[symbol].has(date))n++;
   return [date,n];
  }));
  timelines[symbol]=scoreAdaptiveTimeline(benchmarkSessions.map(row=>({
   date:row.date,own:priceByDate[symbol].get(row.date)??null,spy:row.close})));
 }
 const result=calculateApprovedSpaceBasket({dates,symbols,timelines,observed,
  sessionCounts,aumEvidence:evidence.rows,scoreAsOf:dates.at(-1)});
 return {report:'SPACE_SATELLITE_R28_PC_SAVED_SOURCE_ONLY',
  status:result.latest.score===null?'NO_CURRENT_ACTUAL_COMPOSITE_SCORE':
   'PRIVATE_CURRENT_APPROVED_BASKET_READY',
  sourceManifestSha256:original.manifestSha256,
  sharedSpyManifestSha256:benchmark.manifestSha256,
  benchmarkLastDate:dates.at(-1),individualScores:Object.fromEntries(symbols.map(symbol=>[
   symbol,timelines[symbol].at(-1).score===null?null:
    Number(timelines[symbol].at(-1).score.toFixed(5))])),
  ...result,publicationCompleted:false,sourcePriceMode:PRICE_MODE,
  providerCalls:0,rawFilesWritten:0,d1Writes:0,publicWrites:0,schedulerWrites:0};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.slice(2).join(' ')!=='--audit'){
  console.log('Usage: theme-space-satellite-operational-r28.mjs --audit (read only)');
 }else try{
  const result=runApprovedSpacePcR28({dataRoot:process.env.ZGMINI_DATA_ROOT??'E:/ZGmini/data'});
  console.log(JSON.stringify(result,null,2));
 }catch(error){
  console.error(JSON.stringify({report:'SPACE_SATELLITE_R28_PC_SAVED_SOURCE_ONLY',
   status:'AUDIT_FAILED',reason:error.code??error.message,
   providerCalls:0,rawFilesWritten:0,d1Writes:0,publicWrites:0,schedulerWrites:0}));
  process.exitCode=1;
 }
}
