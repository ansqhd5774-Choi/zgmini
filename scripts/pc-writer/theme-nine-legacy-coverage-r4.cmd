@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem Original 7 legacy stored-source coverage + AI R187 asset. No external writes.
set "TASK_DATA_ROOT=E:\ZGmini\data"
set "TASK_NODE=node"
if exist "E:\ZGmini\runtime\node.exe" set "TASK_NODE=E:\ZGmini\runtime\node.exe"
set "TASK_RESULT=%~dp0THEME_NINE_LEGACY_R4_RESULT.txt"
>"%TASK_RESULT%" echo REPORT=THEME_NINE_LEGACY_COVERAGE_R4_READ_ONLY
>>"%TASK_RESULT%" echo INPUT=PC_STORED_SOURCE_ONLY
>>"%TASK_RESULT%" echo TARGET=ORIGINAL_SEVEN_PLUS_EXISTING_AI_R187_HISTORICAL_ASSET
>>"%TASK_RESULT%" echo MODIFICATIONS=RESULT_TXT_BESIDE_CMD_ONLY
>>"%TASK_RESULT%" echo PROVIDER_D1_SCHEDULER_WRITES=NONE
if not exist "%TASK_DATA_ROOT%\" (
  >>"%TASK_RESULT%" echo ERROR=APPROVED_E_DATA_ROOT_NOT_FOUND
  type "%TASK_RESULT%"
  exit /b 1
)
"%TASK_NODE%" --version >>"%TASK_RESULT%" 2>&1
if errorlevel 1 (
  >>"%TASK_RESULT%" echo ERROR=NODE_NOT_AVAILABLE
  type "%TASK_RESULT%"
  exit /b 1
)
>>"%TASK_RESULT%" echo PHASE=LEGACY_TREE_FILE_TYPES_AND_RECENT_FILES
"%TASK_NODE%" -e "const fs=require('fs'),p=require('path'),root=process.argv[1],base=p.join(root,'theme-market-history-r131'),dirs=['raw','derived','warmup'];for(const rel of dirs){const start=p.join(base,rel),records=[];let skipped=0;function walk(dir,depth){if(depth>3)return;let ents;try{ents=fs.readdirSync(dir,{withFileTypes:true})}catch(e){console.log('DIR_ERROR='+p.relative(base,dir)+';CODE='+String(e.code||'ERROR'));return}for(const e of ents){if(e.isDirectory()){if(depth<3)walk(p.join(dir,e.name),depth+1)}else if(e.isFile()){if(records.length<5000){try{const f=p.join(dir,e.name),s=fs.statSync(f);records.push({rel:p.relative(base,f).split(p.sep).join('/'),size:s.size,modified:s.mtimeMs,ext:p.extname(e.name).toLowerCase()||'NO_EXT'})}catch{skipped++}}else skipped++}}}walk(start,0);const byExt={};for(const f of records)byExt[f.ext]=(byExt[f.ext]??0)+1;console.log('DIR='+rel+';FILES_COUNT='+records.length+';SKIPPED='+skipped+';BY_EXT='+Object.entries(byExt).map(x=>x.join(':')).join(','));records.sort((a,b)=>b.modified-a.modified);for(const f of records.slice(0,24))console.log('FILE='+f.rel+';BYTES='+f.size+';EXT='+f.ext+';MODIFIED='+new Date(f.modified).toISOString())}" "%TASK_DATA_ROOT%" >>"%TASK_RESULT%" 2>&1
set "TASK_FILES_EXIT=%ERRORLEVEL%"
>>"%TASK_RESULT%" echo FILE_MAP_EXIT=%TASK_FILES_EXIT%
>>"%TASK_RESULT%" echo PHASE=LEGACY_SEVEN_RAW_JSONL_COVERAGE_628_DAY_GATE
"%TASK_NODE%" -e "const fs=require('fs'),p=require('path'),readline=require('readline'),root=process.argv[1],base=p.join(root,'theme-market-history-r131'),maxBytes=268435456,syms=['SPY','BOTZ','ROBO','SKYY','CLOU','DRIV','NLR','URA','ITA','SHLD','FINX','ARKF','CIBR','BUG'],stats=new Map(syms.map(x=>[x,{valid:0,gaps:0,days:new Set()}]));let budget=0,scanned=0,invalid=0,unknown=0;(async()=>{const candidates=[];function find(d,depth){if(depth>3)return;let ents;try{ents=fs.readdirSync(d,{withFileTypes:true})}catch{return}for(const e of ents){const f=p.join(d,e.name);if(e.isDirectory()&&depth<3)find(f,depth+1);else if(e.isFile()&&/\.(jsonl|ndjson)$/i.test(e.name))candidates.push(f)}}for(const d of ['raw','derived','warmup'])find(p.join(base,d),0);candidates.sort();const ny=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}),early=new Set(['2024-07-03','2024-11-29','2024-12-24','2025-07-03','2025-11-28','2025-12-24','2026-11-27','2026-12-24']);for(const f of candidates){const size=fs.statSync(f).size,rel=p.relative(base,f).split(p.sep).join('/');if(budget+size>maxBytes){console.log('SKIP_FILE='+rel+';REASON=TOTAL_256M_CAP');continue}budget+=size;scanned++;let lines=0,bad=0,matched=0;for await(const line of readline.createInterface({input:fs.createReadStream(f),crlfDelay:Infinity})){if(!line.trim())continue;lines++;let v;try{v=JSON.parse(line)}catch{bad++;continue}if(!v||typeof v!=='object'||typeof v.symbol!=='string'||!stats.has(v.symbol)||!Number.isFinite(Date.parse(v.timestamp))){unknown++;continue}const rec=stats.get(v.symbol);if(v.is_gap===true){rec.gaps++;continue}if(typeof v.close!=='number'||!Number.isFinite(v.close)||v.close<=0){invalid++;continue}rec.valid++;const parts=Object.fromEntries(ny.formatToParts(new Date(v.timestamp)).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));const day=parts.year+'-'+parts.month+'-'+parts.day;if(parts.hour===(early.has(day)?'12':'15')){rec.days.add(day);matched++}}console.log('JSONL='+rel+';LINES='+lines+';PARSE_ERRORS='+bad+';SELECTED_HOUR_ROWS='+matched)}const spy=stats.get('SPY').days;for(const [sym,s] of stats){const dates=[...s.days].sort(),common=dates.filter(d=>spy.has(d)).length;console.log('SYMBOL='+sym+';VALID_HOURLY_ROWS='+s.valid+';GAPS='+s.gaps+';SELECTED_DAYS='+dates.length+';FIRST='+String(dates[0]??'NONE')+';LAST='+String(dates.at(-1)??'NONE')+';SPY_OVERLAP='+common+';MIN_628='+String(common>=628))}console.log('SCAN_FILES='+scanned+';SCANNED_BYTES='+budget+';OTHER_SCHEMA_ROWS='+unknown+';INVALID_CLOSE='+invalid+';GATE=HOUR_PROXY_COVERAGE_ONLY_NOT_SCORE')})().catch(e=>{console.log('FATAL='+String(e.message));process.exitCode=1})" "%TASK_DATA_ROOT%" >>"%TASK_RESULT%" 2>&1
set "TASK_COVERAGE_EXIT=%ERRORLEVEL%"
>>"%TASK_RESULT%" echo COVERAGE_EXIT=%TASK_COVERAGE_EXIT%
>>"%TASK_RESULT%" echo PHASE=REGISTERED_AI_R187_LEGACY_ASSET_SHA_AND_SHAPE
"%TASK_NODE%" -e "const fs=require('fs'),p=require('path'),crypto=require('crypto'),root=process.argv[1],rel='pc-writer/local-theme-ai-semiconductor-r187-raw-b79af822c7c91a6d.json',expected='b79af822c7c91a6d89a79f8275abb75a90f95e6dee3bd6bfc7435395c142ec9a';try{const f=p.join(root,rel),s=fs.statSync(f);console.log('AI_R187_ASSET='+rel+';BYTES='+s.size+';MODIFIED='+s.mtime.toISOString());if(s.size>134217728){console.log('AI_R187_SHA=SKIPPED_OVER_128M')}else{const h=crypto.createHash('sha256');h.update(fs.readFileSync(f));console.log('AI_R187_SHA='+(h.digest('hex')===expected?'SHA_VERIFIED':'SHA_MISMATCH'))}if(s.size<10000000){const o=JSON.parse(fs.readFileSync(f,'utf8'));console.log('AI_R187_TOP_KEYS='+Object.keys(o).slice(0,35).join(','));for(const [k,v] of Object.entries(o).slice(0,18)){if(Array.isArray(v))console.log('AI_R187_ARRAY='+k+';COUNT='+v.length+';ITEM_KEYS='+Object.keys(v[0]??{}).slice(0,22).join(','));else if(v&&typeof v==='object')console.log('AI_R187_OBJECT='+k+';KEYS='+Object.keys(v).slice(0,25).join(','))}}}catch(e){console.log('AI_R187_ASSET_STATUS='+String(e.code||'INVALID_JSON_OR_ERROR'))}" "%TASK_DATA_ROOT%" >>"%TASK_RESULT%" 2>&1
set "TASK_AI_EXIT=%ERRORLEVEL%"
>>"%TASK_RESULT%" echo AI_R187_EXIT=%TASK_AI_EXIT%
>>"%TASK_RESULT%" echo LEGACY_628_PRICE_GATE=NOT_ESTABLISHED_BY_FOLDER_EXISTENCE
>>"%TASK_RESULT%" echo SOURCE_PRICE_MODE=VERIFY_BEFORE_ANY_SHADOW_COMPARISON
>>"%TASK_RESULT%" echo COMPUTATION_AND_PUBLICATION=NOT_ATTEMPTED
>>"%TASK_RESULT%" echo STATUS=READ_ONLY_REAL_HOURLY_COVERAGE_DISCOVERY
type "%TASK_RESULT%"
if not "%TASK_FILES_EXIT%"=="0" exit /b 1
if not "%TASK_COVERAGE_EXIT%"=="0" exit /b 1
if not "%TASK_AI_EXIT%"=="0" exit /b 1
exit /b 0
