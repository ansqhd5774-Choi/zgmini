// Branch-private real-price R188 <-> adaptive R2 shadow; never publishes or exports prices.
// In the user CMD, toolkit and the exact existing R188/R2 scorers are embedded verbatim.
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const TOOLKIT=globalThis.__R6_TOOLKIT__||require('./theme-nine-source-r5.cjs');
const SYMBOLS=['SPY','BOTZ','ROBO','SKYY','CLOU','DRIV','NLR','URA','ITA','SHLD','FINX','ARKF','CIBR','BUG'];
const PAIRS=[['robotics','BOTZ','ROBO'],['cloud-saas','SKYY','CLOU'],
 ['autonomous-driving','DRIV','BOTZ'],['nuclear-smr','NLR','URA'],
 ['defense','ITA','SHLD'],['fintech','FINX','ARKF'],['cybersecurity','CIBR','BUG'],
 ['ai-semiconductor','SMH','SOXX'],['biotech','IBB','XBI']];
const R187_SHA='b79af822c7c91a6d89a79f8275abb75a90f95e6dee3bd6bfc7435395c142ec9a';
const EARLY=new Set(['2024-07-03','2024-11-29','2024-12-24',
 '2025-07-03','2025-11-28','2025-12-24','2026-11-27','2026-12-24']);
const NY=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'});
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const good=n=>typeof n==='number'&&Number.isFinite(n)&&n>0;
const sc=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=100;
const safe=x=>String(x??'NONE').replace(/[^A-Za-z0-9_:.,|/-]/g,'_');
const fmt=n=>n===null||n===undefined||!Number.isFinite(n)?'NONE':n.toFixed(6);

