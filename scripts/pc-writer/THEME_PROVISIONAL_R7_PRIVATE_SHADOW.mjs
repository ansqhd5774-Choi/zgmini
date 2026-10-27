// R7: Private-only 2026-10-26 shadow scores using approved, snapshotted functions.
// Reuses the R188 scoreAll252 and R32 per-date AUM basket, no new formula.
// Never creates D1, production, feed, registry, prices, scheduled tasks or publication.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {regularHour15Rows,scoreAll252} from './r7_approved/theme-optional-score-r188.mjs';
import {calculateDataCenterPower} from './r7_approved/theme-data-center-power-r1.mjs';
import {readApprovedSpacePrices} from './r7_approved/theme-space-satellite-raw-r28-pure.mjs';
import {readVerifiedSharedSpy} from './r7_approved/theme-shared-spy-readonly-r1.mjs';
import {selectRealHourlySessions} from './r7_approved/theme-space-satellite-adaptive-r2.mjs';
import {scoreAdaptiveTimeline} from './r7_approved/theme-optional-adaptive-r2.mjs';
import {calculateApprovedSpaceBasket} from './r7_approved/theme-space-satellite-basket-r27-pure.mjs';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const OUT=path.join(HERE,'THEME_PROVISIONAL_R7_PRIVATE_SHADOW_RESULT.txt');
const DATA='E:\\ZGmini\\data';
const BASE='2026-10-23',NEXT='2026-10-26';
const POWER=['DTCR','GRID'],BENCH='SPY';
const ROSTER_PATH=path.join(HERE,'r7_approved','theme-space-satellite-r26-approved-roster.json');
const AUM_PATH=path.join(HERE,'r7_approved','theme-space-satellite-r23-dated-aum-evidence.json');
const R8=path.join(DATA,'themes','biotech','source-r8','scripts','pc-writer','theme-biotech-provisional-r8.mjs');
const ARCHIVE=path.join(DATA,'theme-market-history-r131','marketparquet-r165');
const AUDITS=path.join(DATA,'theme-market-history-r131','marketparquet-r167');
const SOURCE='MARKETPARQUET_ETF_DAILY_SPLIT_ADJUSTED';
const GMH='https://getmarkethistory.com',GMH_MODE='RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE';
const EXPECTED={
 parquetBase:'4f0bbb08f4a67818209d6d32d465006111c6d6b0c958caf7f9202a49ca8c8f45',
 parquetNext:'002465943c1cdb51191d528032652ad87ee0ab06f6bacb163b1ff4ce04a9174a',
 dcManifest:'76dfaca72fd0ded5e648ee15cceca5628288c11463214bd14ede01c2b5c4746e',
 spaceManifest:'1e046a0487548a00231da92da48c6d9fb690e8e95bba64e2071078b02e57f00b',
 dcScore:12.32143,spaceScore:44.65075};
