// R6 private source-mode bridge, using already stored and SHA-audited sources.
// No provider, account, registry, scheduler, score, D1 or public writes.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const OUT=path.join(HERE,'THEME_PROVISIONAL_R6_PRICE_BRIDGE_RESULT.txt');
const DATA='E:\\ZGmini\\data';
const ARCHIVE=path.join(DATA,'theme-market-history-r131','marketparquet-r165');
const AUDITS=path.join(DATA,'theme-market-history-r131','marketparquet-r167');
const R8=path.join(DATA,'themes','biotech','source-r8','scripts','pc-writer','theme-biotech-provisional-r8.mjs');
const SOURCE='MARKETPARQUET_ETF_DAILY_SPLIT_ADJUSTED';
const GMH_SOURCE='https://getmarkethistory.com';
const GMH_MODE='RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE';
const BASE='2026-10-23',NEXT='2026-10-26';
const POWER=['DTCR','GRID','SPY'];
const SPACE=['UFO','NASA','WARP','ROKT'];
const TICKERS=[...new Set([...POWER,...SPACE])];
const lines=[];
const say=(k,v)=>lines.push(`${k}=${String(v).replace(/[\r\n]/g,' ').slice(0,300)}`);
const sha=b=>createHash('sha256').update(b).digest('hex');
const fail=s=>{throw Object.assign(new Error(s),{code:s});};
const must=(x,s)=>{if(!x)fail(s);};
const positive=x=>typeof x==='number'&&Number.isFinite(x)&&x>0;
const validDate=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&
 Number.isFinite(Date.parse(d+'T00:00:00Z'))&&new Date(d+'T00:00:00Z').toISOString().slice(0,10)===d;
const ny=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',
 month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'});
const parts=ts=>Object.fromEntries(ny.formatToParts(new Date(ts))
 .filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));

function existingDecoderPaths(){
 const roots=[path.dirname(R8),path.dirname(path.dirname(R8)),
  path.dirname(path.dirname(path.dirname(R8))),
  path.dirname(path.dirname(path.dirname(path.dirname(R8)))),
  path.join(DATA,'theme-market-history-r131','marketparquet-r167'),
  'E:\\ZGmini\\runtime'];
 for(const projects of ['E:\\ZGmini\\projects',path.join(DATA,'projects')]){
  if(!fs.existsSync(projects))continue;
  for(const item of fs.readdirSync(projects,{withFileTypes:true}).filter(x=>x.isDirectory()).slice(0,80))
   roots.push(path.join(projects,item.name),path.join(projects,item.name,'zgmini'));
 }
 const candidates=[process.env.ZGMINI_HYPARQUET_MODULE];
 if(fs.existsSync(R8))try{
  candidates.push(createRequire(pathToFileURL(R8).href).resolve('hyparquet'));
 }catch{}
 for(const root of roots)for(const rel of [
  'node_modules/hyparquet/src/index.js','node_modules/hyparquet/dist/index.js'])
  candidates.push(path.join(root,rel));
 return [...new Set(candidates.filter(x=>typeof x==='string'))];
}

async function decoder(){
 try{const mod=await import('hyparquet');
  if(typeof mod.parquetReadObjects==='function'){say('DECODER_SOURCE','DIRECT');return mod;}
 }catch{}
 for(const loc of existingDecoderPaths()){
  if(!fs.existsSync(loc))continue;
  try{const mod=await import(pathToFileURL(fs.realpathSync(loc)).href);
   if(typeof mod.parquetReadObjects==='function'){
    say('DECODER_SOURCE','EXISTING_APPROVED_PC_MODULE');return mod;
   }
  }catch{}
 }
 fail('EXISTING_PARQUET_DECODER_UNAVAILABLE');
}

function dateOnly(x){
 if(x instanceof Date)return x.toISOString().slice(0,10);
 if(typeof x==='string')return x.slice(0,10);
 if(Number.isInteger(x)&&x>=10000&&x<100000)return new Date(x*86400000).toISOString().slice(0,10);
 return null;
}

