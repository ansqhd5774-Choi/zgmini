@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem R13: live source plus PC display cache and isolated D1 key READ ONLY.
rem No news cache writes, D1 writes, scheduler change or score ledger changes.
set "ZG_R13_LOG=%~dp0IRAN_NEWS_R13_INCREMENTAL_PREFLIGHT_RESULT.txt"
set "ZG_R13_STAGE=%~dp0IRAN_NEWS_R13_PREFLIGHT_RUNTIME"
set "ZG_R13_RAW=https://raw.githubusercontent.com/ansqhd5774-Choi/zgmini/bffe048c3dc12d270bab82ce22351f0a5c47918c"
set "ZG_R13_OWN_STAGE=0"
> "%ZG_R13_LOG%" echo ZGMINI IRAN NEWS R13 - INCREMENTAL PC AND D1 READ-ONLY PREFLIGHT
>> "%ZG_R13_LOG%" echo Source SHA: bffe048c3dc12d270bab82ce22351f0a5c47918c
>> "%ZG_R13_LOG%" echo Candidate condition: Iran OR Saudi OR Yemen OR Houthi
>> "%ZG_R13_LOG%" echo Preserves manually reviewed duplicate URL content.
>> "%ZG_R13_LOG%" echo No source feed, PC cache, D1, score ledger or scheduler mutations.
if exist "%ZG_R13_STAGE%" (
 >> "%ZG_R13_LOG%" echo STOP: R13 helper directory exists. Preserved without overwrite.
 goto :failed_no_cleanup
)
where node >nul 2>nul
if errorlevel 1 goto :failed
where curl >nul 2>nul
if errorlevel 1 goto :failed
mkdir "%ZG_R13_STAGE%\scripts\iran-progress" >nul 2>&1
if errorlevel 1 goto :failed
set "ZG_R13_OWN_STAGE=1"
mkdir "%ZG_R13_STAGE%\scripts\pc-writer" >nul 2>&1
if errorlevel 1 goto :failed
mkdir "%ZG_R13_STAGE%\lib\iran-progress" >nul 2>&1
if errorlevel 1 goto :failed
call :download "scripts/iran-progress/news-display-incremental-preflight-r13.mjs" "scripts\iran-progress\news-display-incremental-preflight-r13.mjs"
if errorlevel 1 goto :failed
call :download "scripts/iran-progress/news-display-safe-preview-r12.mjs" "scripts\iran-progress\news-display-safe-preview-r12.mjs"
if errorlevel 1 goto :failed
call :download "scripts/iran-progress/news-display-model-shadow-r10.mjs" "scripts\iran-progress\news-display-model-shadow-r10.mjs"
if errorlevel 1 goto :failed
call :download "scripts/iran-progress/news-display-discover-r1.mjs" "scripts\iran-progress\news-display-discover-r1.mjs"
if errorlevel 1 goto :failed
call :download "scripts/iran-progress/news-display-io-r1.mjs" "scripts\iran-progress\news-display-io-r1.mjs"
if errorlevel 1 goto :failed
call :download "scripts/iran-progress/news-display-r1.mjs" "scripts\iran-progress\news-display-r1.mjs"
if errorlevel 1 goto :failed
call :download "scripts/iran-progress/sources.mjs" "scripts\iran-progress\sources.mjs"
if errorlevel 1 goto :failed
call :download "lib/iran-progress/news-display-r1.mjs" "lib\iran-progress\news-display-r1.mjs"
if errorlevel 1 goto :failed
call :download "scripts/pc-writer/d1.mjs" "scripts\pc-writer\d1.mjs"
if errorlevel 1 goto :failed
call :download "scripts/pc-writer/d1-transient.mjs" "scripts\pc-writer\d1-transient.mjs"
if errorlevel 1 goto :failed
call :download "scripts/pc-writer/d1-diagnostics.mjs" "scripts\pc-writer\d1-diagnostics.mjs"
if errorlevel 1 goto :failed
>> "%ZG_R13_LOG%" echo [1] Read existing PC display cache and isolated D1 public news key
>> "%ZG_R13_LOG%" echo [2] Re-fetch GOV.UK first publication timestamps, rights notice and topic matches
>> "%ZG_R13_LOG%" echo [3] Reject partial discovery and preserve previously reviewed duplicates
node "%ZG_R13_STAGE%\scripts\iran-progress\news-display-incremental-preflight-r13.mjs" --preflight > "%ZG_R13_STAGE%\result.json" 2>> "%ZG_R13_LOG%"
if errorlevel 1 goto :failed
type "%ZG_R13_STAGE%\result.json" >> "%ZG_R13_LOG%"
node -e "const x=JSON.parse(require('node:fs').readFileSync(process.argv[1],'utf8'));if(x.status!=='PASS_R13_INCREMENTAL_NEWS_PREFLIGHT_READ_ONLY'||x.discovery.feedSucceeded!==4||x.discovery.feedFailed!==0||x.discovery.apiFailed!==0||x.pcCacheWritten!==false||x.d1Written!==false||x.schedulerModified!==false||x.scoreLedgerModified!==false)throw Error('R13_PREFLIGHT_GATE_FAILED');console.log('PREFLIGHT_GATE=PASS');" "%ZG_R13_STAGE%\result.json" >> "%ZG_R13_LOG%" 2>&1
if errorlevel 1 goto :failed
call :cleanup
>> "%ZG_R13_LOG%" echo FINAL_STATUS=PASS_R13_INCREMENTAL_READ_ONLY
echo R13 preflight finished. Upload IRAN_NEWS_R13_INCREMENTAL_PREFLIGHT_RESULT.txt.
exit /b 0