const lines=[];
const say=(k,v)=>lines.push(`${k}=${String(v).replace(/[\r\n]/g,' ').slice(0,300)}`);
const sha=b=>createHash('sha256').update(b).digest('hex');
const fail=s=>{throw Object.assign(new Error(s),{code:s});};
const need=(ok,s)=>{if(!ok)fail(s);};
const positive=n=>typeof n==='number'&&Number.isFinite(n)&&n>0;
const validDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&
 Number.isFinite(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
const within=(root,subject)=>{const relative=path.relative(root,subject);
 return relative!==''&&relative!=='..'&&!relative.startsWith('..'+path.sep)&&!path.isAbsolute(relative);};
const round5=x=>Number(x.toFixed(5));
const allowed=['DTCR','GRID','SPY','UFO','NASA','WARP','ROKT'];

function decoderPaths(){
 const roots=[path.dirname(R8),path.dirname(path.dirname(R8)),
  path.dirname(path.dirname(path.dirname(R8))),
  path.dirname(path.dirname(path.dirname(path.dirname(R8)))),
  path.join(DATA,'theme-market-history-r131','marketparquet-r167'),'E:\\ZGmini\\runtime'];
 for(const parent of ['E:\\ZGmini\\projects',path.join(DATA,'projects')]){
  if(!fs.existsSync(parent))continue;
  for(const d of fs.readdirSync(parent,{withFileTypes:true}).filter(x=>x.isDirectory()).slice(0,80))
   roots.push(path.join(parent,d.name),path.join(parent,d.name,'zgmini'));
 }
 const found=[process.env.ZGMINI_HYPARQUET_MODULE];
 if(fs.existsSync(R8))try{
  found.push(createRequire(pathToFileURL(R8).href).resolve('hyparquet'));
 }catch{}
 for(const root of roots)for(const suffix of ['node_modules/hyparquet/src/index.js',
  'node_modules/hyparquet/dist/index.js'])found.push(path.join(root,suffix));
 return [...new Set(found.filter(s=>typeof s==='string'))];
}
async function decoder(){
 try{const m=await import('hyparquet');
  if(typeof m.parquetReadObjects==='function'){say('DECODER_SOURCE','DIRECT');return m;}
 }catch{}
 for(const loc of decoderPaths()){
  if(!fs.existsSync(loc))continue;
  try{const m=await import(pathToFileURL(fs.realpathSync(loc)).href);
   if(typeof m.parquetReadObjects==='function'){
    say('DECODER_SOURCE','EXISTING_APPROVED_PC_MODULE');return m;
   }
  }catch{}
 }
 fail('R7_EXISTING_PARQUET_DECODER_UNAVAILABLE');
}
function dateOnly(x){
 if(x instanceof Date)return x.toISOString().slice(0,10);
 if(typeof x==='string')return x.slice(0,10);
 if(Number.isInteger(x)&&x>=10000&&x<100000)return new Date(x*86400000).toISOString().slice(0,10);
 return null;
}
async function parquet(mod,date){
 const name=`etf_daily_${date}`;
 const file=path.join(ARCHIVE,name+'.parquet'),auditFile=path.join(AUDITS,name+'.audit.json');
 need(fs.existsSync(file)&&fs.existsSync(auditFile),'R7_PARQUET_SOURCE_MISSING_'+date);
 const b=fs.readFileSync(file),digest=sha(b);
 need(b.length>=12&&b.toString('ascii',0,4)==='PAR1'&&
  b.toString('ascii',b.length-4)==='PAR1','R7_PARQUET_MAGIC_INVALID_'+date);
 const footer=b.readUInt32LE(b.length-8);
 need(footer>0&&footer<=b.length-12,'R7_PARQUET_FOOTER_INVALID_'+date);
 need(digest===(date===BASE?EXPECTED.parquetBase:EXPECTED.parquetNext),
  'R7_R6_PARQUET_SHA_DRIFT_'+date);
 const audit=JSON.parse(fs.readFileSync(auditFile,'utf8'));
 need(audit.date===date&&audit.sha256===digest&&audit.complete===true&&
  audit.source===SOURCE,'R7_PARQUET_AUDIT_INVALID_'+date);
 const buffer=b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);
 const rows=await mod.parquetReadObjects({file:buffer,columns:['date','symbol','asset_type','close']});
 need(Array.isArray(rows),'R7_PARQUET_DECODE_INVALID_'+date);
 const prices={};
 for(const row of rows){
  const symbol=typeof row?.symbol==='string'?row.symbol.toUpperCase():'';
  if(!allowed.includes(symbol))continue;
  need(dateOnly(row.date)===date&&positive(row.close)&&
   (!row.asset_type||String(row.asset_type).toLowerCase()==='etf'),
   'R7_PARQUET_PRICE_INVALID_'+date+'_'+symbol);
  need(!Object.hasOwn(prices,symbol),'R7_PARQUET_DUPLICATE_'+date+'_'+symbol);
  prices[symbol]=row.close;
 }
 say('PARQUET_'+date+'_SHA',digest);
 return prices;
}