async function parquetPrices(mod,date){
 const name=`etf_daily_${date}`;
 const file=path.join(ARCHIVE,name+'.parquet');
 const auditFile=path.join(AUDITS,name+'.audit.json');
 must(fs.existsSync(file)&&fs.existsSync(auditFile),'R6_PARQUET_OR_AUDIT_MISSING_'+date);
 const bytes=fs.readFileSync(file);
 must(bytes.length>=12&&bytes.toString('ascii',0,4)==='PAR1'&&
  bytes.toString('ascii',bytes.length-4)==='PAR1','R6_PARQUET_MAGIC_INVALID_'+date);
 const footer=bytes.readUInt32LE(bytes.length-8);
 must(footer>0&&footer<=bytes.length-12,'R6_PARQUET_FOOTER_INVALID_'+date);
 const digest=sha(bytes),audit=JSON.parse(fs.readFileSync(auditFile,'utf8'));
 must(audit.date===date&&audit.sha256===digest&&audit.complete===true&&
  audit.source===SOURCE,'R6_PARQUET_AUDIT_SHA_INVALID_'+date);
 const input=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
 const rows=await mod.parquetReadObjects({file:input,
  columns:['date','symbol','asset_type','close']});
 must(Array.isArray(rows),'R6_PARQUET_DECODE_INVALID_'+date);
 const prices={};
 for(const row of rows){
  const symbol=typeof row?.symbol==='string'?row.symbol.toUpperCase():'';
  if(!TICKERS.includes(symbol))continue;
  must(dateOnly(row.date)===date&&positive(row.close)&&
   (!row.asset_type||String(row.asset_type).toLowerCase()==='etf'),
   'R6_PARQUET_ROW_INVALID_'+date+'_'+symbol);
  must(!Object.hasOwn(prices,symbol),'R6_PARQUET_DUPLICATE_'+date+'_'+symbol);
  prices[symbol]=row.close;
 }
 say('PARQUET_'+date+'_SHA',digest);
 return prices;
}

function within(root,subject){
 const d=path.relative(root,subject);
 return d!==''&&d!=='..'&&!d.startsWith('..'+path.sep)&&!path.isAbsolute(d);
}

function rawPrices(theme,symbols){
 const home=fs.realpathSync(path.join(DATA,'themes',theme));
 const manifestFile=fs.realpathSync(path.join(home,'raw-manifest.json'));
 must(within(home,manifestFile)&&fs.statSync(manifestFile).size<=2_000_000,
  'R6_GMH_MANIFEST_PATH_INVALID_'+theme);
 const raw=fs.readFileSync(manifestFile),manifest=JSON.parse(raw);
 must(manifest.version===1&&manifest.themeId===theme&&Array.isArray(manifest.files),
  'R6_GMH_MANIFEST_INVALID_'+theme);
 const prices=Object.fromEntries(symbols.map(s=>[s,new Map()]));
 const count=Object.fromEntries(symbols.map(s=>[s,0]));
 for(const entry of manifest.files){
  must(typeof entry?.path==='string'&&
   /^raw\/[A-Z][A-Z0-9.-]*_[a-f0-9]{64}\.jsonl$/.test(entry.path)&&
   typeof entry.sha256==='string'&&entry.path.endsWith(entry.sha256+'.jsonl'),
   'R6_GMH_MANIFEST_ENTRY_INVALID_'+theme);
  const symbol=entry.path.slice(4).split('_')[0];
  if(!symbols.includes(symbol))continue;
  must(entry.source===GMH_SOURCE&&entry.priceMode===GMH_MODE&&
   Number.isFinite(Date.parse(entry.collectedAt))&&validDate(entry.observationThrough),
   'R6_GMH_SOURCE_INVALID_'+symbol);
  const file=fs.realpathSync(path.join(home,entry.path));
  must(within(home,file)&&fs.statSync(file).size<=8_000_000,
   'R6_GMH_FILE_PATH_INVALID_'+symbol);
  const bytes=fs.readFileSync(file);
  must(sha(bytes)===entry.sha256,'R6_GMH_RAW_SHA_INVALID_'+symbol);
  count[symbol]++;
  let prev='',n=0;
  for(const line of bytes.toString('utf8').split(/\r?\n/).filter(Boolean)){
   n++;must(n<=10000,'R6_GMH_RAW_BOUNDS_'+symbol);
   const bar=JSON.parse(line);
   must(bar.symbol===symbol&&typeof bar.timestamp==='string'&&
    Number.isFinite(Date.parse(bar.timestamp))&&positive(bar.close)&&
    (!prev||bar.timestamp>prev),'R6_GMH_BAD_BAR_'+symbol);
   prev=bar.timestamp;
   if(bar.is_gap===true)continue;
   const p=parts(bar.timestamp),date=`${p.year}-${p.month}-${p.day}`;
   // 2026-10-23 is a normal NYSE session, so the approved proxy is 15:xx NY.
   if(date!==BASE||p.hour!=='15')continue;
   const existing=prices[symbol].get(bar.timestamp);
   must(existing===undefined||existing===bar.close,'R6_GMH_OVERLAP_CONFLICT_'+symbol);
   prices[symbol].set(bar.timestamp,bar.close);
  }
 }
 const bases={};
 for(const symbol of symbols){
  must(count[symbol]>0,'R6_GMH_RAW_SYMBOL_MISSING_'+symbol);
  const last=[...prices[symbol].entries()].sort((a,b)=>a[0].localeCompare(b[0])).at(-1);
  must(last&&positive(last[1]),'R6_GMH_BASE_15H_MISSING_'+symbol);
  bases[symbol]=last[1];
 }
 say('GMH_'+theme.toUpperCase().replaceAll('-','_')+'_MANIFEST_SHA',sha(raw));
 return bases;
}