function strictSource(file){
 const item=TOOLKIT.analyzeFile(file);
 if(item.error||!item.best||item.filenameHashMatches!==true||item.best.ambiguous||item.best.invalid>
    item.best.rawCount/10)throw Error('RAW_ASSET_SCHEMA_OR_HASH_'+path.basename(file));
 if(item.best.mode!=='NY_HOURLY_15_12')throw Error('RAW_PRICE_MODE_'+path.basename(file));
 return item;
}
function filesFor(dir,sym,contains=''){
 try{return fs.readdirSync(dir).filter(name=>name.startsWith(sym+'_')&&name.endsWith('.json')&&name.includes(contains))
  .sort().map(name=>path.join(dir,name));}catch{return [];}
}
function mergeRealFiles(files){
 const out=new Map();let duplicates=0,compared=0;
 for(const file of files){
  const doc=strictSource(file);compared++;
  for(const row of doc.items){
   if(out.has(row.date)){
    duplicates++;
    if(Math.abs(out.get(row.date)-row.price)>1e-8)throw Error('SAME_DATE_SOURCE_PRICE_CONFLICT_'+row.date);
   }else out.set(row.date,row.price);
  }
 }
 return {days:out,files:compared,duplicates};
}
function oldSeven(root,emit){
 const base=path.join(root,'theme-market-history-r131'),raw=new Map();let allRaw=0;
 for(const sym of SYMBOLS){
  const historical=filesFor(path.join(base,'warmup','raw'),sym);
  const recent=filesFor(path.join(base,'raw'),sym);
  if(historical.length!==1||recent.length<1)throw Error('LEGACY_SOURCE_FILES_'+sym);
  const result=mergeRealFiles([...historical,...recent]);raw.set(sym,result.days);allRaw+=result.files;
  const joined=filesFor(path.join(base,'derived','warmup-joined'),sym,'joined-research.json');
  let overlap=0,priceDifferences=0,missingRaw=0,invalidJoined=0,joinedRights='UNKNOWN';
  if(joined.length===1){
   const parsed=TOOLKIT.analyzeFile(joined[0]);
   if(parsed.error||parsed.filenameHashMatches!==true)throw Error('JOINED_ASSET_HASH_'+sym);
   const full=JSON.parse(fs.readFileSync(joined[0],'utf8'));
   joinedRights=`OFFICIAL_${safe(full.officialCloseVerified)}_ADJUSTED_${safe(full.adjustedPricesVerified)}_RIGHTS_${safe(full.marketDataRightsVerified)}`;
   if(!Array.isArray(full.days))throw Error('JOINED_DAYS_SCHEMA_'+sym);
   for(const row of full.days){
    if(!good(row.proxyClose)){invalidJoined++;continue;}
    if(!result.days.has(row.date)){missingRaw++;continue;}
    overlap++;
    if(Math.abs(result.days.get(row.date)-row.proxyClose)>1e-8)priceDifferences++;
   }
  }else throw Error('JOINED_SOURCE_MISSING_'+sym);
  const dates=[...result.days.keys()].sort();
  emit(`LEGACY_SYMBOL=${sym};RAW_FILES=${result.files};RAW_DAYS=${dates.length};FIRST=${dates[0]||'NONE'};LAST=${dates.at(-1)||'NONE'};DUPLICATE_SAME_PRICE=${result.duplicates};JOINED_OVERLAP=${overlap};JOINED_DIFFERENCES=${priceDifferences};JOINED_MISSING_RAW=${missingRaw};JOINED_INVALID=${invalidJoined};JOINED_FLAGS=${joinedRights}`);
 }
 emit(`LEGACY_RAW_TOTAL_FILES=${allRaw};SOURCE=SHA16_VERIFIED_ORIGINAL_JSON_ONLY`);
 return raw;
}
function aiR187(root,emit){
 const filename=path.join(root,'pc-writer','local-theme-ai-semiconductor-r187-raw-b79af822c7c91a6d.json');
 const contents=fs.readFileSync(filename);if(sha(contents)!==R187_SHA)throw Error('AI_R187_SHA_MISMATCH');
 const obj=JSON.parse(contents.toString('utf8')),maps=new Map();
 for(const sym of ['SMH','SOXX','SPY']){
  const arrays=TOOLKIT.arraysIn(obj.instruments?.[sym]);
  const best=arrays[0];if(!best||best.mode!=='NY_HOURLY_15_12'||best.ambiguous)throw Error('AI_R187_PRICE_SCHEMA_'+sym);
  const map=new Map(best.rows.map(v=>[v.date,v.price]));maps.set(sym,map);
  const dates=[...map.keys()].sort();
  emit(`AI_R187_SYMBOL=${sym};SHA_VERIFIED=YES;DAYS=${dates.length};FIRST=${dates[0]||'NONE'};LAST=${dates.at(-1)||'NONE'}`);
 }
 return maps;
}
function nyHour(timestamp){
 if(typeof timestamp!=='string'||!/(Z|[+-]\d{2}:?\d{2})$/i.test(timestamp))return null;
 const ts=Date.parse(timestamp);if(!Number.isFinite(ts))return null;
 const p=Object.fromEntries(NY.formatToParts(new Date(ts)).filter(v=>v.type!=='literal').map(v=>[v.type,v.value]));
 return {date:`${p.year}-${p.month}-${p.day}`,hour:p.hour};
}
function manifestMarket(root,id,expectedFiles,emit){
 const home=path.join(root,'themes',id),manifest=JSON.parse(fs.readFileSync(path.join(home,'raw-manifest.json'),'utf8'));
 if(!Array.isArray(manifest.files)||manifest.files.length!==expectedFiles)throw Error('MANIFEST_COUNT_DRIFT_'+id);
 const maps=new Map();let hashVerified=0,dup=0,lines=0;
 for(const row of manifest.files){
  if(typeof row.path!=='string'||!/^raw\/[A-Z0-9]+_[A-Za-z0-9._-]+\.jsonl$/.test(row.path)||
   typeof row.sha256!=='string'||!/^[a-f0-9]{64}$/.test(row.sha256))throw Error('MANIFEST_PATH_OR_HASH_'+id);
  const file=path.join(home,...row.path.split('/')),bytes=fs.readFileSync(file);
  if(sha(bytes)!==row.sha256)throw Error('MANIFEST_SHA_MISMATCH_'+id);
  hashVerified++;
  for(const line of bytes.toString('utf8').split(/\r?\n/)){
   if(!line.trim())continue;lines++;
   let v;try{v=JSON.parse(line);}catch{throw Error('MANIFEST_LINE_INVALID_'+id);}
   if(v.is_gap===true)continue;
   const t=nyHour(v.timestamp);if(!t||t.hour!==(EARLY.has(t.date)?'12':'15')||!good(v.close))continue;
   if(!['SMH','SOXX','IBB','XBI','SPY'].includes(v.symbol))throw Error('UNEXPECTED_SYMBOL_'+id);
   if(!maps.has(v.symbol))maps.set(v.symbol,new Map());
   const m=maps.get(v.symbol);
   if(m.has(t.date)){
    dup++;if(Math.abs(m.get(t.date)-v.close)>1e-8)throw Error('MANIFEST_PRICE_CONFLICT_'+id+'_'+t.date);
   }else m.set(t.date,v.close);
  }
 }
 emit(`MANIFEST=${id};FILES=${expectedFiles};SHA_VERIFIED=${hashVerified};HOURLY_ROWS_SCANNED=${lines};SAME_PRICE_DUPLICATES=${dup}`);
 for(const [sym,days] of maps){const dates=[...days.keys()].sort();
  emit(`MANIFEST_SYMBOL=${id}/${sym};DAYS=${dates.length};FIRST=${dates[0]||'NONE'};LAST=${dates.at(-1)||'NONE'}`);
 }
 return maps;
}

