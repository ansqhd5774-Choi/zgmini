// R40 read-only: R23 raw 1h versus already saved MarketParquet adjusted EOD.
// A price-mode comparison is NOT a certificate of equivalent data or publication.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {selectRealHourlySessions} from './theme-nine-r25-approved-selector.mjs';
import {readNineR39VerifiedSnapshots,inspectNineR39WithRows}
 from './theme-nine-r39-parquet-coverage.mjs';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT='E:\\ZGmini\\data';
const EOD_SOURCE='MARKETPARQUET_ETF_DAILY_SPLIT_ADJUSTED';
const R23_SHA='8c6aa292da35310ce37093b73a331177582fb741d16d8a6423bee7413ddbcdb5';
const MAX_SCAN=628,BASE='2026-10-23',NEXT='2026-10-26';
const sha=b=>createHash('sha256').update(b).digest('hex');
const fail=c=>{throw Object.assign(new Error('R40_'+c),{code:'R40_'+c});};
const positive=n=>typeof n==='number'&&Number.isFinite(n)&&n>0;
const round=n=>Math.round(n*10000)/10000;
function readDay(x){
 if(x instanceof Date&&!Number.isNaN(x.valueOf()))return x.toISOString().slice(0,10);
 if(typeof x==='string'&&/^\d{4}-\d{2}-\d{2}/.test(x))return x.slice(0,10);
 if(Number.isInteger(x)&&x>=10000&&x<100000)
  return new Date(x*86400000).toISOString().slice(0,10);
 if(typeof x==='bigint'&&x>100000000000n)
  return new Date(Number(x>100000000000000n?x/1000n:x)).toISOString().slice(0,10);
 if(typeof x==='number'&&Number.isFinite(x)&&x>100000000000)
  return new Date(x>100000000000000?x/1000:x).toISOString().slice(0,10);
 return null;
}
function eodPrices(rows,date,approved){
 if(!Array.isArray(rows))fail('EOD_NOT_ARRAY_'+date);
 const wanted=new Set([...approved,'SPY']),found=new Map();
 for(const row of rows){
  if(!row||typeof row.symbol!=='string')continue;
  const s=row.symbol.toUpperCase();
  if(!wanted.has(s))continue;
  if(readDay(row.date??row.timestamp)!==date||!positive(row.close)||
   row.asset_type&&String(row.asset_type).toLowerCase()!=='etf'||found.has(s))
   fail('EOD_DRIFT_'+date+'_'+s);
  found.set(s,row.close);
 }
 return found;
}

