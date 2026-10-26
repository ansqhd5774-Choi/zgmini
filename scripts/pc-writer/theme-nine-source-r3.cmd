@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem Existing nine-theme R3 source/shape audit. Read-only, standalone CMD.
set "TASK_DATA_ROOT=E:\ZGmini\data"
set "TASK_NODE=node"
if exist "E:\ZGmini\runtime\node.exe" set "TASK_NODE=E:\ZGmini\runtime\node.exe"
set "TASK_RESULT=%~dp0THEME_NINE_SOURCE_R3_RESULT.txt"
>"%TASK_RESULT%" echo REPORT=THEME_NINE_SOURCE_R3_READ_ONLY
>>"%TASK_RESULT%" echo SCOPE=ORIGINAL_SEVEN_PLUS_AI_SEMICONDUCTOR_AND_BIOTECH
>>"%TASK_RESULT%" echo SOURCE=PC_STORED_SOURCE_ONLY
>>"%TASK_RESULT%" echo MODIFICATIONS=LOG_FILE_ONLY_BESIDE_CMD
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
>>"%TASK_RESULT%" echo PHASE=LEGACY_STORAGE_DIRECTORY_MAP
"%TASK_NODE%" -e "const fs=require('fs'),p=require('path'),root=process.argv[1];for(const rel of ['theme-market-history-r131','theme-market-history-r131/marketparquet-r167','theme-market-history-r131/marketparquet-r165']){try{const base=p.join(root,rel),all=fs.readdirSync(base,{withFileTypes:true}),dirs=all.filter(e=>e.isDirectory()).map(e=>e.name).sort();console.log('TREE='+rel+';TOTAL_ENTRIES='+all.length+';SUBDIR_COUNT='+dirs.length+';SUBDIR_NAMES='+dirs.slice(0,40).join(','));}catch(e){console.log('TREE='+rel+';STATUS='+String(e.code||'ERROR'))}}" "%TASK_DATA_ROOT%" >>"%TASK_RESULT%" 2>&1
set "TASK_TREE_EXIT=%ERRORLEVEL%"
>>"%TASK_RESULT%" echo TREE_EXIT=%TASK_TREE_EXIT%
>>"%TASK_RESULT%" echo PHASE=LEGACY_OPERATION_JSON_SCHEMA
"%TASK_NODE%" -e "const fs=require('fs'),p=require('path'),root=process.argv[1],base='theme-market-history-r131/marketparquet-r167',names=['R179_SOURCE_AUDIT.json','ZGMINI_R167_PRIVATE_SCORES.json','ZGMINI_R167_LAST_RUN.json','R181_PRIMARY_LAST_RUN.json','ZGMINI_R179_PUBLICATION_LAST_RUN.json','R183_PUBLICATION_RETRY_LAST_RUN.json'];for(const name of names){const rel=base+'/'+name;try{const fn=p.join(root,rel),st=fs.statSync(fn);if(st.size>120000){console.log('JSON='+rel+';STATUS=METADATA_TOO_LARGE');continue}const v=JSON.parse(fs.readFileSync(fn,'utf8')),o=v&&typeof v==='object'?v:{value:v};console.log('JSON='+rel+';TOP_KEYS='+Object.keys(o).slice(0,55).join(','));for(const [k,x] of Object.entries(o).slice(0,40)){if(Array.isArray(x))console.log('FIELD='+name+'/'+k+';TYPE=ARRAY;COUNT='+x.length+';ITEM_KEYS='+Object.keys(x[0]??{}).slice(0,16).join(','));else if(x&&typeof x==='object')console.log('FIELD='+name+'/'+k+';TYPE=OBJECT;KEYS='+Object.keys(x).slice(0,30).join(','));else if(/^(?:status|state|observationDate|latestDate|latestCommonDate|sourceDate|confirmedThrough|provisionalThrough|rows|total|count|success|failures|providerCalls|d1Writes|published|ok|generatedAt|updatedAt|startedAt|finishedAt|lastRunAt)$/i.test(k))console.log('VALUE='+name+'/'+k+'='+String(x).slice(0,70));}}catch(e){console.log('JSON='+rel+';STATUS='+String(e.code||'INVALID_JSON_OR_ERROR'))}}" "%TASK_DATA_ROOT%" >>"%TASK_RESULT%" 2>&1
set "TASK_OPERATIONS_EXIT=%ERRORLEVEL%"
>>"%TASK_RESULT%" echo OPERATION_SCHEMA_EXIT=%TASK_OPERATIONS_EXIT%
>>"%TASK_RESULT%" echo PHASE=AI_AND_BIOTECH_REGISTERED_RAW_SHA256_AND_FORMAT
"%TASK_NODE%" -e "const fs=require('fs'),p=require('path'),crypto=require('crypto'),root=process.argv[1],maxTotal=536870912;let total=0;(async()=>{for(const id of ['ai-semiconductor','biotech']){const manifest=p.join(root,'themes',id,'raw-manifest.json');let doc;try{doc=JSON.parse(fs.readFileSync(manifest,'utf8'))}catch(e){console.log('MANIFEST='+id+';STATUS='+String(e.code||'INVALID_JSON'));continue}const files=Array.isArray(doc.files)?doc.files:[];console.log('MANIFEST='+id+';ENTRIES='+files.length+';VALID_THEME='+String(doc.themeId===id));const base=fs.realpathSync(p.dirname(manifest));for(const [i,f] of files.entries()){let status='UNKNOWN',size='NA',format='UNKNOWN',keys='';try{const rel=f.path;if(typeof rel!=='string'||!rel||p.isAbsolute(rel)||rel.includes('\\')||rel.includes(':')||rel.split('/').some(x=>!x||x==='.'||x==='..'))throw Error('UNSAFE_PATH');const full=fs.realpathSync(p.resolve(base,rel));if(!full.startsWith(base+p.sep))throw Error('PATH_OUTSIDE_MANIFEST');const stat=fs.statSync(full);if(!stat.isFile())throw Error('NOT_FILE');size=stat.size;format=p.extname(full).toLowerCase()||'NO_EXTENSION';if(total+stat.size>maxTotal){status='SKIPPED_TOTAL_512M_LIMIT'}else{total+=stat.size;const h=crypto.createHash('sha256');for await(const chunk of fs.createReadStream(full))h.update(chunk);status=/^[a-f0-9]{64}$/.test(String(f.sha256))?(h.digest('hex')===f.sha256?'SHA_VERIFIED':'SHA_MISMATCH'):'INVALID_EXPECTED_SHA'}if(/\.(json|jsonl|ndjson|csv|txt)$/i.test(full)){const fd=fs.openSync(full,'r'),b=Buffer.alloc(32768),n=fs.readSync(fd,b,0,b.length,0);fs.closeSync(fd);keys=[...new Set([...b.subarray(0,n).toString('utf8').matchAll(/\x22([A-Za-z_][A-Za-z0-9_-]{0,35})\x22\s*:/g)].map(x=>x[1]))].slice(0,22).join(',')}}catch(e){status=String(e.code||e.message||'ERROR').slice(0,55)}console.log('RAW='+id+'/'+i+';VERIFY='+status+';BYTES='+size+';EXT='+format+';SAMPLE_KEYS='+keys)}}console.log('TOTAL_BYTES_HASH_ATTEMPTED='+total)})().catch(e=>{console.log('FATAL='+String(e.message));process.exitCode=1})" "%TASK_DATA_ROOT%" >>"%TASK_RESULT%" 2>&1
set "TASK_RAW_EXIT=%ERRORLEVEL%"
>>"%TASK_RESULT%" echo RAW_INSPECTION_EXIT=%TASK_RAW_EXIT%
>>"%TASK_RESULT%" echo PHASE=ARCHIVED_PARQUET_FILE_HEAD
"%TASK_NODE%" -e "const fs=require('fs'),p=require('path'),root=process.argv[1],dir=p.join(root,'theme-market-history-r131/marketparquet-r165');try{const files=fs.readdirSync(dir).filter(x=>/^etf_daily_\d{4}-\d\d-\d\d\.parquet$/.test(x)).sort().slice(-10);for(const name of files){const fd=fs.openSync(p.join(dir,name),'r'),b=Buffer.alloc(4),n=fs.readSync(fd,b,0,4,0);fs.closeSync(fd);console.log('PARQUET='+name+';MAGIC='+(n===4?b.toString('ascii'):'SHORT_FILE'))}}catch(e){console.log('PARQUET_DIRECTORY_STATUS='+String(e.code||'ERROR'))}" "%TASK_DATA_ROOT%" >>"%TASK_RESULT%" 2>&1
set "TASK_PARQUET_EXIT=%ERRORLEVEL%"
>>"%TASK_RESULT%" echo PARQUET_HEAD_EXIT=%TASK_PARQUET_EXIT%
>>"%TASK_RESULT%" echo LEGACY_SEVEN_RAW_MANIFEST=UNREGISTERED_PER_GITHUB_REGISTRY_NOT_INFERRED
>>"%TASK_RESULT%" echo PRICE_SERIES_CALCULATION=NOT_ATTEMPTED
>>"%TASK_RESULT%" echo PUBLIC_D1_AND_PROVIDER=NOT_QUERIED
>>"%TASK_RESULT%" echo STATUS=READ_ONLY_SOURCE_TRIAGE_NOT_PUBLICATION
type "%TASK_RESULT%"
if not "%TASK_TREE_EXIT%"=="0" exit /b 1
if not "%TASK_OPERATIONS_EXIT%"=="0" exit /b 1
if not "%TASK_RAW_EXIT%"=="0" exit /b 1
if not "%TASK_PARQUET_EXIT%"=="0" exit /b 1
exit /b 0
