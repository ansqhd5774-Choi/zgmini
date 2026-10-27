@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem R14 explicitly approved one-shot display news publication.
rem This does NOT modify the R13 scheduler, VBS, or R3/R5 SQLite score ledger.
set "ZG_R14_LOG=%~dp0IRAN_NEWS_R14_PUBLISH_ONCE_RESULT.txt"
set "ZG_R14_STAGE=%~dp0IRAN_NEWS_R14_ONCE_RUNTIME"
set "ZG_R14_RAW=https://raw.githubusercontent.com/ansqhd5774-Choi/zgmini/e7fd9814a578412af095ce42fd53d9a982da5ab5"
set "ZG_R14_OWN_STAGE=0"
set "ZG_R14_STARTED=0"
> "%ZG_R14_LOG%" echo ZGMINI IRAN NEWS R14 - GUARDED SINGLE INCREMENTAL PUBLICATION
>> "%ZG_R14_LOG%" echo Source SHA: e7fd9814a578412af095ce42fd53d9a982da5ab5
>> "%ZG_R14_LOG%" echo Scope: PC display-only cache and ONE isolated D1 news key only.
>> "%ZG_R14_LOG%" echo Existing manually reviewed articles and R3/R5 score flow preserved.
>> "%ZG_R14_LOG%" echo One-time action. Do not blindly retry if publish was attempted.
if exist "%ZG_R14_STAGE%" (
 >> "%ZG_R14_LOG%" echo STOP: R14 helper directory exists. No overwrite.
 goto :failed_no_cleanup
)
where node >nul 2>nul
if errorlevel 1 goto :failed
where curl >nul 2>nul
if errorlevel 1 goto :failed
mkdir "%ZG_R14_STAGE%\scripts\iran-progress" >nul 2>&1
if errorlevel 1 goto :failed
set "ZG_R14_OWN_STAGE=1"
mkdir "%ZG_R14_STAGE%\scripts\pc-writer" >nul 2>&1
if errorlevel 1 goto :failed
mkdir "%ZG_R14_STAGE%\lib\iran-progress" >nul 2>&1
if errorlevel 1 goto :failed
call :download "scripts/iran-progress/news-display-publish-incremental-r14.mjs" "scripts\iran-progress\news-display-publish-incremental-r14.mjs"
if errorlevel 1 goto :failed
call :download "scripts/iran-progress/news-display-incremental-preflight-r13.mjs" "scripts\iran-progress\news-display-incremental-preflight-r13.mjs"
if errorlevel 1 goto :failed
call :download "scripts/iran-progress/news-display-safe-preview-r12.mjs" "scripts\iran-progress\news-display-safe-preview-r12.mjs"
if errorlevel 1 goto :failed
call :download "scripts/iran-progress/news-display-model-shadow-r10.mjs" "scripts\iran-progress\news-display-model-shadow-r10.mjs"
if errorlevel 1 goto :failed
call :download "scripts/iran-progress/news-display-discover-r1.mjs" "scripts\iran-progress\news-display-discover-r1.mjs"
if errorlevel 1 goto :failed
call :download "scripts/iran-progress/news-display-maintenance-r1.mjs" "scripts\iran-progress\news-display-maintenance-r1.mjs"
if errorlevel 1 goto :failed
call :download "scripts/iran-progress/news-display-publication-r1.mjs" "scripts\iran-progress\news-display-publication-r1.mjs"
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
>> "%ZG_R14_LOG%" echo [1] Mandatory live source, rights, PC cache and D1 preflight - READ ONLY
node "%ZG_R14_STAGE%\scripts\iran-progress\news-display-incremental-preflight-r13.mjs" --preflight > "%ZG_R14_STAGE%\preflight.json" 2>> "%ZG_R14_LOG%"
if errorlevel 1 goto :failed
type "%ZG_R14_STAGE%\preflight.json" >> "%ZG_R14_LOG%"
node -e "const x=JSON.parse(require('node:fs').readFileSync(process.argv[1],'utf8'));if(x.status!=='PASS_R13_INCREMENTAL_NEWS_PREFLIGHT_READ_ONLY'||x.discovery.feedSucceeded!==4||x.discovery.feedFailed!==0||x.discovery.apiFailed!==0||x.pcCacheWritten!==false||x.d1Written!==false||x.schedulerModified!==false||x.scoreLedgerModified!==false)throw Error('R14_SOURCE_AND_PC_GATE_FAILED');console.log('PREFLIGHT_GATE=PASS');" "%ZG_R14_STAGE%\preflight.json" >> "%ZG_R14_LOG%" 2>&1
if errorlevel 1 goto :failed
>> "%ZG_R14_LOG%" echo [2] One guarded publication attempt to PC display cache and news-only D1 key
set "ZG_R14_STARTED=1"
set "ZGMINI_IRAN_NEWS_R14_APPROVED=YES"
node "%ZG_R14_STAGE%\scripts\iran-progress\news-display-publish-incremental-r14.mjs" --publish-once > "%ZG_R14_STAGE%\publish.json" 2>> "%ZG_R14_LOG%"
set "ZG_R14_EXIT=%ERRORLEVEL%"
set "ZGMINI_IRAN_NEWS_R14_APPROVED="
if not "%ZG_R14_EXIT%"=="0" goto :uncertain
type "%ZG_R14_STAGE%\publish.json" >> "%ZG_R14_LOG%"
node -e "const x=JSON.parse(require('node:fs').readFileSync(process.argv[1],'utf8'));if(x.status!=='PASS_R14_NEWS_ONLY_INCREMENTAL_PUBLISHED'||!['VERIFIED','UNCHANGED'].includes(x.d1Publication)||x.scoreLedgerModified!==false||x.schedulerModified!==false)throw Error('R14_REMOTE_READBACK_GATE_FAILED');console.log('D1_READBACK_GATE=PASS');" "%ZG_R14_STAGE%\publish.json" >> "%ZG_R14_LOG%" 2>&1
if errorlevel 1 goto :uncertain
call :cleanup
>> "%ZG_R14_LOG%" echo FINAL_STATUS=PASS_R14_PUBLISH_ONCE_D1_VERIFIED
echo R14 publish once completed. Upload IRAN_NEWS_R14_PUBLISH_ONCE_RESULT.txt.
exit /b 0