function readDcTables(){
 const home=fs.realpathSync(path.join(DATA,'themes','data-center-power'));
 const mf=fs.realpathSync(path.join(home,'raw-manifest.json'));
 need(within(home,mf),'R7_DC_MANIFEST_PATH_INVALID');
 const b=fs.readFileSync(mf),digest=sha(b);
 need(digest===EXPECTED.dcManifest,'R7_R6_DC_MANIFEST_SHA_DRIFT');
 const manifest=JSON.parse(b);
 need(manifest.version===1&&manifest.themeId==='data-center-power'&&
  Array.isArray(manifest.files),'R7_DC_MANIFEST_INVALID');
 const symbolList=[...POWER,BENCH];
 const bars=Object.fromEntries(symbolList.map(s=>[s,new Map()]));
 const files=new Set();
 for(const entry of manifest.files){
  need(typeof entry.path==='string'&&/^raw\/(DTCR|GRID|SPY)_[a-f0-9]{64}\.jsonl$/.test(entry.path)&&
   /^[a-f0-9]{64}$/.test(entry.sha256??'')&&entry.path.endsWith(entry.sha256+'.jsonl')&&
   entry.source===GMH&&entry.priceMode===GMH_MODE&&validDate(entry.observationThrough),
   'R7_DC_RAW_MANIFEST_ENTRY_INVALID');
  const symbol=entry.path.slice(4).split('_')[0];
  const file=fs.realpathSync(path.join(home,entry.path));
  need(within(home,file),'R7_DC_RAW_PATH_ESCAPE');
  const raw=fs.readFileSync(file);
  need(sha(raw)===entry.sha256,'R7_DC_RAW_SHA_INVALID_'+symbol);
  files.add(symbol);let prev='';
  for(const line of raw.toString('utf8').split(/\r?\n/).filter(Boolean)){
   const row=JSON.parse(line);
   need(row.symbol===symbol&&typeof row.timestamp==='string'&&
    Number.isFinite(Date.parse(row.timestamp))&&positive(row.close)&&
    (!prev||row.timestamp>prev),'R7_DC_RAW_BAR_INVALID_'+symbol);
   prev=row.timestamp;if(row.is_gap===true)continue;
   const prior=bars[symbol].get(row.timestamp);
   need(!prior||prior.close===row.close,'R7_DC_DUPLICATE_CONFLICT_'+symbol);
   bars[symbol].set(row.timestamp,row);
  }
 }
 need(symbolList.every(s=>files.has(s)),'R7_DC_RAW_SYMBOL_MISSING');
 const daily=Object.fromEntries(symbolList.map(s=>[s,new Map(regularHour15Rows(
  [...bars[s].values()].sort((a,b)=>a.timestamp.localeCompare(b.timestamp)))
  .map(r=>[r.date,r.close]))]));
 const common=[...daily.SPY.keys()].filter(date=>symbolList.every(s=>daily[s].has(date))).sort();
 need(common.length>=628&&common.at(-1)===BASE,'R7_DC_628_REAL_BASE_SESSIONS_INVALID');
 return {daily,dates:common.slice(-628),manifestSha:digest};
}

export function calculateDcPrivate({tables,base,next}={}){
 const {daily,dates}=tables??{};
 need(daily&&Array.isArray(dates)&&dates.length===628&&dates.at(-1)===BASE,
  'R7_DC_SCORE_BASE_INVALID');
 const bridge={};
 for(const s of [...POWER,BENCH]){
  need(positive(base?.[s])&&positive(next?.[s])&&positive(daily[s]?.get(BASE)),
   'R7_DC_PRICE_MISSING_'+s);
  bridge[s]=Math.abs(base[s]/daily[s].get(BASE)-1);
  need(bridge[s]<=0.05,'R7_DC_PRICE_MODE_MISMATCH_'+s);
 }
 const spyBase=dates.map(date=>daily.SPY.get(date));
 const spyNext=[...spyBase,next.SPY];
 const before=POWER.map(s=>scoreAll252(dates.map(date=>daily[s].get(date)),spyBase).at(-1));
 const after=POWER.map(s=>scoreAll252([...dates.map(date=>daily[s].get(date)),next[s]],spyNext).at(-1));
 const baseScore=round5((before[0]+before[1])/2),nextScore=round5((after[0]+after[1])/2);
 return {baseScore,nextScore,bridge,etfs:POWER,benchmark:BENCH};
}

function verifiedSpaceInputs(){
 const roster=JSON.parse(fs.readFileSync(ROSTER_PATH,'utf8'));
 const evidence=JSON.parse(fs.readFileSync(AUM_PATH,'utf8'));
 need(roster?.version===1&&roster.theme==='space-satellite'&&
  roster.selectionApproved===true&&roster.maximumEtfCount===null&&
  roster.approvedThreePlusWeighting==='NORMALIZED_DATED_OFFICIAL_AUM'&&
  roster.approvedCurrentSymbols?.join(',')==='UFO,NASA,WARP,ROKT',
  'R7_SPACE_APPROVED_ROSTER_DRIFT');
 need(evidence?.version===1&&evidence.scoreAsOf===BASE&&
  evidence.sourceManifestSha256===EXPECTED.spaceManifest&&
  evidence.spyManifestSha256===EXPECTED.dcManifest,
  'R7_SPACE_AUM_EVIDENCE_DRIFT');
 const original=readApprovedSpacePrices({dataRoot:DATA,symbols:roster.approvedCurrentSymbols});
 const benchmark=readVerifiedSharedSpy({dataRoot:DATA,sourceTheme:'data-center-power'});
 need(original.manifestSha256===EXPECTED.spaceManifest&&
  benchmark.manifestSha256===EXPECTED.dcManifest&&
  benchmark.priceMode===GMH_MODE,'R7_SPACE_RAW_SOURCE_DRIFT');
 const spyRows=selectRealHourlySessions(benchmark.bars);
 need(spyRows.length>=252&&spyRows.at(-1).date===BASE,'R7_SPACE_SPY_BASE_INVALID');
 for(const s of roster.approvedCurrentSymbols){
  need(original.sessions[s]?.some(row=>row.date===BASE),'R7_SPACE_GMH_BASE_MISSING_'+s);
  need(original.sessions[s].at(-1).date<=BASE,'R7_SPACE_GMH_FUTURE_DATE_'+s);
 }
 return {roster,evidence,original,spyRows};
}

