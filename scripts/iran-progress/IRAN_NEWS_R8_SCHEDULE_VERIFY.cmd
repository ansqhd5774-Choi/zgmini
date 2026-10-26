@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem R8: read-only proof of the first normal R13 cycle after R7 install.
rem Never starts R13, changes its schedule, touches cache/ledger, or writes to D1.
set "ZG_R8_LOG=%~dp0IRAN_NEWS_R8_SCHEDULE_VERIFY_RESULT.txt"
set "ZG_R8_STAGE=%~dp0IRAN_NEWS_R8_READONLY_RUNTIME"
set "ZG_R8_RAW=https://raw.githubusercontent.com/ansqhd5774-Choi/zgmini/b554d7bf52db0ad8d240dcc319371e8dbdcdb90b"
set "ZG_R8_REPORT=%ZG_R8_STAGE%\report.json"
set "ZG_R8_OWN_STAGE=0"
> "%ZG_R8_LOG%" echo ZGMINI IRAN NEWS R8 - NEXT NORMAL R13 SCHEDULE READ-ONLY CHECK
>> "%ZG_R8_LOG%" echo Source commit: b554d7bf52db0ad8d240dcc319371e8dbdcdb90b
>> "%ZG_R8_LOG%" echo Read only: task, launcher, runner, original backup, local news cache.
if exist "%ZG_R8_STAGE%" (
 >> "%ZG_R8_LOG%" echo STOP: R8 temporary helper location already exists. Preserved.
 goto :failed_no_cleanup
)
where node >nul 2>nul
if errorlevel 1 goto :failed
where curl >nul 2>nul
if errorlevel 1 goto :failed
mkdir "%ZG_R8_STAGE%\scripts\iran-progress" >nul 2>&1
if errorlevel 1 goto :failed
set "ZG_R8_OWN_STAGE=1"
call :download "scripts/iran-progress/news-display-scheduled-verify-r8.mjs" "scripts\iran-progress\news-display-scheduled-verify-r8.mjs"
if errorlevel 1 goto :failed
call :download "scripts/iran-progress/news-display-chain-audit-r6.mjs" "scripts\iran-progress\news-display-chain-audit-r6.mjs"
if errorlevel 1 goto :failed

>> "%ZG_R8_LOG%" echo [1] Actual Task Scheduler execution record and cache timestamp
node "%ZG_R8_STAGE%\scripts\iran-progress\news-display-scheduled-verify-r8.mjs" --read-only > "%ZG_R8_REPORT%" 2>> "%ZG_R8_LOG%"
if errorlevel 1 goto :failed
type "%ZG_R8_REPORT%" >> "%ZG_R8_LOG%"
node -e "const r=JSON.parse(require('node:fs').readFileSync(process.argv[1],'utf8'));if(r.readOnly!==true||r.runnerR7Verified!==true||r.originalRunnerBackupVerified!==true||r.launcherUnchanged!==true||r.scoreLedgerPresent!==true)throw Error('R8_IDENTITY_GATE_FAILED');if(r.status==='PASS_R8_NEXT_NORMAL_R13_NEWS_CACHE_REFRESH'&&r.cacheUpdatedAfterRunnerInstall===true&&r.taskRanAfterRunnerInstall===true&&r.taskLastResult===0){console.log('R8_GATE=PASS');process.exit(0)}if(r.status==='PENDING_R8_NEXT_NORMAL_SCHEDULE'){console.log('R8_GATE=PENDING_NEXT_SCHEDULE');process.exit(3)}console.log('R8_GATE=REVIEW_REQUIRED');process.exit(2)" "%ZG_R8_REPORT%" >> "%ZG_R8_LOG%" 2>&1
set "ZG_R8_GATE=%ERRORLEVEL%"
if "%ZG_R8_GATE%"=="0" goto :passed
if "%ZG_R8_GATE%"=="3" goto :pending
goto :review

:download
curl --fail --location --silent --show-error --max-time 30 "%ZG_R8_RAW%/%~1" --output "%ZG_R8_STAGE%\%~2" >> "%ZG_R8_LOG%" 2>&1
if errorlevel 1 (
 >> "%ZG_R8_LOG%" echo ERROR: helper download stopped: %~1
 exit /b 1
)
exit /b 0

:cleanup
if exist "%ZG_R8_REPORT%" del /q "%ZG_R8_REPORT%" >nul 2>nul
if exist "%ZG_R8_STAGE%\scripts\iran-progress\news-display-scheduled-verify-r8.mjs" del /q "%ZG_R8_STAGE%\scripts\iran-progress\news-display-scheduled-verify-r8.mjs" >nul 2>nul
if exist "%ZG_R8_STAGE%\scripts\iran-progress\news-display-chain-audit-r6.mjs" del /q "%ZG_R8_STAGE%\scripts\iran-progress\news-display-chain-audit-r6.mjs" >nul 2>nul
if exist "%ZG_R8_STAGE%\scripts\iran-progress" rmdir "%ZG_R8_STAGE%\scripts\iran-progress" >nul 2>nul
if exist "%ZG_R8_STAGE%\scripts" rmdir "%ZG_R8_STAGE%\scripts" >nul 2>nul
if exist "%ZG_R8_STAGE%" rmdir "%ZG_R8_STAGE%" >nul 2>nul
exit /b 0

:passed
call :cleanup
>> "%ZG_R8_LOG%" echo FINAL_STATUS=PASS_R8_NEXT_SCHEDULE_CACHE_REFRESH
echo R8 normal scheduled refresh verified. Upload IRAN_NEWS_R8_SCHEDULE_VERIFY_RESULT.txt.
exit /b 0

:pending
call :cleanup
>> "%ZG_R8_LOG%" echo FINAL_STATUS=PENDING_R8_NORMAL_SCHEDULE_NOT_YET_OBSERVED
echo Next R13 cycle not observed yet. Upload IRAN_NEWS_R8_SCHEDULE_VERIFY_RESULT.txt.
exit /b 0

:review
call :cleanup
>> "%ZG_R8_LOG%" echo FINAL_STATUS=NEEDS_REVIEW_R8_SCHEDULE_OR_CACHE
echo Read-only result needs review. Upload IRAN_NEWS_R8_SCHEDULE_VERIFY_RESULT.txt.
exit /b 2

:failed
if "%ZG_R8_OWN_STAGE%"=="1" call :cleanup
:failed_no_cleanup
>> "%ZG_R8_LOG%" echo FINAL_STATUS=STOP_R8_READ_ONLY_AUDIT
echo Read-only audit stopped. Upload IRAN_NEWS_R8_SCHEDULE_VERIFY_RESULT.txt.
exit /b 1
