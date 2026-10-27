@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem R26: read-only seven-source news collection and article metadata audit.
rem No PC candidate cache writes, score ledger writes, D1 writes, or task changes.
set "ZG_R26_LOG=%~dp0IRAN_NEWS_R26_COLLECTION_READONLY_RESULT.txt"
set "ZG_R26_STAGE=%~dp0IRAN_NEWS_R26_READONLY_RUNTIME"
set "ZG_R26_RAW=https://raw.githubusercontent.com/ansqhd5774-Choi/zgmini/9560b41942a414896420b7a413de0dac49bb9048"
set "ZG_R26_REPORT=%ZG_R26_STAGE%\report.json"
set "ZG_R26_OWN_STAGE=0"
> "%ZG_R26_LOG%" echo ZGMINI IRAN NEWS R26 - 7 SOURCE CANDIDATE DISCOVERY READ ONLY
>> "%ZG_R26_LOG%" echo Pinned source SHA: 9560b41942a414896420b7a413de0dac49bb9048
>> "%ZG_R26_LOG%" echo Source review and original publication metadata only. No PC cache or D1 writes.
if exist "%ZG_R26_STAGE%" (
 >> "%ZG_R26_LOG%" echo STOP: R26 helper directory already exists. No overwrite.
 goto :failed_no_cleanup
)
where node >nul 2>nul
if errorlevel 1 goto :failed
where curl >nul 2>nul
if errorlevel 1 goto :failed
mkdir "%ZG_R26_STAGE%\scripts\iran-progress" >nul 2>&1
if errorlevel 1 goto :failed
mkdir "%ZG_R26_STAGE%\lib\iran-progress" >nul 2>&1
if errorlevel 1 goto :failed
set "ZG_R26_OWN_STAGE=1"
call :download "scripts/iran-progress/news-display-collection-r26.mjs" "scripts\iran-progress\news-display-collection-r26.mjs"
if errorlevel 1 goto :failed
call :download "scripts/iran-progress/news-display-multisource-audit-r24.mjs" "scripts\iran-progress\news-display-multisource-audit-r24.mjs"
if errorlevel 1 goto :failed
call :download "scripts/iran-progress/news-display-article-audit-r25.mjs" "scripts\iran-progress\news-display-article-audit-r25.mjs"
if errorlevel 1 goto :failed
call :download "scripts/iran-progress/news-display-source-registry-r26.mjs" "scripts\iran-progress\news-display-source-registry-r26.mjs"
if errorlevel 1 goto :failed
call :download "scripts/iran-progress/news-display-discover-r1.mjs" "scripts\iran-progress\news-display-discover-r1.mjs"
if errorlevel 1 goto :failed
call :download "scripts/iran-progress/sources.mjs" "scripts\iran-progress\sources.mjs"
if errorlevel 1 goto :failed
call :download "lib/iran-progress/news-display-r1.mjs" "lib\iran-progress\news-display-r1.mjs"
if errorlevel 1 goto :failed
>> "%ZG_R26_LOG%" echo [1] Read seven sources and verify article metadata without PC writes
node "%ZG_R26_STAGE%\scripts\iran-progress\news-display-collection-r26.mjs" --dry-run > "%ZG_R26_REPORT%" 2>> "%ZG_R26_LOG%"
if errorlevel 1 goto :failed
type "%ZG_R26_REPORT%" >> "%ZG_R26_LOG%"
node -e "const r=JSON.parse(require('node:fs').readFileSync(process.argv[1],'utf8'));if(!['COLLECTION_REVIEW_READY','PARTIAL_COLLECTION_REVIEW_REQUIRED'].includes(r.status)||r.sourceCount!==7||r.dryRun!==true||r.written!==false||r.scoreLedgerModified!==false||r.publicCacheModified!==false||r.d1Written!==false||r.schedulerModified!==false||r.translationModified!==false||r.rightsVerified!==0||r.displayEligible!==0)throw Error('R26_SAFE_READ_ONLY_RESULT_INVALID');console.log('R26_GATE='+r.status);" "%ZG_R26_REPORT%" >> "%ZG_R26_LOG%" 2>&1
if errorlevel 1 goto :failed
goto :passed

