@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem R15: install a GUARDED news-only hook into the existing 6-hour R13 task.
rem The task and VBS remain untouched. R3/R5 score and SQLite are preserved.
set "ZG_R15_LOG=%~dp0IRAN_NEWS_R15_AUTO_INSTALL_RESULT.txt"
set "ZG_R15_STAGE=%~dp0IRAN_NEWS_R15_INSTALL_RUNTIME"
set "ZG_R15_RAW=https://raw.githubusercontent.com/ansqhd5774-Choi/zgmini/35cf3c3bd0cac2a740fadcc6f9fb636270c41a0a"
set "ZG_R15_OWN_STAGE=0"
> "%ZG_R15_LOG%" echo ZGMINI IRAN NEWS R15 - EXISTING R13 TASK AUTO NEWS INSTALL
>> "%ZG_R15_LOG%" echo Pinned source SHA: 35cf3c3bd0cac2a740fadcc6f9fb636270c41a0a
>> "%ZG_R15_LOG%" echo R14 published 10 items with verified D1 readback.
>> "%ZG_R15_LOG%" echo No new task, VBS edit, frequency change, score calculation or ledger mutation.
>> "%ZG_R15_LOG%" echo Existing PC runner R7 hash and source HEAD must match exactly.
if exist "%ZG_R15_STAGE%" (
 >> "%ZG_R15_LOG%" echo STOP: R15 staging directory already exists. No overwrite.
 goto :failed_no_cleanup
)
where node >nul 2>nul
if errorlevel 1 goto :failed
where curl >nul 2>nul
if errorlevel 1 goto :failed
mkdir "%ZG_R15_STAGE%\scripts\iran-progress" >nul 2>&1
if errorlevel 1 goto :failed
set "ZG_R15_OWN_STAGE=1"
mkdir "%ZG_R15_STAGE%\lib\iran-progress" >nul 2>&1
if errorlevel 1 goto :failed
call :download "scripts/iran-progress/news-display-install-auto-r15.mjs" "scripts\iran-progress\news-display-install-auto-r15.mjs"
if errorlevel 1 goto :failed
call :download "scripts/iran-progress/news-display-chain-audit-r6.mjs" "scripts\iran-progress\news-display-chain-audit-r6.mjs"
if errorlevel 1 goto :failed
call :download "scripts/iran-progress/run-reference-flow-r3.mjs" "scripts\iran-progress\run-reference-flow-r3.mjs"
if errorlevel 1 goto :failed
call :download "scripts/iran-progress/sources.mjs" "scripts\iran-progress\sources.mjs"
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
call :download "scripts/iran-progress/news-display-discover-r1.mjs" "scripts\iran-progress\news-display-discover-r1.mjs"
if errorlevel 1 goto :failed
call :download "scripts/iran-progress/news-display-model-shadow-r10.mjs" "scripts\iran-progress\news-display-model-shadow-r10.mjs"
if errorlevel 1 goto :failed
call :download "scripts/iran-progress/news-display-safe-preview-r12.mjs" "scripts\iran-progress\news-display-safe-preview-r12.mjs"
if errorlevel 1 goto :failed
call :download "scripts/iran-progress/news-display-incremental-preflight-r13.mjs" "scripts\iran-progress\news-display-incremental-preflight-r13.mjs"
if errorlevel 1 goto :failed
call :download "scripts/iran-progress/news-display-publish-incremental-r14.mjs" "scripts\iran-progress\news-display-publish-incremental-r14.mjs"
if errorlevel 1 goto :failed
call :download "scripts/iran-progress/news-display-auto-run-r15.mjs" "scripts\iran-progress\news-display-auto-run-r15.mjs"
if errorlevel 1 goto :failed
>> "%ZG_R15_LOG%" echo [1] R13 task XML, VBS, R7 runner and existing PC source SHA - READ ONLY
node "%ZG_R15_STAGE%\scripts\iran-progress\news-display-install-auto-r15.mjs" --preflight --stage="%ZG_R15_STAGE%" > "%ZG_R15_STAGE%\preflight.json" 2>> "%ZG_R15_LOG%"
if errorlevel 1 goto :failed
type "%ZG_R15_STAGE%\preflight.json" >> "%ZG_R15_LOG%"
node -e "const x=JSON.parse(require('node:fs').readFileSync(process.argv[1],'utf8'));if(x.status!=='PASS_R15_AUTO_HOOK_PREFLIGHT_READ_ONLY'||x.readOnly!==true||x.existingModulesVerified!==6||x.newModules!==6||x.schedulerModified!==false||x.scoreLedgerModified!==false)throw Error('R15_EXISTING_TASK_GATE_FAILED');console.log('R15_PREFLIGHT_GATE=PASS');" "%ZG_R15_STAGE%\preflight.json" >> "%ZG_R15_LOG%" 2>&1
if errorlevel 1 goto :failed
>> "%ZG_R15_LOG%" echo [2] Copy six isolated news modules and append news hook to verified runner
set "ZGMINI_IRAN_NEWS_R15_APPROVED=YES"
node "%ZG_R15_STAGE%\scripts\iran-progress\news-display-install-auto-r15.mjs" --install --stage="%ZG_R15_STAGE%" > "%ZG_R15_STAGE%\installed.json" 2>> "%ZG_R15_LOG%"
set "ZG_R15_EXIT=%ERRORLEVEL%"
set "ZGMINI_IRAN_NEWS_R15_APPROVED="
if not "%ZG_R15_EXIT%"=="0" goto :uncertain
type "%ZG_R15_STAGE%\installed.json" >> "%ZG_R15_LOG%"
node -e "const x=JSON.parse(require('node:fs').readFileSync(process.argv[1],'utf8'));if(x.status!=='PASS_R15_NEWS_AUTO_HOOK_INSTALLED'||x.runnerBackupVerified!==true||x.localModuleCheck!=='PASS'||x.schedulerModified!==false||x.launcherModified!==false||x.scoreLedgerModified!==false||x.d1Written!==false)throw Error('R15_HOOK_READBACK_FAILED');console.log('R15_HOOK_READBACK_GATE=PASS');" "%ZG_R15_STAGE%\installed.json" >> "%ZG_R15_LOG%" 2>&1
if errorlevel 1 goto :uncertain
call :cleanup
>> "%ZG_R15_LOG%" echo NEXT_GATE=WAIT_NEXT_NORMAL_R13_SCHEDULE_AND_NEWS_STATUS_READBACK
>> "%ZG_R15_LOG%" echo FINAL_STATUS=PASS_R15_AUTO_NEWS_HOOK_INSTALLED
echo R15 existing task news hook installed. Upload IRAN_NEWS_R15_AUTO_INSTALL_RESULT.txt.
exit /b 0

