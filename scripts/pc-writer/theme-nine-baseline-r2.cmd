@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem Standalone read-only PC evidence collection. No sibling scripts required.
set "TASK_DATA_ROOT=E:\ZGmini\data"
set "TASK_NODE=node"
if exist "E:\ZGmini\runtime\node.exe" set "TASK_NODE=E:\ZGmini\runtime\node.exe"
set "TASK_RESULT=%~dp0THEME_NINE_BASELINE_R2_RESULT.txt"
>"%TASK_RESULT%" echo REPORT=THEME_NINE_BASELINE_R2_STANDALONE_READ_ONLY
>>"%TASK_RESULT%" echo SCOPE=EXISTING_NINE_THEME_PIPELINE_EVIDENCE_ONLY
>>"%TASK_RESULT%" echo R1_FAILURE=HELPER_SCRIPT_NOT_BESIDE_DOWNLOADED_CMD
>>"%TASK_RESULT%" echo DEPENDENCY=NODE_ONLY_NO_GITHUB_CHECKOUT_NEEDED
>>"%TASK_RESULT%" echo SOURCE_ROOT=%TASK_DATA_ROOT%
>>"%TASK_RESULT%" echo MODIFICATIONS=LOG_FILE_ONLY_BESIDE_CMD
if not exist "%TASK_DATA_ROOT%\" (
  >>"%TASK_RESULT%" echo ERROR=APPROVED_E_DATA_ROOT_NOT_FOUND
  type "%TASK_RESULT%"
  exit /b 1
)
>>"%TASK_RESULT%" echo PHASE=NODE_VERSION
"%TASK_NODE%" --version >>"%TASK_RESULT%" 2>&1
if errorlevel 1 (
  >>"%TASK_RESULT%" echo ERROR=NODE_NOT_AVAILABLE
  type "%TASK_RESULT%"
  exit /b 1
)
>>"%TASK_RESULT%" echo PHASE=EXACT_APPROVED_PATHS
"%TASK_NODE%" -e "const fs=require('fs'),p=require('path');const root=process.argv[1],targets=['theme-market-history-r131','theme-market-history-r131/marketparquet-r167','theme-market-history-r131/marketparquet-r165','theme-market-history-r131/marketparquet-r167/r181-primary-cycle.mjs','theme-market-history-r131/marketparquet-r167/r179-publish-core.mjs','theme-market-history-r131/marketparquet-r167/r171-publish.mjs','themes/ai-semiconductor/raw-manifest.json','themes/biotech/raw-manifest.json','themes/data-center-power/raw-manifest.json','pc-writer'];for(const rel of targets){try{const s=fs.statSync(p.join(root,rel));console.log('PATH='+rel+';KIND='+(s.isDirectory()?'DIR':'FILE')+';BYTES='+s.size+';MODIFIED='+s.mtime.toISOString())}catch(e){console.log('PATH='+rel+';STATUS='+String(e.code||'ERROR'))}}" "%TASK_DATA_ROOT%" >>"%TASK_RESULT%" 2>&1
set "TASK_PATH_EXIT=%ERRORLEVEL%"
>>"%TASK_RESULT%" echo EXACT_PATHS_EXIT=%TASK_PATH_EXIT%
>>"%TASK_RESULT%" echo PHASE=BOUNDED_FILE_METADATA
"%TASK_NODE%" -e "const fs=require('fs'),p=require('path');const root=process.argv[1],dirs=['theme-market-history-r131/marketparquet-r167','theme-market-history-r131/marketparquet-r165','themes/ai-semiconductor/raw','themes/biotech/raw','themes/data-center-power/raw'];for(const rel of dirs){try{const base=p.join(root,rel),files=fs.readdirSync(base,{withFileTypes:true}).filter(x=>x.isFile()&&/\.(json|parquet|csv|mjs)$/i.test(x.name)).map(x=>({name:x.name,stat:fs.statSync(p.join(base,x.name))})).sort((a,b)=>b.stat.mtimeMs-a.stat.mtimeMs);console.log('DIR='+rel+';CANDIDATE_FILE_COUNT='+files.length);for(const f of files.slice(0,12))console.log('RECENT='+rel+'/'+f.name+';BYTES='+f.stat.size+';MODIFIED='+f.stat.mtime.toISOString())}catch(e){console.log('DIR='+rel+';STATUS='+String(e.code||'ERROR'))}}" "%TASK_DATA_ROOT%" >>"%TASK_RESULT%" 2>&1
set "TASK_FILES_EXIT=%ERRORLEVEL%"
>>"%TASK_RESULT%" echo FILE_METADATA_EXIT=%TASK_FILES_EXIT%
>>"%TASK_RESULT%" echo PHASE=REGISTERED_RAW_MANIFEST_METADATA
"%TASK_NODE%" -e "const fs=require('fs'),p=require('path');const root=process.argv[1];for(const id of ['ai-semiconductor','biotech','data-center-power']){const rel='themes/'+id+'/raw-manifest.json';try{const m=JSON.parse(fs.readFileSync(p.join(root,rel),'utf8')),files=Array.isArray(m.files)?m.files:[];console.log('MANIFEST='+rel+';VERSION='+String(m.version)+';THEME='+String(m.themeId)+';ENTRIES='+files.length+';SHA_CHECK=NOT_PERFORMED');for(const [i,f] of files.slice(0,12).entries())console.log('ENTRY='+id+'/'+i+';FROM='+String(f.observationFrom)+';THROUGH='+String(f.observationThrough)+';PRICE_MODE='+String(f.priceMode)+';SHA_DECLARED='+(/^[0-9a-f]{64}$/.test(String(f.sha256))?'YES':'NO'))}catch(e){console.log('MANIFEST='+rel+';STATUS='+String(e.code||'INVALID_JSON_OR_ERROR'))}}" "%TASK_DATA_ROOT%" >>"%TASK_RESULT%" 2>&1
set "TASK_MANIFEST_EXIT=%ERRORLEVEL%"
>>"%TASK_RESULT%" echo MANIFEST_METADATA_EXIT=%TASK_MANIFEST_EXIT%
>>"%TASK_RESULT%" echo PHASE=TASKS_READ_ONLY
for %%T in (ZGMINI-PC-GetMarketHistory-ETF ZGMINI-PC-MarketParquet-ETF ZGMINI-PC-Theme-AI-Semiconductor ZGMINI-PC-Theme-Biotech) do call :query_task "%%T"
>>"%TASK_RESULT%" echo PRICE_DATA_CONTENTS=NOT_READ
>>"%TASK_RESULT%" echo RAW_SHA=NOT_VERIFIED
>>"%TASK_RESULT%" echo PUBLIC_D1_AND_PROVIDER=NOT_QUERIED
>>"%TASK_RESULT%" echo STATUS=PC_METADATA_ONLY_NO_PUBLICATION
type "%TASK_RESULT%"
if not "%TASK_PATH_EXIT%"=="0" exit /b 1
if not "%TASK_FILES_EXIT%"=="0" exit /b 1
if not "%TASK_MANIFEST_EXIT%"=="0" exit /b 1
exit /b 0

:query_task
>>"%TASK_RESULT%" echo TASK=%~1
schtasks /Query /TN "%~1" /FO LIST >>"%TASK_RESULT%" 2>&1
>>"%TASK_RESULT%" echo TASK_QUERY_EXIT=%~1:%ERRORLEVEL%
exit /b 0
