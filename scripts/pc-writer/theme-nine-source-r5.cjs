// Branch-only, read-only real-price coverage audit. Bundled in one standalone CMD.
// Reports counts and schema, never exports price values or writes to source storage.
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');

const SYMBOLS=['SPY','BOTZ','ROBO','SKYY','CLOU','DRIV','NLR','URA','ITA','SHLD','FINX','ARKF','CIBR','BUG'];
const PAIRS=[['robotics','BOTZ','ROBO'],['cloud-saas','SKYY','CLOU'],
 ['autonomous-driving','DRIV','BOTZ'],['nuclear-smr','NLR','URA'],
 ['defense','ITA','SHLD'],['fintech','FINX','ARKF'],['cybersecurity','CIBR','BUG'],
 ['ai-semiconductor','SMH','SOXX'],['biotech','IBB','XBI']];
const EARLY=new Set(['2024-07-03','2024-11-29','2024-12-24',
 '2025-07-03','2025-11-28','2025-12-24','2026-11-27','2026-12-24']);
const NY=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'});
const PRICE_FIELDS=['proxyClose','close','adjustedClose','adjClose','closingPrice','price','c'];
const DATE_FIELDS=['date','sessionDate','tradingDate','day'];
const TIME_FIELDS=['timestamp','datetime','dateTime','time','t'];
const sha=data=>crypto.createHash('sha256').update(data).digest('hex');
const valid=n=>typeof n==='number'&&Number.isFinite(n)&&n>0;
const isoDay=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s+'T00:00:00Z'));
const quote=x=>String(x??'NONE').replace(/[^A-Za-z0-9_.:/,-]/g,'_');
function nyParts(ts){
 const d=new Date(ts);if(!Number.isFinite(d.getTime()))return null;
 const parts=Object.fromEntries(NY.formatToParts(d).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
 return {date:`${parts.year}-${parts.month}-${parts.day}`,hour:parts.hour};
}
function dateFrom(row){
 const direct=DATE_FIELDS.find(k=>isoDay(row[k]));
 for(const k of TIME_FIELDS){
  const v=row[k];if(v===undefined||v===null)continue;
  if(typeof v==='string'&&isoDay(v))return {date:v,hour:null,dateField:k};
  // No implicit conversion of timezone-free hourly data.
  if(typeof v==='string'&&!/(Z|[+-]\d{2}:?\d{2})$/i.test(v))continue;
  // Some daily data carry a midnight UTC timestamp in addition to an explicit session date.
  if(direct&&typeof v==='string'&&/T00:00(?::00(?:\.\d+)?)?Z$/i.test(v))continue;
  const ts=typeof v==='number'&&v>1000000000?new Date(v<1e11?v*1000:v):v;
  const parts=nyParts(ts);if(parts)return {...parts,dateField:k};
 }
 if(direct)return {date:row[direct],hour:null,dateField:direct};
 return null;
}
function priceFrom(row){
 for(const key of PRICE_FIELDS){
  const v=row[key],n=typeof v==='string'&&/^\d+(?:\.\d+)?$/.test(v)?Number(v):v;
  if(valid(n))return {price:n,field:key};
 }
 return null;
}
function extractArray(a,key){
 if(a.length<2||!a[0]||typeof a[0]!=='object'||Array.isArray(a[0]))return null;
 const rows=[],seenHour=new Map();let gaps=0,invalid=0,ambiguous=0,mode='UNKNOWN',field='NONE';
 for(const row of a){
  if(!row||typeof row!=='object'||Array.isArray(row))continue;
  if(row.is_gap===true||row.isGap===true){gaps++;continue;}
  const d=dateFrom(row),p=priceFrom(row);
  if(!d||!p){invalid++;continue;}
  if(d.hour!==null&&d.hour!==(EARLY.has(d.date)?'12':'15'))continue;
  mode=d.hour===null?'DATE_LEVEL':'NY_HOURLY_15_12';field=p.field;
  // Multiple 15:xx bars per session: same price -> de-dupe; different price is ambiguous.
  const old=seenHour.get(d.date);
  if(old!==undefined){if(Math.abs(old-p.price)>1e-10)ambiguous++;continue;}
  seenHour.set(d.date,p.price);rows.push({date:d.date,price:p.price});
 }
 rows.sort((x,y)=>x.date.localeCompare(y.date));
 return {key,rows,gaps,invalid,ambiguous,mode,priceField:field,rawCount:a.length,
  itemKeys:Object.keys(a[0]).slice(0,14)};
}
function arraysIn(value){
 const results=[];
 function walk(x,k,depth){
  if(depth>7||!x||typeof x!=='object'||results.length>80)return;
  if(Array.isArray(x)){
   const record=extractArray(x,k);
   if(record&&record.rows.length)results.push(record);
   // Large rows arrays must never recurse into every bar.
   if(x.length>30||record)return;
   for(let i=0;i<x.length;i++)walk(x[i],`${k}[${i}]`,depth+1);
  }else{
   for(const [name,v] of Object.entries(x).slice(0,75))walk(v,k?`${k}.${name}`:name,depth+1);
  }
 }
 walk(value,'',0);
 return results.sort((a,b)=>b.rows.length-a.rows.length||a.ambiguous-b.ambiguous||a.key.localeCompare(b.key));
}
function analyzeFile(filename){
 try{
  const bytes=fs.readFileSync(filename),obj=JSON.parse(bytes.toString('utf8'));
  const candidates=arraysIn(obj),best=candidates[0]??null;
  const basename=path.basename(filename),prefix=basename.match(/_([a-f0-9]{16})\./i)?.[1]??null;
  return {file:basename,bytes:bytes.length,shaPrefix16:sha(bytes).slice(0,16),
   filenameHashMatches:prefix?sha(bytes).startsWith(prefix):null,
   topKeys:obj&&typeof obj==='object'?Object.keys(obj).slice(0,15):[],
   candidates:candidates.length,best,items:best?.rows??[],error:null};
 }catch(e){return {file:path.basename(filename),items:[],error:String(e.code||e.message)};}
}
function dirFiles(dir,sym,keyword){
 try{return fs.readdirSync(dir).filter(name=>name.startsWith(sym+'_')&&name.endsWith('.json')&&(!keyword||name.includes(keyword)))
  .sort().map(name=>path.join(dir,name));}catch{return [];}
}
function combine(files){
 const days=new Map();let conflicts=0,duplicate=0,errors=0,mode=new Set(),cases=[];
 for(const file of files){
  if(file.error){errors++;continue;}if(!file.best)continue;
  mode.add(file.best.mode);
  conflicts+=file.best.ambiguous;
  for(const row of file.items){
   if(days.has(row.date)){
    duplicate++;if(Math.abs(days.get(row.date)-row.price)>1e-8)conflicts++;
   }else days.set(row.date,row.price);
  }
  if(cases.length<3)cases.push(file);
 }
 const sorted=[...days.keys()].sort();
 return {days,dates:sorted,conflicts,duplicate,errors,mode:[...mode],files:files.length,cases};
}
function summary(prefix,bucket,emit){
 emit(`${prefix};FILES=${bucket.files};DAYS=${bucket.dates.length};FIRST=${bucket.dates[0]||'NONE'};LAST=${bucket.dates.at(-1)||'NONE'};DUPLICATES=${bucket.duplicate};PRICE_CONFLICTS=${bucket.conflicts};PARSE_ERRORS=${bucket.errors};MODES=${bucket.mode.join(',')||'NONE'}`);
 for(const f of bucket.cases){const b=f.best;
  emit(`${prefix}_SCHEMA;FILE=${quote(f.file)};TOP=${quote(f.topKeys.join(','))};ARRAY=${quote(b?.key)};ITEM_KEYS=${quote(b?.itemKeys?.join(','))};PRICE_FIELD=${quote(b?.priceField)};ROWS=${b?.rawCount??0};SELECTED_DAYS=${b?.rows.length??0};BAD_ROWS=${b?.invalid??0};GAPS=${b?.gaps??0};HOUR_AMBIGUOUS=${b?.ambiguous??0};SHA_NAME_MATCH=${f.filenameHashMatches??'UNKNOWN'}`);
 }
}
function manifestHourly(root,theme,emit){
 const home=path.join(root,'themes',theme),manifestFile=path.join(home,'raw-manifest.json');
 const per=new Map();let verified=0,missing=0,unreadable=0,files=0;
 try{
  const manifest=JSON.parse(fs.readFileSync(manifestFile,'utf8'));
  const entries=Array.isArray(manifest.files)?manifest.files:[];
  for(const row of entries){
   if(typeof row.path!=='string'||!/^raw\/[A-Z0-9]+_[a-zA-Z0-9._-]+\.jsonl$/.test(row.path))continue;
   const file=path.join(home,...row.path.split('/'));
   if(!fs.existsSync(file)){missing++;continue;}
   try{
    const bytes=fs.readFileSync(file);files++;
    if(typeof row.sha256==='string'&&sha(bytes)===row.sha256)verified++;
    const lines=bytes.toString('utf8').split(/\r?\n/);
    for(const line of lines){if(!line.trim())continue;
     let b;try{b=JSON.parse(line);}catch{unreadable++;continue;}
     const d=dateFrom(b),p=priceFrom(b),sym=b.symbol;
     if(typeof sym!=='string'||!d||!p||b.is_gap===true||
        d.hour!==(EARLY.has(d.date)?'12':'15'))continue;
     if(!per.has(sym))per.set(sym,new Map());const m=per.get(sym);
     // Conflicting selected NY-hour data remain unaccepted.
     if(!m.has(d.date))m.set(d.date,p.price);
     else if(Math.abs(m.get(d.date)-p.price)>1e-8)m.set(d.date,NaN);
    }
   }catch{unreadable++;}
  }
  emit(`MANIFEST=${theme};FILES=${files};SHA_VERIFIED=${verified};MISSING=${missing};PARSE_ERRORS=${unreadable}`);
 }catch(e){emit(`MANIFEST=${theme};ERROR=${quote(e.code||e.message)}`);}
 for(const [sym,days] of per){for(const [date,val] of days)if(!valid(val))days.delete(date);
  const dates=[...days.keys()].sort();emit(`MANIFEST_SYMBOL=${theme}/${sym};DAYS=${dates.length};FIRST=${dates[0]||'NONE'};LAST=${dates.at(-1)||'NONE'}`);
 }
 return per;
}
function run(dataRoot,emit=console.log){
 emit('REPORT=THEME_NINE_SOURCE_R5_REAL_JSON_COVERAGE');
 emit('MODE=PRIVATE_READ_ONLY;NO_PROVIDER_CALLS=1;NO_D1_WRITES=1;NO_SCHEDULER_CHANGES=1');
 const base=path.join(dataRoot,'theme-market-history-r131');
 if(!fs.existsSync(base))throw Error('APPROVED_MARKET_HISTORY_ROOT_MISSING');
 const groups=new Map(),effective=new Map();
 for(const sym of SYMBOLS){
  const warm=combine(dirFiles(path.join(base,'warmup','raw'),sym).map(analyzeFile));
  const joined=combine(dirFiles(path.join(base,'derived','warmup-joined'),sym,'joined-research.json').map(analyzeFile));
  const recent=combine(dirFiles(path.join(base,'raw'),sym).map(analyzeFile));
  summary(`SOURCE=${sym}/WARMUP_RAW`,warm,emit);
  summary(`SOURCE=${sym}/JOINED_DERIVED`,joined,emit);
  summary(`SOURCE=${sym}/RECENT_RAW`,recent,emit);
  // Explicitly candidate-only; raw/derived provider price reconciliation is not implied.
  const union=new Map(warm.days);let crossConflict=0;
  for(const [date,price] of joined.days){if(union.has(date)&&Math.abs(union.get(date)-price)>1e-8)crossConflict++;else union.set(date,price);}
  groups.set(sym,{warm,joined,recent,crossConflict});
  effective.set(sym,union);
  emit(`CANDIDATE=${sym};WARMUP_PLUS_JOINED_DAYS=${union.size};CROSS_SOURCE_CONFLICTS=${crossConflict};REAL_SOURCE_MODE_RECONCILED=NO`);
 }
 const aiPath=path.join(dataRoot,'pc-writer','local-theme-ai-semiconductor-r187-raw-b79af822c7c91a6d.json');
 let ai=new Map();
 try{
  const bytes=fs.readFileSync(aiPath),hash=sha(bytes),obj=JSON.parse(bytes.toString('utf8'));
  emit(`AI_R187=FOUND;SHA_VERIFIED=${hash==='b79af822c7c91a6d89a79f8275abb75a90f95e6dee3bd6bfc7435395c142ec9a'};TOP=${quote(Object.keys(obj).join(','))}`);
  for(const sym of ['SMH','SOXX','SPY']){
   const parts=arraysIn(obj.instruments?.[sym]),best=parts[0],days=new Map((best?.rows??[]).map(r=>[r.date,r.price]));
   ai.set(sym,days);const dates=[...days.keys()].sort();
   emit(`AI_SYMBOL=${sym};ARRAY=${quote(best?.key)};ITEM_KEYS=${quote(best?.itemKeys?.join(','))};SELECTED_DAYS=${dates.length};FIRST=${dates[0]||'NONE'};LAST=${dates.at(-1)||'NONE'};CONFLICTS=${best?.ambiguous??0}`);
  }
 }catch(e){emit(`AI_R187=UNAVAILABLE;ERROR=${quote(e.code||e.message)}`);}
 const bio=manifestHourly(dataRoot,'biotech',emit);
 const overlaps=(...xs)=>{const [first,...rest]=xs;return first?[...first.keys()].filter(day=>rest.every(m=>m.has(day))).sort():[];};
 for(const [id,a,b] of PAIRS){
  const src=id==='ai-semiconductor'?ai:id==='biotech'?bio:effective;
  const dates=overlaps(src.get('SPY'),src.get(a),src.get(b));
  const bad=id==='ai-semiconductor'||id==='biotech'?false:[a,b,'SPY'].some(sym=>groups.get(sym).crossConflict>0||groups.get(sym).warm.conflicts>0||groups.get(sym).joined.conflicts>0);
  emit(`THEME=${id};TICKERS=${a},${b};COMMON_CANDIDATE_DAYS=${dates.length};FIRST=${dates[0]||'NONE'};LAST=${dates.at(-1)||'NONE'};MIN_628_CANDIDATE=${dates.length>=628};SOURCE_CONFLICTS=${bad?'YES':'NO'};SCORE_COMPUTED=NO`);
 }
 emit('NOTICE=CANDIDATE_DAY_COUNT_NOT_R188_PARITY_OR_PRICE_LICENSE_APPROVAL');
 emit('STATUS=R5_READ_ONLY_COVERAGE_DONE');
}
if(require.main===module){try{run(process.argv[2]||'E:\\ZGmini\\data');}catch(e){console.log('FATAL='+quote(e.message));process.exitCode=1;}}
module.exports={run,analyzeFile,extractArray,arraysIn,dateFrom,combine,manifestHourly};
