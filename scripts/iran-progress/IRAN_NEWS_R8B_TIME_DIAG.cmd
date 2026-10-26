@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem R8B read-only: reveal only the localized R13 last-run timestamp and cache timestamps.
rem Do not run any scheduled job. No score, cache, scheduler, VBS or D1 writes.
set "ZG_R8B_LOG=%~dp0IRAN_NEWS_R8B_TIME_DIAG_RESULT.txt"
set "ZG_R8B_STAGE=%~dp0IRAN_NEWS_R8B_RUNTIME"
set "ZG_R8B_RAW=https://raw.githubusercontent.com/ansqhd5774-Choi/zgmini/19cccabad553579fb2e7591c123dd197d71555cb"
set "ZG_R8B_OWN_STAGE=0"
> "%ZG_R8B_LOG%" echo ZGMINI IRAN NEWS R8B - READ-ONLY TASK TIME FORMAT DIAGNOSIS
>> "%ZG_R8B_LOG%" echo Source SHA: 19cccabad553579fb2e7591c123dd197d71555cb
>> "%ZG_R8B_LOG%" echo Only scheduler time, result, cache timestamp and installed runner timestamp.
if exist "%ZG_R8B_STAGE%" (
 >> "%ZG_R8B_LOG%" echo STOP: R8B helper directory already exists. Existing data preserved.
 goto :failed_no_cleanup
)
where node >nul 2>nul
if errorlevel 1 goto :failed
where curl >nul 2>nul
if errorlevel 1 goto :failed
mkdir "%ZG_R8B_STAGE%\scripts\iran-progress" >nul 2>&1
if errorlevel 1 goto :failed
set "ZG_R8B_OWN_STAGE=1"
call :download "scripts/iran-progress/news-display-time-probe-r8b.mjs" "scripts\iran-progress\news-display-time-probe-r8b.mjs"
if errorlevel 1 goto :failed
call :download "scripts/iran-progress/news-display-scheduled-verify-r8.mjs" "scripts\iran-progress\news-display-scheduled-verify-r8.mjs"
if errorlevel 1 goto :failed
call :download "scripts/iran-progress/news-display-chain-audit-r6.mjs" "scripts\iran-progress\news-display-chain-audit-r6.mjs"
if errorlevel 1 goto :failed
>> "%ZG_R8B_LOG%" echo [1] Localized last-run field inspection only
node "%ZG_R8B_STAGE%\scripts\iran-progress\news-display-time-probe-r8b.mjs" --read-only >> "%ZG_R8B_LOG%" 2>&1
if errorlevel 1 goto :failed
call :cleanup
>> "%ZG_R8B_LOG%" echo FINAL_STATUS=PASS_R8B_TASK_TIME_READ_ONLY
echo Read-only time diagnosis finished. Upload IRAN_NEWS_R8B_TIME_DIAG_RESULT.txt.
exit /b 0

:download
curl --fail --location --silent --show-error --max-time 30 "%ZG_R8B_RAW%/%~1" --output "%ZG_R8B_STAGE%\%~2" >> "%ZG_R8B_LOG%" 2>&1
if errorlevel 1 (
 >> "%ZG_R8B_LOG%" echo ERROR: helper download stopped: %~1
 exit /b 1
)
exit /b 0

:cleanup
if exist "%ZG_R8B_STAGE%\scripts\iran-progress\news-display-time-probe-r8b.mjs" del /q "%ZG_R8B_STAGE%\scripts\iran-progress\news-display-time-probe-r8b.mjs" >nul 2>nul
if exist "%ZG_R8B_STAGE%\scripts\iran-progress\news-display-scheduled-verify-r8.mjs" del /q "%ZG_R8B_STAGE%\scripts\iran-progress\news-display-scheduled-verify-r8.mjs" >nul 2>nul
if exist "%ZG_R8B_STAGE%\scripts\iran-progress\news-display-chain-audit-r6.mjs" del /q "%ZG_R8B_STAGE%\scripts\iran-progress\news-display-chain-audit-r6.mjs" >nul 2>nul
if exist "%ZG_R8B_STAGE%\scripts\iran-progress" rmdir "%ZG_R8B_STAGE%\scripts\iran-progress" >nul 2>nul
if exist "%ZG_R8B_STAGE%\scripts" rmdir "%ZG_R8B_STAGE%\scripts" >nul 2>nul
if exist "%ZG_R8B_STAGE%" rmdir "%ZG_R8B_STAGE%" >nul 2>nul
exit /b 0

:failed
if "%ZG_R8B_OWN_STAGE%"=="1" call :cleanup
:failed_no_cleanup
>> "%ZG_R8B_LOG%" echo FINAL_STATUS=STOP_R8B_TASK_TIME_READ_ONLY
echo Time format diagnosis stopped. Upload IRAN_NEWS_R8B_TIME_DIAG_RESULT.txt.
exit /b 1