:download
curl --fail --location --silent --show-error --max-time 30 "%ZG_R13_RAW%/%~1" --output "%ZG_R13_STAGE%\%~2" >> "%ZG_R13_LOG%" 2>&1
if errorlevel 1 (
 >> "%ZG_R13_LOG%" echo ERROR: Download failed: %~1
 exit /b 1
)
exit /b 0

:cleanup
if exist "%ZG_R13_STAGE%\result.json" del /q "%ZG_R13_STAGE%\result.json" >nul 2>nul
if exist "%ZG_R13_STAGE%\scripts\iran-progress\news-display-incremental-preflight-r13.mjs" del /q "%ZG_R13_STAGE%\scripts\iran-progress\news-display-incremental-preflight-r13.mjs" >nul 2>nul
if exist "%ZG_R13_STAGE%\scripts\iran-progress\news-display-safe-preview-r12.mjs" del /q "%ZG_R13_STAGE%\scripts\iran-progress\news-display-safe-preview-r12.mjs" >nul 2>nul
if exist "%ZG_R13_STAGE%\scripts\iran-progress\news-display-model-shadow-r10.mjs" del /q "%ZG_R13_STAGE%\scripts\iran-progress\news-display-model-shadow-r10.mjs" >nul 2>nul
if exist "%ZG_R13_STAGE%\scripts\iran-progress\news-display-discover-r1.mjs" del /q "%ZG_R13_STAGE%\scripts\iran-progress\news-display-discover-r1.mjs" >nul 2>nul
if exist "%ZG_R13_STAGE%\scripts\iran-progress\news-display-io-r1.mjs" del /q "%ZG_R13_STAGE%\scripts\iran-progress\news-display-io-r1.mjs" >nul 2>nul
if exist "%ZG_R13_STAGE%\scripts\iran-progress\news-display-r1.mjs" del /q "%ZG_R13_STAGE%\scripts\iran-progress\news-display-r1.mjs" >nul 2>nul
if exist "%ZG_R13_STAGE%\scripts\iran-progress\sources.mjs" del /q "%ZG_R13_STAGE%\scripts\iran-progress\sources.mjs" >nul 2>nul
if exist "%ZG_R13_STAGE%\scripts\pc-writer\d1.mjs" del /q "%ZG_R13_STAGE%\scripts\pc-writer\d1.mjs" >nul 2>nul
if exist "%ZG_R13_STAGE%\scripts\pc-writer\d1-transient.mjs" del /q "%ZG_R13_STAGE%\scripts\pc-writer\d1-transient.mjs" >nul 2>nul
if exist "%ZG_R13_STAGE%\scripts\pc-writer\d1-diagnostics.mjs" del /q "%ZG_R13_STAGE%\scripts\pc-writer\d1-diagnostics.mjs" >nul 2>nul
if exist "%ZG_R13_STAGE%\lib\iran-progress\news-display-r1.mjs" del /q "%ZG_R13_STAGE%\lib\iran-progress\news-display-r1.mjs" >nul 2>nul
if exist "%ZG_R13_STAGE%\scripts\iran-progress" rmdir "%ZG_R13_STAGE%\scripts\iran-progress" >nul 2>nul
if exist "%ZG_R13_STAGE%\scripts\pc-writer" rmdir "%ZG_R13_STAGE%\scripts\pc-writer" >nul 2>nul
if exist "%ZG_R13_STAGE%\scripts" rmdir "%ZG_R13_STAGE%\scripts" >nul 2>nul
if exist "%ZG_R13_STAGE%\lib\iran-progress" rmdir "%ZG_R13_STAGE%\lib\iran-progress" >nul 2>nul
if exist "%ZG_R13_STAGE%\lib" rmdir "%ZG_R13_STAGE%\lib" >nul 2>nul
if exist "%ZG_R13_STAGE%" rmdir "%ZG_R13_STAGE%" >nul 2>nul
exit /b 0

:failed
if "%ZG_R13_OWN_STAGE%"=="1" call :cleanup
:failed_no_cleanup
>> "%ZG_R13_LOG%" echo FINAL_STATUS=STOP_R13_INCREMENTAL_READ_ONLY
echo R13 read-only preflight stopped. Upload IRAN_NEWS_R13_INCREMENTAL_PREFLIGHT_RESULT.txt.
exit /b 1