export function analyzeNineR40Overlap({roster,eodByDate,proxyBySymbol,inventoryCount}={}){
 if(roster?.schema!=='zgmini.theme-nine.r20-approved-three-gate-candidates.v1'||
  roster.counts?.themes!==9||roster.counts.positions!==64||
  roster.counts.uniqueTickers!==63||!Array.isArray(roster.groups))fail('ROSTER');
 const names=[...new Set(roster.groups.flatMap(g=>g.tickers.map(x=>x.ticker)))].sort();
 if(names.length!==63||!(eodByDate instanceof Map)||
  !(proxyBySymbol instanceof Map)||!Number.isInteger(inventoryCount)||
  inventoryCount<eodByDate.size)fail('INPUT');
 const dates=[...eodByDate.keys()].sort();
 if(dates.some(d=>! /^\d{4}-\d{2}-\d{2}$/.test(d)))fail('DATE');
 const decoded=new Map(dates.map(d=>[d,eodPrices(eodByDate.get(d),d,names)]));
 const spyDays=dates.filter(d=>decoded.get(d).has('SPY'));
 const compare={},maturity={};
 for(const s of ['SPY',...names]){
  const rows=proxyBySymbol.get(s);
  if(!Array.isArray(rows))fail('R23_PROXY_MISSING_'+s);
  const raw=new Map();
  for(const row of rows){
   if(! /^\d{4}-\d{2}-\d{2}$/.test(row.date)||!positive(row.close)||
    raw.has(row.date))fail('R23_PROXY_DRIFT_'+s);
   raw.set(row.date,row.close);
  }
  const actual=spyDays.filter(d=>decoded.get(d).has(s));
  const overlap=actual.filter(d=>raw.has(d))
   .map(d=>({date:d,raw:raw.get(d),eod:decoded.get(d).get(s)}));
  const closeDiff=overlap.map(o=>1e4*(o.eod/o.raw-1));
  const returnDiff=overlap.slice(1).map((o,i)=>{
   const prior=overlap[i];
   return 1e4*((o.eod/prior.eod-1)-(o.raw/prior.raw-1));
  });
  compare[s]={overlapSessions:overlap.length,
   latestOverlapDate:overlap.at(-1)?.date??null,
   latestPriceBasisDifferenceBps:closeDiff.length?round(closeDiff.at(-1)):null,
   maxAbsPriceBasisDifferenceBps:closeDiff.length?
    round(Math.max(...closeDiff.map(Math.abs))):null,
   returnIntervalsCompared:returnDiff.length,
   maxAbsReturnDifferenceBps:returnDiff.length?
    round(Math.max(...returnDiff.map(Math.abs))):null};
  if(s==='SPY')continue;
  maturity[s]={observedSavedEodWithSpy:actual.length,
   lowerBoundOnly:inventoryCount>MAX_SCAN||dates.length<inventoryCount,
   atLeast40:actual.length>=40,atLeast377:actual.length>=377,
   atLeast628:actual.length>=628};
 }
 return {
  contract:'THEME_NINE_R40_READONLY_CROSS_PRICE_MODE_AUDIT_V1',
  status:'SOURCE_AUDIT_COMPLETE_PRICE_MODE_BRIDGE_NOT_CERTIFIED',
  verifiedEodSessionFiles:dates.length,storedEodFileInventory:inventoryCount,
  scannedEodFirstDate:dates[0]??null,scannedEodLastDate:dates.at(-1)??null,
  scannedSpyEodSessions:spyDays.length,
  r39BaseDayPresent:decoded.has(BASE),r39NextDayPresent:decoded.has(NEXT),
  eodNextDayETFCount:names.filter(s=>decoded.get(NEXT)?.has(s)).length,
  r23AndEodOverlapSymbols:names.filter(s=>compare[s].overlapSessions>0).length,
  r23AndEodTwoOrMoreDates:names.filter(s=>compare[s].overlapSessions>=2).length,
  spyOverlap:compare.SPY,
  etfComparison:Object.fromEntries(names.map(s=>[s,compare[s]])),
  maturityByETF:maturity,
  themeRows:roster.groups.map(g=>{const ss=g.tickers.map(t=>t.ticker);return{
   theme:g.theme,rosterPositions:ss.length,
   observedNextDay:ss.filter(s=>decoded.get(NEXT)?.has(s)).length,
   eod40Confirmed:ss.filter(s=>maturity[s].atLeast40).length,
   eod377Confirmed:ss.filter(s=>maturity[s].atLeast377).length,
   eod628Confirmed:ss.filter(s=>maturity[s].atLeast628).length};}),
  priceModeAlignmentAuthorized:false,publicationAuthorized:false,
  provisionalCalculation:'NOT_PERFORMED_SEPARATE_PRICE_MODES',
  providerCalls:0,rawWrites:0,dbWrites:0,d1Writes:0,schedulerWrites:0
 };
}