:download
curl --fail --location --silent --show-error --max-time 30 "%ZG_R14_RAW%/%~1" --output "%ZG_R14_STAGE%\%~2" >> "%ZG_R14_LOG%" 2>&1
if errorlevel 1 (
 >> "%ZG_R14_LOG%" echo ERROR: Download failed: %~1
 exit /b 1
)
exit /b 0

:cleanup
if exist "%ZG_R14_STAGE%\preflight.json" del /q "%ZG_R14_STAGE%\preflight.json" >nul 2>nul
if exist "%ZG_R14_STAGE%\publish.json" del /q "%ZG_R14_STAGE%\publish.json" >nul 2>nul
if exist "%ZG_R14_STAGE%\scripts\iran-progress\news-display-publish-incremental-r14.mjs" del /q "%ZG_R14_STAGE%\scripts\iran-progress\news-display-publish-incremental-r14.mjs" >nul 2>nul
if exist "%ZG_R14_STAGE%\scripts\iran-progress\news-display-incremental-preflight-r13.mjs" del /q "%ZG_R14_STAGE%\scripts\iran-progress\news-display-incremental-preflight-r13.mjs" >nul 2>nul
if exist "%ZG_R14_STAGE%\scripts\iran-progress\news-display-safe-preview-r12.mjs" del /q "%ZG_R14_STAGE%\scripts\iran-progress\news-display-safe-preview-r12.mjs" >nul 2>nul
if exist "%ZG_R14_STAGE%\scripts\iran-progress\news-display-model-shadow-r10.mjs" del /q "%ZG_R14_STAGE%\scripts\iran-progress\news-display-model-shadow-r10.mjs" >nul 2>nul
if exist "%ZG_R14_STAGE%\scripts\iran-progress\news-display-discover-r1.mjs" del /q "%ZG_R14_STAGE%\scripts\iran-progress\news-display-discover-r1.mjs" >nul 2>nul
if exist "%ZG_R14_STAGE%\scripts\iran-progress\news-display-maintenance-r1.mjs" del /q "%ZG_R14_STAGE%\scripts\iran-progress\news-display-maintenance-r1.mjs" >nul 2>nul
if exist "%ZG_R14_STAGE%\scripts\iran-progress\news-display-publication-r1.mjs" del /q "%ZG_R14_STAGE%\scripts\iran-progress\news-display-publication-r1.mjs" >nul 2>nul
if exist "%ZG_R14_STAGE%\scripts\iran-progress\news-display-io-r1.mjs" del /q "%ZG_R14_STAGE%\scripts\iran-progress\news-display-io-r1.mjs" >nul 2>nul
if exist "%ZG_R14_STAGE%\scripts\iran-progress\news-display-r1.mjs" del /q "%ZG_R14_STAGE%\scripts\iran-progress\news-display-r1.mjs" >nul 2>nul
if exist "%ZG_R14_STAGE%\scripts\iran-progress\sources.mjs" del /q "%ZG_R14_STAGE%\scripts\iran-progress\sources.mjs" >nul 2>nul
if exist "%ZG_R14_STAGE%\scripts\pc-writer\d1.mjs" del /q "%ZG_R14_STAGE%\scripts\pc-writer\d1.mjs" >nul 2>nul
if exist "%ZG_R14_STAGE%\scripts\pc-writer\d1-transient.mjs" del /q "%ZG_R14_STAGE%\scripts\pc-writer\d1-transient.mjs" >nul 2>nul
if exist "%ZG_R14_STAGE%\scripts\pc-writer\d1-diagnostics.mjs" del /q "%ZG_R14_STAGE%\scripts\pc-writer\d1-diagnostics.mjs" >nul 2>nul
if exist "%ZG_R14_STAGE%\lib\iran-progress\news-display-r1.mjs" del /q "%ZG_R14_STAGE%\lib\iran-progress\news-display-r1.mjs" >nul 2>nul
if exist "%ZG_R14_STAGE%\scripts\iran-progress" rmdir "%ZG_R14_STAGE%\scripts\iran-progress" >nul 2>nul
if exist "%ZG_R14_STAGE%\scripts\pc-writer" rmdir "%ZG_R14_STAGE%\scripts\pc-writer" >nul 2>nul
if exist "%ZG_R14_STAGE%\scripts" rmdir "%ZG_R14_STAGE%\scripts" >nul 2>nul
if exist "%ZG_R14_STAGE%\lib\iran-progress" rmdir "%ZG_R14_STAGE%\lib\iran-progress" >nul 2>nul
if exist "%ZG_R14_STAGE%\lib" rmdir "%ZG_R14_STAGE%\lib" >nul 2>nul
if exist "%ZG_R14_STAGE%" rmdir "%ZG_R14_STAGE%" >nul 2>nul
exit /b 0

:uncertain
if "%ZG_R14_OWN_STAGE%"=="1" call :cleanup
>> "%ZG_R14_LOG%" echo FINAL_STATUS=STOP_R14_PUBLISH_OUTCOME_REQUIRES_REVIEW
>> "%ZG_R14_LOG%" echo WARNING: PC cache or D1 news key may have changed. DO NOT BLINDLY RERUN.
echo R14 write outcome requires review. DO NOT RERUN. Upload IRAN_NEWS_R14_PUBLISH_ONCE_RESULT.txt.
exit /b 2

:failed
if "%ZG_R14_OWN_STAGE%"=="1" call :cleanup
:failed_no_cleanup
>> "%ZG_R14_LOG%" echo FINAL_STATUS=STOP_R14_NO_PUBLISH_ATTEMPTED
echo R14 stopped before publication. Upload IRAN_NEWS_R14_PUBLISH_ONCE_RESULT.txt.
exit /b 1