:download
curl --fail --location --silent --show-error --max-time 30 "%ZG_R26_RAW%/%~1" --output "%ZG_R26_STAGE%\%~2" >> "%ZG_R26_LOG%" 2>&1
if errorlevel 1 (
 >> "%ZG_R26_LOG%" echo ERROR: R26 helper download failed: %~1
 exit /b 1
)
exit /b 0

:cleanup
if exist "%ZG_R26_REPORT%" del /q "%ZG_R26_REPORT%" >nul 2>nul
if exist "%ZG_R26_STAGE%\scripts\iran-progress\news-display-collection-r26.mjs" del /q "%ZG_R26_STAGE%\scripts\iran-progress\news-display-collection-r26.mjs" >nul 2>nul
if exist "%ZG_R26_STAGE%\scripts\iran-progress\news-display-multisource-audit-r24.mjs" del /q "%ZG_R26_STAGE%\scripts\iran-progress\news-display-multisource-audit-r24.mjs" >nul 2>nul
if exist "%ZG_R26_STAGE%\scripts\iran-progress\news-display-article-audit-r25.mjs" del /q "%ZG_R26_STAGE%\scripts\iran-progress\news-display-article-audit-r25.mjs" >nul 2>nul
if exist "%ZG_R26_STAGE%\scripts\iran-progress\news-display-source-registry-r26.mjs" del /q "%ZG_R26_STAGE%\scripts\iran-progress\news-display-source-registry-r26.mjs" >nul 2>nul
if exist "%ZG_R26_STAGE%\scripts\iran-progress\news-display-discover-r1.mjs" del /q "%ZG_R26_STAGE%\scripts\iran-progress\news-display-discover-r1.mjs" >nul 2>nul
if exist "%ZG_R26_STAGE%\scripts\iran-progress\sources.mjs" del /q "%ZG_R26_STAGE%\scripts\iran-progress\sources.mjs" >nul 2>nul
if exist "%ZG_R26_STAGE%\lib\iran-progress\news-display-r1.mjs" del /q "%ZG_R26_STAGE%\lib\iran-progress\news-display-r1.mjs" >nul 2>nul
if exist "%ZG_R26_STAGE%\scripts\iran-progress" rmdir "%ZG_R26_STAGE%\scripts\iran-progress" >nul 2>nul
if exist "%ZG_R26_STAGE%\scripts" rmdir "%ZG_R26_STAGE%\scripts" >nul 2>nul
if exist "%ZG_R26_STAGE%\lib\iran-progress" rmdir "%ZG_R26_STAGE%\lib\iran-progress" >nul 2>nul
if exist "%ZG_R26_STAGE%\lib" rmdir "%ZG_R26_STAGE%\lib" >nul 2>nul
if exist "%ZG_R26_STAGE%" rmdir "%ZG_R26_STAGE%" >nul 2>nul
exit /b 0

:passed
call :cleanup
>> "%ZG_R26_LOG%" echo FINAL_STATUS=PASS_R26_READ_ONLY_CANDIDATE_AUDIT
echo R26 seven-source candidate audit finished. Upload IRAN_NEWS_R26_COLLECTION_READONLY_RESULT.txt.
exit /b 0

:failed
if "%ZG_R26_OWN_STAGE%"=="1" call :cleanup
:failed_no_cleanup
>> "%ZG_R26_LOG%" echo FINAL_STATUS=STOP_R26_READ_ONLY_AUDIT
echo R26 read-only audit stopped. Upload IRAN_NEWS_R26_COLLECTION_READONLY_RESULT.txt.
exit /b 1
