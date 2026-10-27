@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem R16: read-only evidence of the first normal R13 job AFTER R15 install.
rem Never start a job, change its schedule, write D1, or touch the news/score cache.
set "ZG_R16_LOG=%~dp0IRAN_NEWS_R16_SCHEDULE_READONLY_RESULT.txt"
set "ZG_R16_STAGE=%~dp0IRAN_NEWS_R16_READONLY_RUNTIME"
set "ZG_R16_RAW=https://raw.githubusercontent.com/ansqhd5774-Choi/zgmini/70309354531ab3301db6017afe9568e0bffe5207"
set "ZG_R16_REPORT=%ZG_R16_STAGE%\report.json"
set "ZG_R16_OWN_STAGE=0"
> "%ZG_R16_LOG%" echo ZGMINI IRAN NEWS R16 - NORMAL R13 SCHEDULE NEWS D1 READ-ONLY AUDIT
>> "%ZG_R16_LOG%" echo Pinned source SHA: 70309354531ab3301db6017afe9568e0bffe5207
>> "%ZG_R16_LOG%" echo R15 PC install previously passed. This CMD runs no scheduled jobs.
>> "%ZG_R16_LOG%" echo Verify task schedule, VBS, R15 runner, R7 backups, news status, PC cache and D1 status recorded by R15.
if exist "%ZG_R16_STAGE%" (
 >> "%ZG_R16_LOG%" echo STOP: R16 helper directory already exists. No overwrite.
 goto :failed_no_cleanup
)
where node >nul 2>nul
if errorlevel 1 goto :failed
where curl >nul 2>nul
if errorlevel 1 goto :failed
mkdir "%ZG_R16_STAGE%\scripts\iran-progress" >nul 2>&1
if errorlevel 1 goto :failed
set "ZG_R16_OWN_STAGE=1"
call :download "scripts/iran-progress/news-display-scheduled-verify-r16.mjs" "scripts\iran-progress\news-display-scheduled-verify-r16.mjs"
if errorlevel 1 goto :failed
call :download "scripts/iran-progress/news-display-scheduled-verify-r8.mjs" "scripts\iran-progress\news-display-scheduled-verify-r8.mjs"
if errorlevel 1 goto :failed
call :download "scripts/iran-progress/news-display-chain-audit-r6.mjs" "scripts\iran-progress\news-display-chain-audit-r6.mjs"
if errorlevel 1 goto :failed
>> "%ZG_R16_LOG%" echo [1] Read the existing Task Scheduler record and R15 status only
node "%ZG_R16_STAGE%\scripts\iran-progress\news-display-scheduled-verify-r16.mjs" --read-only > "%ZG_R16_REPORT%" 2>> "%ZG_R16_LOG%"
if errorlevel 1 goto :failed
type "%ZG_R16_REPORT%" >> "%ZG_R16_LOG%"
node -e "const r=JSON.parse(require('node:fs').readFileSync(process.argv[1],'utf8'));if(r.readOnly!==true||r.r15RunnerVerified!==true||r.r7RecoveryBackupVerified!==true||r.originalRecoveryBackupVerified!==true||r.launcherUnchanged!==true||r.scoreLedgerPresent!==true||r.schedulerModified!==false||r.d1WrittenByAudit!==false)throw Error('R16_IDENTITY_OR_READ_ONLY_GATE_FAILED');if(r.status==='PASS_R16_NORMAL_R13_AUTO_NEWS_D1_VERIFIED'&&r.taskRanAfterInstall===true&&r.taskLastResult===0&&r.newsStatus==='PUBLISHED_D1_VERIFIED'&&['VERIFIED','UNCHANGED'].includes(r.newsD1Publication)){console.log('R16_GATE=PASS_NORMAL_SCHEDULE_NEWS_D1');process.exit(0)}if(r.status.startsWith('PENDING_R16_')){console.log('R16_GATE=PENDING_NEXT_NORMAL_SCHEDULE_OR_NEWS_COMPLETION');process.exit(3)}console.log('R16_GATE=REVIEW_REQUIRED');process.exit(2)" "%ZG_R16_REPORT%" >> "%ZG_R16_LOG%" 2>&1
set "ZG_R16_GATE=%ERRORLEVEL%"
if "%ZG_R16_GATE%"=="0" goto :passed
if "%ZG_R16_GATE%"=="3" goto :pending
goto :review

:download
curl --fail --location --silent --show-error --max-time 30 "%ZG_R16_RAW%/%~1" --output "%ZG_R16_STAGE%\%~2" >> "%ZG_R16_LOG%" 2>&1
if errorlevel 1 (
 >> "%ZG_R16_LOG%" echo ERROR: R16 read-only helper download failed: %~1
 exit /b 1
)
exit /b 0

:cleanup
if exist "%ZG_R16_REPORT%" del /q "%ZG_R16_REPORT%" >nul 2>nul
if exist "%ZG_R16_STAGE%\scripts\iran-progress\news-display-scheduled-verify-r16.mjs" del /q "%ZG_R16_STAGE%\scripts\iran-progress\news-display-scheduled-verify-r16.mjs" >nul 2>nul
if exist "%ZG_R16_STAGE%\scripts\iran-progress\news-display-scheduled-verify-r8.mjs" del /q "%ZG_R16_STAGE%\scripts\iran-progress\news-display-scheduled-verify-r8.mjs" >nul 2>nul
if exist "%ZG_R16_STAGE%\scripts\iran-progress\news-display-chain-audit-r6.mjs" del /q "%ZG_R16_STAGE%\scripts\iran-progress\news-display-chain-audit-r6.mjs" >nul 2>nul
if exist "%ZG_R16_STAGE%\scripts\iran-progress" rmdir "%ZG_R16_STAGE%\scripts\iran-progress" >nul 2>nul
if exist "%ZG_R16_STAGE%\scripts" rmdir "%ZG_R16_STAGE%\scripts" >nul 2>nul
if exist "%ZG_R16_STAGE%" rmdir "%ZG_R16_STAGE%" >nul 2>nul
exit /b 0

:passed
call :cleanup
>> "%ZG_R16_LOG%" echo FINAL_STATUS=PASS_R16_FIRST_NORMAL_R13_NEWS_D1_VERIFIED
echo R16 normal R13 news publication verified. Upload IRAN_NEWS_R16_SCHEDULE_READONLY_RESULT.txt.
exit /b 0

:pending
call :cleanup
>> "%ZG_R16_LOG%" echo FINAL_STATUS=PENDING_R16_WAIT_NEXT_NORMAL_SCHEDULE_OR_COMPLETION
echo R16 still waiting for normal R13 run or completion. Upload IRAN_NEWS_R16_SCHEDULE_READONLY_RESULT.txt.
exit /b 0

:review
call :cleanup
>> "%ZG_R16_LOG%" echo FINAL_STATUS=NEEDS_REVIEW_R16_NEWS_OR_SCHEDULE
echo R16 read-only status needs review. Upload IRAN_NEWS_R16_SCHEDULE_READONLY_RESULT.txt.
exit /b 2

:failed
if "%ZG_R16_OWN_STAGE%"=="1" call :cleanup
:failed_no_cleanup
>> "%ZG_R16_LOG%" echo FINAL_STATUS=STOP_R16_READ_ONLY_AUDIT
echo R16 audit stopped without touching the existing job. Upload IRAN_NEWS_R16_SCHEDULE_READONLY_RESULT.txt.
exit /b 1
