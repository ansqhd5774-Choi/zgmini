@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem R7: ONE guarded install of local display-news 30-day retention into the existing R13 Node runner.
rem Existing R13 scheduled task, VBS launcher, R3/R5 formulas, SQLite ledger and D1 are never edited.
rem Only new display-news modules and the verified existing Node runner may change; the old runner is backed up.
set "ZG_R7_LOG=%~dp0IRAN_NEWS_R7_INSTALL_RESULT.txt"
set "ZG_R7_STAGE=%~dp0IRAN_NEWS_R7_RUNTIME"
set "ZG_R7_RAW=https://raw.githubusercontent.com/ansqhd5774-Choi/zgmini/4b7667c13f84b362b5144037b7fd5d94de7044a2"
set "ZG_R7_PREFLIGHT=%ZG_R7_STAGE%\preflight.json"
set "ZG_R7_APPLY=%ZG_R7_STAGE%\applied.json"
set "ZG_R7_PHASE=SETUP"
> "%ZG_R7_LOG%" echo ZGMINI IRAN NEWS R7 - GUARDED LOCAL 30-DAY CACHE RETENTION INSTALL
>> "%ZG_R7_LOG%" echo Source GitHub commit: 4b7667c13f84b362b5144037b7fd5d94de7044a2
>> "%ZG_R7_LOG%" echo Scope: existing R13 Node runner plus isolated display-news code only.
>> "%ZG_R7_LOG%" echo No task, VBS, SQLite score ledger, D1, or additional source changes.
>> "%ZG_R7_LOG%" echo A verified copy of the original PC runner will be retained for recovery.
if exist "%ZG_R7_STAGE%" (
 >> "%ZG_R7_LOG%" echo STOP: R7 staging directory is already occupied. Preserved for review.
 goto :failed
)
where node >nul 2>nul
if errorlevel 1 goto :failed
where curl >nul 2>nul
if errorlevel 1 goto :failed
mkdir "%ZG_R7_STAGE%\scripts\iran-progress" >nul 2>&1
if errorlevel 1 goto :failed
mkdir "%ZG_R7_STAGE%\lib\iran-progress" >nul 2>&1
if errorlevel 1 goto :failed

set "ZG_R7_PHASE=DOWNLOAD"
>> "%ZG_R7_LOG%" echo [1] Download immutable, rights-gated display code
call :download "scripts/iran-progress/news-display-install-hook-r7.mjs" "scripts\iran-progress\news-display-install-hook-r7.mjs"
if errorlevel 1 goto :failed
call :download "scripts/iran-progress/news-display-chain-audit-r6.mjs" "scripts\iran-progress\news-display-chain-audit-r6.mjs"
if errorlevel 1 goto :failed
call :download "scripts/iran-progress/run-reference-flow-r3.mjs" "scripts\iran-progress\run-reference-flow-r3.mjs"
if errorlevel 1 goto :failed
call :download "scripts/iran-progress/news-display-maintenance-r1.mjs" "scripts\iran-progress\news-display-maintenance-r1.mjs"
if errorlevel 1 goto :failed
call :download "scripts/iran-progress/news-display-io-r1.mjs" "scripts\iran-progress\news-display-io-r1.mjs"
if errorlevel 1 goto :failed
call :download "scripts/iran-progress/news-display-r1.mjs" "scripts\iran-progress\news-display-r1.mjs"
if errorlevel 1 goto :failed
call :download "scripts/iran-progress/news-display-publication-r1.mjs" "scripts\iran-progress\news-display-publication-r1.mjs"
if errorlevel 1 goto :failed
call :download "lib/iran-progress/news-display-r1.mjs" "lib\iran-progress\news-display-r1.mjs"
if errorlevel 1 goto :failed

