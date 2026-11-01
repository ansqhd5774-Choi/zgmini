@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem R4B: publish only ONE previously reviewed GOV.UK item to its isolated D1 news key.
rem Verify the actual R3 PC cache, not the location of an optional historical TXT log.
rem No score/ledger, scheduler, PC cache, or existing news-feed changes.
set "ZG_IRAN_LOG=%~dp0IRAN_NEWS_R4B_D1_PUBLISH_RESULT.txt"
set "ZG_IRAN_RUNTIME=%~dp0IRAN_NEWS_R4B_RUNTIME"
set "ZG_IRAN_RAW=https://raw.githubusercontent.com/ansqhd5774-Choi/zgmini/bc7843da59bd5d232e9462c7a49a211e9d9dc83b"
set "ZG_IRAN_PREFLIGHT=%ZG_IRAN_RUNTIME%\d1-preflight.json"
set "ZG_IRAN_PUBLISHED=%ZG_IRAN_RUNTIME%\d1-published.json"
set "ZG_IRAN_STAGE=INITIAL"
> "%ZG_IRAN_LOG%" echo ZGMINI IRAN NEWS R4B - FIRST D1 NEWS-ONLY PUBLISH
>> "%ZG_IRAN_LOG%" echo Source commit: bc7843da59bd5d232e9462c7a49a211e9d9dc83b
>> "%ZG_IRAN_LOG%" echo Intended write: one row, public:iran-progress:news:iran:r1
>> "%ZG_IRAN_LOG%" echo No R3/R5 SQLite writes, no PC news cache writes, no scheduler changes.
>> "%ZG_IRAN_LOG%" echo.
>> "%ZG_IRAN_LOG%" echo [0] Optional previous R3 log: its folder does NOT determine cache validity
if exist "%~dp0IRAN_NEWS_R3_APPLY_RESULT.txt" (
 >> "%ZG_IRAN_LOG%" echo R3_LOG=FOUND_OPTIONAL
) else (
 >> "%ZG_IRAN_LOG%" echo R3_LOG=NOT_IN_THIS_FOLDER_OPTIONAL
)
>> "%ZG_IRAN_LOG%" echo R3_LIVE_CACHE_WILL_BE_VERIFIED_BY_PREFLIGHT=YES
set "ZG_IRAN_STAGE=DEPENDENCIES"
where node >nul 2>nul
if errorlevel 1 goto :failed
where curl >nul 2>nul
if errorlevel 1 goto :failed
if not exist "%ZG_IRAN_RUNTIME%\scripts\iran-progress" mkdir "%ZG_IRAN_RUNTIME%\scripts\iran-progress"
if errorlevel 1 goto :failed
if not exist "%ZG_IRAN_RUNTIME%\scripts\pc-writer" mkdir "%ZG_IRAN_RUNTIME%\scripts\pc-writer"
if errorlevel 1 goto :failed
if not exist "%ZG_IRAN_RUNTIME%\lib\iran-progress" mkdir "%ZG_IRAN_RUNTIME%\lib\iran-progress"
if errorlevel 1 goto :failed
set "ZG_IRAN_STAGE=DOWNLOAD"
call :download "scripts/iran-progress/news-display-publish-once-r4.mjs" "scripts\iran-progress\news-display-publish-once-r4.mjs"
if errorlevel 1 goto :failed
call :download "scripts/iran-progress/news-display-io-r1.mjs" "scripts\iran-progress\news-display-io-r1.mjs"
if errorlevel 1 goto :failed
call :download "scripts/iran-progress/news-display-r1.mjs" "scripts\iran-progress\news-display-r1.mjs"
if errorlevel 1 goto :failed
call :download "scripts/iran-progress/news-display-publication-r1.mjs" "scripts\iran-progress\news-display-publication-r1.mjs"
if errorlevel 1 goto :failed
call :download "lib/iran-progress/news-display-r1.mjs" "lib\iran-progress\news-display-r1.mjs"
if errorlevel 1 goto :failed
call :download "scripts/pc-writer/d1.mjs" "scripts\pc-writer\d1.mjs"
if errorlevel 1 goto :failed
call :download "scripts/pc-writer/d1-transient.mjs" "scripts\pc-writer\d1-transient.mjs"
if errorlevel 1 goto :failed
call :download "scripts/pc-writer/d1-diagnostics.mjs" "scripts\pc-writer\d1-diagnostics.mjs"
if errorlevel 1 goto :failed
set "ZG_IRAN_STAGE=D1_PREFLIGHT"
>> "%ZG_IRAN_LOG%" echo.
>> "%ZG_IRAN_LOG%" echo [1] Actual R3 PC cache, exact reviewed article, credential and remote key - READ ONLY
node "%ZG_IRAN_RUNTIME%\scripts\iran-progress\news-display-publish-once-r4.mjs" --preflight > "%ZG_IRAN_PREFLIGHT%" 2>> "%ZG_IRAN_LOG%"
if errorlevel 1 goto :failed
type "%ZG_IRAN_PREFLIGHT%" >> "%ZG_IRAN_LOG%"
node -e "const r=JSON.parse(require('node:fs').readFileSync(process.argv[1],'utf8'));if(r.status!=='PASS_NEWS_R4_D1_READ_ONLY_GATE'||r.remoteKey!=='ABSENT'||r.itemCount!==1||r.source!=='GOV.UK')throw Error('NEWS_R4_REMOTE_GATE_FAILED');console.log('D1_PREFLIGHT_GATE=PASS');" "%ZG_IRAN_PREFLIGHT%" >> "%ZG_IRAN_LOG%" 2>&1
if errorlevel 1 goto :failed
set "ZG_IRAN_STAGE=D1_PUBLISH_ATTEMPT"
>> "%ZG_IRAN_LOG%" echo.
>> "%ZG_IRAN_LOG%" echo [2] APPLY first news-only D1 key. DO NOT REPEAT if outcome is uncertain.
set "ZG_IRAN_NEWS_R4_APPROVED=YES"
node "%ZG_IRAN_RUNTIME%\scripts\iran-progress\news-display-publish-once-r4.mjs" --publish > "%ZG_IRAN_PUBLISHED%" 2>> "%ZG_IRAN_LOG%"
set "ZG_IRAN_PUBLISH_EXIT=%ERRORLEVEL%"
set "ZG_IRAN_NEWS_R4_APPROVED="
if not "%ZG_IRAN_PUBLISH_EXIT%"=="0" goto :uncertain
type "%ZG_IRAN_PUBLISHED%" >> "%ZG_IRAN_LOG%"
node -e "const r=JSON.parse(require('node:fs').readFileSync(process.argv[1],'utf8'));if(r.status!=='PASS_D1_NEWS_ONLY_PUBLISHED'||r.publication!=='VERIFIED'||r.itemCount!==1||r.scoreLedgerChanged!==false)throw Error('NEWS_R4_D1_READBACK_GATE_FAILED');console.log('D1_PUBLISH_READBACK=PASS');" "%ZG_IRAN_PUBLISHED%" >> "%ZG_IRAN_LOG%" 2>&1
if errorlevel 1 goto :uncertain
call :cleanup
>> "%ZG_IRAN_LOG%" echo FINAL_STATUS=PASS_D1_NEWS_ONLY_PUBLISHED
echo News-only D1 key published and read back. Upload IRAN_NEWS_R4B_D1_PUBLISH_RESULT.txt.
exit /b 0
:download
curl --fail --location --silent --show-error --max-time 30 "%ZG_IRAN_RAW%/%~1" --output "%ZG_IRAN_RUNTIME%\%~2" >> "%ZG_IRAN_LOG%" 2>&1
if errorlevel 1 (
 >> "%ZG_IRAN_LOG%" echo ERROR: source download failed: %~1
 exit /b 1
)
exit /b 0
:cleanup
if exist "%ZG_IRAN_PREFLIGHT%" del /q "%ZG_IRAN_PREFLIGHT%" >nul 2>nul
if exist "%ZG_IRAN_PUBLISHED%" del /q "%ZG_IRAN_PUBLISHED%" >nul 2>nul
exit /b 0
:uncertain
call :cleanup
>> "%ZG_IRAN_LOG%" echo FAILED_STAGE=%ZG_IRAN_STAGE%
>> "%ZG_IRAN_LOG%" echo FINAL_STATUS=STOP_D1_OUTCOME_REQUIRES_REVIEW
>> "%ZG_IRAN_LOG%" echo WARNING: D1 write MAY have occurred. DO NOT RERUN.
echo D1 outcome needs review. DO NOT RERUN. Upload IRAN_NEWS_R4B_D1_PUBLISH_RESULT.txt.
exit /b 2
:failed
call :cleanup
>> "%ZG_IRAN_LOG%" echo FAILED_STAGE=%ZG_IRAN_STAGE%
>> "%ZG_IRAN_LOG%" echo FINAL_STATUS=STOP_NO_D1_WRITE_ATTEMPTED
echo No D1 write attempted. Upload IRAN_NEWS_R4B_D1_PUBLISH_RESULT.txt.
exit /b 1