function inVerifiedRoot(root,relative){
 const target=fs.realpathSync(path.join(root,...relative.split('/')));
 const rel=path.relative(root,target);
 if(!rel||rel==='..'||rel.startsWith('..'+path.sep)||path.isAbsolute(rel))
  fail('R23_PATH_ESCAPE');
 return target;
}
function loadImmutableR23(dataRoot,approved){
 const home=fs.realpathSync(path.join(dataRoot,'themes','legacy-nine-r23'));
 const bytes=fs.readFileSync(path.join(home,'raw-manifest.json'));
 if(sha(bytes)!==R23_SHA)fail('R23_MANIFEST_SHA_DRIFT');
 const manifest=JSON.parse(bytes.toString('utf8'));
 if(manifest.project!=='legacy-nine-r23'||manifest.files?.length!==121||
  manifest.source!=='https://getmarkethistory.com')fail('R23_MANIFEST_CONTRACT');
 const wanted=new Set([...approved,'SPY']);
 const all=new Map([...wanted].map(s=>[s,[]])),last=new Map();
 for(const entry of manifest.files){
  if(!wanted.has(entry.symbol)||
   ! /^raw\/[A-Z][A-Z0-9.]{0,11}_[a-f0-9]{64}\.jsonl$/.test(entry.path)||
   entry.path!=='raw/'+entry.symbol+'_'+entry.sha256+'.jsonl'||
   entry.priceMode!=='RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE')
   fail('R23_RAW_MANIFEST_ENTRY');
  const b=fs.readFileSync(inVerifiedRoot(home,entry.path));
  if(sha(b)!==entry.sha256)fail('R23_PAGE_SHA_'+entry.symbol);
  for(const line of b.toString('utf8').split(/\r?\n/)){
   if(!line)continue;
   const row=JSON.parse(line);
   if(row.symbol!==entry.symbol||typeof row.timestamp!=='string'||
    last.get(entry.symbol)&&row.timestamp<=last.get(entry.symbol))
    fail('R23_BAR_ORDER_'+entry.symbol);
   last.set(entry.symbol,row.timestamp);
   if(row.is_gap===true)continue;
   if(!positive(row.close))fail('R23_BAR_PRICE_'+entry.symbol);
   all.get(entry.symbol).push({timestamp:row.timestamp,close:row.close});
  }
 }
 return new Map([...all].map(([s,bars])=>[s,selectRealHourlySessions(bars)]));
}
function inventory(dataRoot){
 const base=path.join(dataRoot,'theme-market-history-r131','marketparquet-r165');
 const days=fs.readdirSync(base).map(n=>
  /^etf_daily_(\d{4}-\d{2}-\d{2})\.parquet$/.exec(n)?.[1])
  .filter(Boolean).filter(d=>d<=NEXT).sort();
 if(!days.includes(BASE)||!days.includes(NEXT))fail('R39_SOURCE_MISSING_IN_INVENTORY');
 return days;
}
async function auditedEod(dataRoot,date,decoder){
 const root=path.join(dataRoot,'theme-market-history-r131');
 const parquet=path.join(root,'marketparquet-r165','etf_daily_'+date+'.parquet');
 const evidence=path.join(root,'marketparquet-r167','etf_daily_'+date+'.audit.json');
 if(!fs.existsSync(evidence))fail('EOD_AUDIT_MISSING_'+date);
 const b=fs.readFileSync(parquet),digest=sha(b);
 if(b.length<12||b.toString('ascii',0,4)!=='PAR1'||
  b.toString('ascii',b.length-4)!=='PAR1')fail('EOD_FORMAT_'+date);
 const a=JSON.parse(fs.readFileSync(evidence,'utf8'));
 if(a.date!==date||a.sha256!==digest||a.complete!==true||
  a.source!==EOD_SOURCE)fail('EOD_AUDIT_DRIFT_'+date);
 const bytes=b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);
 const rows=await decoder.parquetReadObjects({file:bytes});
 if(!Array.isArray(rows))fail('EOD_DECODE_'+date);
 return rows;
}
export async function inspectNineR40SavedPC({dataRoot=DEFAULT_ROOT}={}){
 const {roster,baseRows,nextRows,parquetDecoder}=await
  readNineR39VerifiedSnapshots({dataRoot});
 const r39=inspectNineR39WithRows({roster,baseRows,nextRows});
 if(!r39.spyPresentBase||!r39.spyPresentNext||r39.presentBothDates!==54)
  fail('R39_EVIDENCE_NOT_54');
 const names=[...new Set(roster.groups.flatMap(g=>g.tickers.map(t=>t.ticker)))].sort();
 const allDays=inventory(dataRoot),days=allDays.slice(-MAX_SCAN);
 const eodByDate=new Map();
 const wanted=new Set([...names,'SPY']);
 for(const d of days){
  const rows=d===BASE?baseRows:d===NEXT?nextRows:
   await auditedEod(dataRoot,d,parquetDecoder);
  // Hold only 64 approved symbols, not millions of unrelated parquet rows.
  eodByDate.set(d,rows.filter(r=>r&&typeof r.symbol==='string'&&
   wanted.has(r.symbol.toUpperCase())));
 }
 const proxyBySymbol=loadImmutableR23(dataRoot,names);
 const result=analyzeNineR40Overlap({roster,eodByDate,proxyBySymbol,
  inventoryCount:allDays.length});
 return {...result,rosterSha256:r39.rosterSha256,r23ManifestSha256:R23_SHA,
  r39BaseParquetSha256:'4f0bbb08f4a67818209d6d32d465006111c6d6b0c958caf7f9202a49ca8c8f45',
  r39NextParquetSha256:'002465943c1cdb51191d528032652ad87ee0ab06f6bacb163b1ff4ce04a9174a'};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 let out;
 try{
  if(process.argv.length!==3||process.argv[2]!=='--inspect')fail('USAGE');
  out=await inspectNineR40SavedPC({dataRoot:process.env.ZGMINI_DATA_ROOT||DEFAULT_ROOT});
 }catch(err){
  out={status:'STOP_R40_READONLY_AUDIT',error:err.code||'UNEXPECTED_ERROR',
   detail:err.code?undefined:String(err.message).slice(0,220),
   providerCalls:0,rawWrites:0,dbWrites:0,d1Writes:0,schedulerWrites:0};
  process.exitCode=1;
 }
 try{
  const name='THEME_NINE_R40_PRICE_MODE_RESULT_'+
   new Date().toISOString().replace(/[-:.TZ]/g,'').slice(0,14)+'_'+process.pid+'.txt';
  const target=path.join(HERE,name);
  const fields=Object.entries(out).map(([k,v])=>k.toUpperCase()+'='+
   (v!==null&&typeof v==='object'?JSON.stringify(v):v)).join('\r\n');
  fs.writeFileSync(target,'REPORT=THEME_NINE_R40_PRICE_MODE_OVERLAP\r\n'+fields+'\r\n',
   {encoding:'utf8',flag:'wx'});
  process.stdout.write(JSON.stringify({status:out.status,reportFile:target,
   scannedEod:out.verifiedEodSessionFiles??null,
   overlapSymbols:out.r23AndEodOverlapSymbols??null},null,2)+'\n');
 }catch(err){process.stderr.write('R40_REPORT_WRITE_FAILED '+String(err.message)+'\n');
  process.exitCode=1;}
}