export function evaluateBridge({base,latest,gmh,threshold=0.05}={}){
 const results={};
 for(const symbol of TICKERS){
  const hasBase=positive(base?.[symbol]),hasLatest=positive(latest?.[symbol]);
  const hasGmh=positive(gmh?.[symbol]);
  const difference=hasBase&&hasGmh?Math.abs(base[symbol]/gmh[symbol]-1):null;
  results[symbol]={overlap:hasBase,latest:hasLatest,gmh:hasGmh,
   difference,bridge:!hasLatest?'NO_NEW_REAL_ROW':
    !hasBase||!hasGmh?'BASE_OR_GMH_MISSING':
    difference<=threshold?'PASS':'FAIL_PRICE_MODE_DIFF_GT_5PCT'};
 }
 const allPass=arr=>arr.every(s=>results[s].bridge==='PASS');
 const power=allPass(POWER)?'READY_FOR_PRIVATE_R188_SHADOW':'BLOCKED_VERIFY_PRICE_BRIDGE';
 const spaceCovered=SPACE.filter(s=>results[s].bridge==='PASS');
 const spyReady=results.SPY.bridge==='PASS';
 const space=spyReady&&spaceCovered.length>=3?
  'READY_FOR_PRIVATE_R32_ELIGIBILITY_AND_AUM_SHADOW':
  'BLOCKED_VERIFY_PRICE_BRIDGE_OR_REAL_ELIGIBLE_COVERAGE';
 return {results,power,space,spaceCovered,
  spaceNoLatest:SPACE.filter(s=>!results[s].latest)};
}

async function inspect(){
 say('R8_APPROVED_SOURCE',fs.existsSync(R8)?'FOUND':'NOT_FOUND');
 const mod=await decoder();say('DECODER','READY');
 const base=await parquetPrices(mod,BASE),latest=await parquetPrices(mod,NEXT);
 const gmh={...rawPrices('data-center-power',POWER),
  ...rawPrices('space-satellite',SPACE)};
 const v=evaluateBridge({base,latest,gmh});
 for(const symbol of TICKERS){
  const e=v.results[symbol];
  say('BRIDGE_'+symbol+'_2026_10_23_PCT',e.difference===null?'UNAVAILABLE':
   Number((e.difference*100).toFixed(6)));
  say('BRIDGE_'+symbol+'_2026_10_26',e.bridge);
 }
 say('POWER_NEXT_GATE',v.power);
 say('SPACE_NEXT_GATE',v.space);
 say('SPACE_POTENTIAL_NEW_ETFS',v.spaceCovered.join(',')||'NONE');
 say('SPACE_NO_2026_10_26_ETF_ROW',v.spaceNoLatest.join(',')||'NONE');
 say('SPACE_AUM_WEIGHT_COMPUTED','NO_R7_PENDING');
 say('SCORES_COMPUTED','NO_R7_PENDING');
 say('R6_STATUS',v.power.startsWith('READY')&&v.space.startsWith('READY')?
  'PRIVATE_PRICE_BRIDGE_READY':'INVESTIGATE_FAILED_BRIDGES');
}

async function main(){
 must(process.argv.length===3&&path.resolve(process.argv[2])===path.resolve(OUT),
  'OUTPUT_ARG_INVALID');
 say('REPORT','THEME_PROVISIONAL_R6_PRICE_BRIDGE_READONLY');
 say('RUN_UTC',new Date().toISOString());
 say('READ_ONLY','YES');
 try{await inspect();}catch(e){say('R6_STATUS','BLOCKED');say('REASON',e.code||e.message||'UNKNOWN');}
 say('PROVIDER_CALLS',0);say('D1_WRITES',0);say('RAW_WRITES',0);
 say('SCORES_WRITTEN',0);say('TASK_CHANGES',0);say('PUBLICATION','NONE');
 fs.writeFileSync(OUT,'\ufeff'+lines.join('\r\n')+'\r\n','utf8');
 process.stdout.write('R6_RESULT_TXT_CREATED\n');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))
 main().catch(e=>{say('EXIT_ERROR',e.code||e.message||'UNKNOWN');
  try{fs.writeFileSync(OUT,'\ufeff'+lines.join('\r\n')+'\r\n','utf8');}catch{}
  process.exitCode=1;});