function spaceBasket(inputs,appendPrices=null){
 const {roster,evidence,original,spyRows}=inputs;
 const symbols=roster.approvedCurrentSymbols;
 const benchmark=appendPrices?[...spyRows,{date:NEXT,close:appendPrices.SPY}]:[...spyRows];
 const dates=benchmark.map(row=>row.date);
 need(new Set(dates).size===dates.length&&dates.every((d,i)=>i===0||dates[i-1]<d),
  'R7_SPACE_DATES_NONMONOTONIC');
 const priceByDate=Object.fromEntries(symbols.map(s=>[s,new Map(
  original.sessions[s].filter(x=>x.date<=BASE).map(row=>[row.date,row.close]))]));
 if(appendPrices)for(const s of symbols){
  if(positive(appendPrices[s]))priceByDate[s].set(NEXT,appendPrices[s]);
 }
 const timelines={},observed={},sessionCounts={};
 for(const s of symbols){
  observed[s]=new Set(priceByDate[s].keys());let n=0;
  sessionCounts[s]=new Map(dates.map(date=>{
   if(priceByDate[s].has(date))n++;
   return [date,n];
  }));
  timelines[s]=scoreAdaptiveTimeline(benchmark.map(row=>({
   date:row.date,own:priceByDate[s].get(row.date)??null,spy:row.close})));
 }
 const basket=calculateApprovedSpaceBasket({dates,symbols,timelines,observed,
  sessionCounts,aumEvidence:evidence.rows,scoreAsOf:dates.at(-1),
  historicalSingleContinuity:true});
 return {...basket,individual:Object.fromEntries(symbols.map(s=>[s,{
  score:timelines[s].at(-1).score,status:timelines[s].at(-1).status,
  sessions:sessionCounts[s].get(dates.at(-1)),observed:observed[s].has(dates.at(-1))}]))};
}

export function calculateSpacePrivate({inputs,base,next}={}){
 const {roster,original,spyRows}=inputs;
 need(positive(next?.SPY)&&positive(base?.SPY),'R7_SPACE_PARQUET_SPY_MISSING');
 const checkMap={SPY:new Map(spyRows.map(x=>[x.date,x.close]))};
 for(const s of roster.approvedCurrentSymbols)
  checkMap[s]=new Map(original.sessions[s].map(x=>[x.date,x.close]));
 const included=['UFO','NASA','ROKT'];
 const bridge={};
 for(const s of [...included,'SPY']){
  need(positive(next[s])&&positive(base[s])&&positive(checkMap[s].get(BASE)),
   'R7_SPACE_BRIDGE_PRICE_MISSING_'+s);
  bridge[s]=Math.abs(base[s]/checkMap[s].get(BASE)-1);
  need(bridge[s]<=0.05,'R7_SPACE_PRICE_MODE_MISMATCH_'+s);
 }
 need(!positive(next.WARP),'R7_WARP_NEW_ROW_REQUIRES_SEPARATE_REVIEW');
 const before=spaceBasket(inputs),after=spaceBasket(inputs,next);
 need(before.latest.date===BASE&&before.latest.status==='APPROVED_THREE_PLUS_AUM'&&
  before.latest.etfs.join(',')===roster.approvedCurrentSymbols.join(',')&&
  before.latest.score===EXPECTED.spaceScore,'R7_SPACE_2026_10_23_BASE_PARITY_FAILED');
 const preserved=after.history.at(-2);
 need(preserved?.date===BASE&&preserved.score===before.latest.score,
  'R7_SPACE_BASE_CHANGED_ON_APPEND');
 need(after.latest.date===NEXT&&after.latest.status==='APPROVED_THREE_PLUS_AUM'&&
  after.latest.etfs.join(',')===included.join(',')&&
  after.latest.score!==null,'R7_SPACE_LATEST_ELIGIBILITY_INCOMPLETE');
 need(after.individual.WARP.observed===false&&after.individual.WARP.score===null,
  'R7_SPACE_WARP_STALE_MUST_NOT_FILL');
 return {baseScore:before.latest.score,nextScore:after.latest.score,
  etfs:after.latest.etfs,weightsPercent:after.latest.weightsPercent,
  status:after.latest.status,bridge,individual:after.individual,
  historyScoredDays:after.scoredDays};
}