function compareTheme(id,a,b,source,{scoreAll252,scoreAdaptiveTimeline}){
 const spy=source.get('SPY'),aa=source.get(a),bb=source.get(b);
 if(!spy||!aa||!bb)throw Error('THEME_SOURCE_MISSING_'+id);
 const dates=[...spy.keys()].sort();if(dates.length<628)throw Error('SPY_SOURCE_SHORT_'+id);
 const series={};let missing=0;
 for(const sym of [a,b]){
  const own=source.get(sym);
  const rows=dates.map(date=>({date,own:own.get(date)??null,spy:spy.get(date)??null}));
  missing+=rows.filter(row=>row.own===null).length;
  const adaptive=scoreAdaptiveTimeline(rows);
  const tail=rows.slice(-628);
  const complete=tail.every(row=>good(row.own)&&good(row.spy));
  let ref=null,reason='NONE';
  if(complete){try{ref=scoreAll252(tail.map(row=>row.own),tail.map(row=>row.spy));}catch(e){reason=safe(e.code||e.message);}}
  else reason='INCOMPLETE_REAL_628';
  series[sym]={adaptive:adaptive.slice(-252),reference:ref,reason};
 }
 const points=dates.slice(-252).map((date,i)=>{
  const left=series[a].adaptive[i],right=series[b].adaptive[i];
  const candidate=sc(left.score)&&sc(right.score)?(left.score+right.score)/2:null;
  const refA=series[a].reference?.[i],refB=series[b].reference?.[i];
  const reference=sc(refA)&&sc(refB)?(refA+refB)/2:null;
  return {date,candidate,reference,provisional:left.status!=='R188_COMPATIBLE'||right.status!=='R188_COMPATIBLE'};
 });
 const compared=points.filter(p=>p.candidate!==null&&p.reference!==null);
 const diff=compared.map(p=>Math.abs(p.candidate-p.reference));
 const latest=points.at(-1),year=points.length;
 const pDiff=span=>{
  const a=points.slice(-span),d=a.filter(p=>p.candidate!==null&&p.reference!==null)
   .map(p=>Math.abs(p.candidate-p.reference));
  return {matched:d.length,max:d.length?Math.max(...d):null,mean:d.length?d.reduce((x,y)=>x+y,0)/d.length:null};
 };
 return {id,tickers:[a,b],rawSpyDays:dates.length,missingPriceSlots:missing,latest,
  recent21:pDiff(21),recent63:pDiff(63),recent252:pDiff(252),
  scored:points.filter(p=>p.candidate!==null).length,comparables:compared.length,
  parityViolations:diff.filter(x=>x>1e-10).length,maxDiff:diff.length?Math.max(...diff):null,
  referenceFail:[a,b].filter(t=>series[t].reference===null).map(t=>`${t}:${series[t].reason}`),
  status:compared.length===252&&diff.every(d=>d<=1e-10)?'R188_R2_PARITY_252_PASS':'PARTIAL_OR_DRIFT'};
}
function scoreFunctions(){
 const injected=globalThis.__R6_SCORERS__;
 if(injected)return injected;
 throw Error('EXACT_SCORE_MODULES_NOT_INJECTED');
}
function run(root,emit=console.log,overrides){
 emit('REPORT=THEME_NINE_R6_PRIVATE_R188_VS_R2_REAL_PRICE_SHADOW');
 emit('BOUNDARY=BRANCH_ONLY;PROVIDER_CALLS=0;PUBLICATION_WRITES=0;D1_WRITES=0;SCHEDULER_WRITES=0');
 const scores=overrides??scoreFunctions(),legacy=oldSeven(root,emit),ai=aiR187(root,emit);
 let aiNew=null;
 try{aiNew=manifestMarket(root,'ai-semiconductor',9,emit);}
 catch(e){emit(`AI_NEW_RAW_STATUS=NOT_COMPARABLE;REASON=${safe(e.code||e.message)}`);}
 const bio=manifestMarket(root,'biotech',17,emit);
 // Do not splice newer AI data into registered R187 history before source-mode reconciliation.
 for(const sym of aiNew?['SMH','SOXX','SPY']:[]){
  const baseline=ai.get(sym),current=aiNew.get(sym);let matched=0,diff=0;
  if(current)for(const [date,price] of baseline){if(current.has(date)){matched++;if(Math.abs(current.get(date)-price)>1e-8)diff++;}}
  emit(`AI_NEW_RAW_COMPARISON=${sym};COMMON_DAYS=${matched};PRICE_CONFLICTS=${diff};MERGED_INTO_R187=NO`);
 }
 let pass=0;
 for(const [id,a,b] of PAIRS){
  try{
   const source=id==='ai-semiconductor'?ai:id==='biotech'?bio:legacy;
   const r=compareTheme(id,a,b,source,scores);
   if(r.status==='R188_R2_PARITY_252_PASS')pass++;
   emit(`SHADOW=${id};ETF=${a},${b};SPY_DAYS=${r.rawSpyDays};MISSING_PRICE_SLOTS=${r.missingPriceSlots};SCORED_LAST252=${r.scored};R188_COMPARED=${r.comparables};PARITY_VIOLATIONS=${r.parityViolations};MAX_ABS_DIFF=${fmt(r.maxDiff)};LATEST_DATE=${r.latest?.date||'NONE'};R188_SCORE=${fmt(r.latest?.reference)};R2_SCORE=${fmt(r.latest?.candidate)};1M_MAX_DIFF=${fmt(r.recent21.max)};3M_MAX_DIFF=${fmt(r.recent63.max)};1Y_MAX_DIFF=${fmt(r.recent252.max)};STATUS=${r.status};REFERENCE_REASON=${safe(r.referenceFail.join('|')||'NONE')}`);
  }catch(e){emit(`SHADOW=${id};STATUS=ERROR;REASON=${safe(e.code||e.message)}`);}
 }
 emit(`SUMMARY=PARITY_PASS_${pass}_OF_9;SOURCE_LICENSE_VALIDATED=NO;OLD_PUBLIC_SCORE_COMPARISON=NOT_YET_DONE`);
 emit('NOTICE=R2_EQUALS_R188_WHEN_FULL_628_HISTORY_AVAILABLE_AND_SAME_TWO_ETFS_50_50');
 emit('STATUS=READ_ONLY_SCORE_PARITY_NOT_PRODUCTION_CUTOVER');
}
if(require.main===module){try{run(process.argv[2]||'E:\\ZGmini\\data');}catch(e){console.log('FATAL='+safe(e.message));process.exitCode=1;}}
module.exports={run,compareTheme,mergeRealFiles,manifestMarket,oldSeven,aiR187};