:download
curl --fail --location --silent --show-error --max-time 30 "%ZG_R15_RAW%/%~1" --output "%ZG_R15_STAGE%\%~2" >> "%ZG_R15_LOG%" 2>&1
if errorlevel 1 (
 >> "%ZG_R15_LOG%" echo ERROR: Download failed: %~1
 exit /b 1
)
exit /b 0

:cleanup
if exist "%ZG_R15_STAGE%\preflight.json" del /q "%ZG_R15_STAGE%\preflight.json" >nul 2>nul
if exist "%ZG_R15_STAGE%\installed.json" del /q "%ZG_R15_STAGE%\installed.json" >nul 2>nul
for %%F in (
 "news-display-install-auto-r15.mjs"
 "news-display-chain-audit-r6.mjs"
 "run-reference-flow-r3.mjs"
 "sources.mjs"
 "news-display-maintenance-r1.mjs"
 "news-display-io-r1.mjs"
 "news-display-r1.mjs"
 "news-display-publication-r1.mjs"
 "news-display-discover-r1.mjs"
 "news-display-model-shadow-r10.mjs"
 "news-display-safe-preview-r12.mjs"
 "news-display-incremental-preflight-r13.mjs"
 "news-display-publish-incremental-r14.mjs"
 "news-display-auto-run-r15.mjs"
) do if exist "%ZG_R15_STAGE%\scripts\iran-progress\%%~F" del /q "%ZG_R15_STAGE%\scripts\iran-progress\%%~F" >nul 2>nul
if exist "%ZG_R15_STAGE%\lib\iran-progress\news-display-r1.mjs" del /q "%ZG_R15_STAGE%\lib\iran-progress\news-display-r1.mjs" >nul 2>nul
if exist "%ZG_R15_STAGE%\scripts\iran-progress" rmdir "%ZG_R15_STAGE%\scripts\iran-progress" >nul 2>nul
if exist "%ZG_R15_STAGE%\scripts" rmdir "%ZG_R15_STAGE%\scripts" >nul 2>nul
if exist "%ZG_R15_STAGE%\lib\iran-progress" rmdir "%ZG_R15_STAGE%\lib\iran-progress" >nul 2>nul
if exist "%ZG_R15_STAGE%\lib" rmdir "%ZG_R15_STAGE%\lib" >nul 2>nul
if exist "%ZG_R15_STAGE%" rmdir "%ZG_R15_STAGE%" >nul 2>nul
exit /b 0

:uncertain
>> "%ZG_R15_LOG%" echo FINAL_STATUS=STOP_R15_RUNNER_OUTCOME_REQUIRES_REVIEW
>> "%ZG_R15_LOG%" echo Existing runner, recovery backup and downloaded stage preserved for diagnosis.
>> "%ZG_R15_LOG%" echo DO NOT RERUN R15 INSTALL.
echo R15 hook outcome uncertain. DO NOT RERUN. Upload IRAN_NEWS_R15_AUTO_INSTALL_RESULT.txt.
exit /b 2

:failed
if "%ZG_R15_OWN_STAGE%"=="1" call :cleanup
:failed_no_cleanup
>> "%ZG_R15_LOG%" echo FINAL_STATUS=STOP_R15_NO_RUNNER_WRITE_ATTEMPTED
echo R15 stopped before runner write. Upload IRAN_NEWS_R15_AUTO_INSTALL_RESULT.txt.
exit /b 1