set "ZG_R7_PHASE=READ_ONLY_PREFLIGHT"
>> "%ZG_R7_LOG%" echo [2] Verify actual task, VBS, runner SHA, PC source HEAD and staged patch
node "%ZG_R7_STAGE%\scripts\iran-progress\news-display-install-hook-r7.mjs" --preflight "--stage=%ZG_R7_STAGE%" > "%ZG_R7_PREFLIGHT%" 2>> "%ZG_R7_LOG%"
if errorlevel 1 goto :failed
type "%ZG_R7_PREFLIGHT%" >> "%ZG_R7_LOG%"
node -e "const r=JSON.parse(require('node:fs').readFileSync(process.argv[1],'utf8'));if(r.status!=='PASS_R7_NEWS_ONLY_PREFLIGHT'||r.readOnly!==true||r.scoreFlowPreserved!==true||r.launcherVerified!==true||r.task!=='ZGMINI-PC-Iran-Progress-R13'||r.scheduleHours.join(',')!=='0,6,12,18')throw Error('R7_PREFLIGHT_GATE_FAILED');console.log('READ_ONLY_PREFLIGHT_GATE=PASS')" "%ZG_R7_PREFLIGHT%" >> "%ZG_R7_LOG%" 2>&1
if errorlevel 1 goto :failed

set "ZG_R7_PHASE=APPLY_ATTEMPTED"
>> "%ZG_R7_LOG%" echo [3] ONE approved PC runner hook install; do not rerun after an uncertain outcome
set "ZGMINI_IRAN_NEWS_R7_APPROVED=YES"
node "%ZG_R7_STAGE%\scripts\iran-progress\news-display-install-hook-r7.mjs" --apply "--stage=%ZG_R7_STAGE%" > "%ZG_R7_APPLY%" 2>> "%ZG_R7_LOG%"
set "ZG_R7_EXIT=%ERRORLEVEL%"
set "ZGMINI_IRAN_NEWS_R7_APPROVED="
if not "%ZG_R7_EXIT%"=="0" goto :uncertain
type "%ZG_R7_APPLY%" >> "%ZG_R7_LOG%"
node -e "const r=JSON.parse(require('node:fs').readFileSync(process.argv[1],'utf8'));if(r.status!=='PASS_R7_NEWS_ONLY_HOOK_INSTALLED'||r.readOnly!==false||r.maintenanceDryRun!=='PASS'||r.runnerBackupVerified!==true||r.schedulerModified!==false||r.launcherModified!==false||r.scoreLedgerModified!==false||r.d1Written!==false)throw Error('R7_READBACK_GATE_FAILED');console.log('R7_INSTALL_READBACK_GATE=PASS')" "%ZG_R7_APPLY%" >> "%ZG_R7_LOG%" 2>&1
if errorlevel 1 goto :uncertain
>> "%ZG_R7_LOG%" echo NEXT_GATE=VERIFY_NEXT_NORMAL_R13_SCHEDULED_RUN
>> "%ZG_R7_LOG%" echo FINAL_STATUS=PASS_R7_NEWS_RETENTION_HOOK_INSTALLED
echo R7 PC hook installed. Upload IRAN_NEWS_R7_INSTALL_RESULT.txt.
exit /b 0

:download
curl --fail --location --silent --show-error --max-time 30 "%ZG_R7_RAW%/%~1" --output "%ZG_R7_STAGE%\%~2" >> "%ZG_R7_LOG%" 2>&1
if errorlevel 1 (
 >> "%ZG_R7_LOG%" echo ERROR: source download stopped: %~1
 exit /b 1
)
exit /b 0

:uncertain
>> "%ZG_R7_LOG%" echo FAILED_STAGE=%ZG_R7_PHASE%
>> "%ZG_R7_LOG%" echo FINAL_STATUS=STOP_R7_INSTALL_OUTCOME_REQUIRES_REVIEW
>> "%ZG_R7_LOG%" echo WARNING: Original runner backup and code may be present. DO NOT RERUN.
echo Install needs review. Do not rerun. Upload IRAN_NEWS_R7_INSTALL_RESULT.txt.
exit /b 2

:failed
>> "%ZG_R7_LOG%" echo FAILED_STAGE=%ZG_R7_PHASE%
>> "%ZG_R7_LOG%" echo FINAL_STATUS=STOP_R7_NO_RUNNER_WRITE_ATTEMPTED
>> "%ZG_R7_LOG%" echo Existing live runner not modified by this attempt.
echo Preflight stopped. Upload IRAN_NEWS_R7_INSTALL_RESULT.txt.
exit /b 1