async function inspect(){
 say('SOURCE_MODE','GMH_15H_UNADJUSTED_PLUS_SAVED_MARKETPARQUET_EOD_SPLIT_ADJUSTED');
 say('PRICE_BRIDGE_RULE','R8_STYLE_FIVE_PERCENT_DIAGNOSTIC_PRIVATE_ONLY');
 const mod=await decoder();
 const base=await parquet(mod,BASE);
 const next=await parquet(mod,NEXT);
 need(['DTCR','GRID','UFO','NASA','ROKT','SPY'].every(s=>positive(next[s]))&&
  !positive(next.WARP),'R7_TARGET_COVERAGE_CHANGED_FROM_R6');
 const dcTables=readDcTables();
 const oldDc=calculateDataCenterPower({dataRoot:DATA});
 need(oldDc.observationDate===BASE&&oldDc.score===EXPECTED.dcScore&&
  oldDc.sourceVersion==='GMH_MANIFEST_SHA256_'+dcTables.manifestSha,
  'R7_DC_ORIGINAL_SCORE_PARITY_FAILED');
 const dc=calculateDcPrivate({tables:dcTables,base,next});
 need(dc.baseScore===oldDc.score,'R7_DC_2026_10_23_R188_PARITY_FAILED');
 say('POWER_BASE_2026_10_23',dc.baseScore);
 say('POWER_PROVISIONAL_2026_10_26',dc.nextScore);
 say('POWER_ETFS',dc.etfs.join(','));
 say('POWER_FORMULA','R188_40_20_40_EQUAL_DTCR_GRID');
 const space=calculateSpacePrivate({inputs:verifiedSpaceInputs(),base,next});
 say('SPACE_BASE_2026_10_23',space.baseScore);
 say('SPACE_PROVISIONAL_2026_10_26',space.nextScore);
 say('SPACE_ETFS_2026_10_26',space.etfs.join(','));
 say('SPACE_WEIGHT_RULE','R32_APPROVED_ISSUER_AUM_NORMALIZED');
 const aumEvidence=JSON.parse(fs.readFileSync(AUM_PATH,'utf8'));
 for(const row of aumEvidence.rows)say('SPACE_AUM_'+row.symbol+'_ASOF',row.aumAsOf);
 say('SPACE_AUM_NEW_SNAPSHOT_COLLECTED','NO_REUSE_APPROVED_2026_10_23_EVIDENCE');
 for(const [s,pct] of Object.entries(space.weightsPercent))say('SPACE_WEIGHT_'+s+'_PCT',pct);
 for(const [s,row] of Object.entries(space.individual)){
  say('SPACE_'+s+'_STATUS',row.status);
  say('SPACE_'+s+'_OBSERVED_2026_10_26',row.observed?'YES':'NO');
  say('SPACE_'+s+'_VALID_SESSIONS',row.sessions);
 }
 say('SPACE_WARP_HANDLING','NO_2026_10_26_PRICE_NO_SCORE_NO_WEIGHT');
 say('R7_STATUS','TWO_PRIVATE_SHADOW_SCORES_READY_NOT_PUBLISHED');
}

async function main(){
 need(process.argv.length===3&&path.resolve(process.argv[2])===path.resolve(OUT),
  'R7_OUTPUT_ARGUMENT_INVALID');
 say('REPORT','THEME_PROVISIONAL_R7_PRIVATE_SHADOW');
 say('RUN_UTC',new Date().toISOString());
 say('READ_ONLY','YES');
 try{await inspect();}catch(error){say('R7_STATUS','BLOCKED');
  say('REASON',error.code||error.message||'UNKNOWN');}
 say('PROVIDER_CALLS',0);say('D1_WRITES',0);say('RAW_WRITES',0);
 say('PUBLIC_WRITES',0);say('TASK_CHANGES',0);say('PUBLICATION','NONE');
 fs.writeFileSync(OUT,'\ufeff'+lines.join('\r\n')+'\r\n','utf8');
 process.stdout.write('R7_RESULT_TXT_CREATED\n');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))
 main().catch(e=>{say('R7_STATUS','ERROR');say('REASON',e.code||e.message||'UNKNOWN');
  try{fs.writeFileSync(OUT,'\ufeff'+lines.join('\r\n')+'\r\n','utf8');}catch{}
  process.exitCode=1;});
