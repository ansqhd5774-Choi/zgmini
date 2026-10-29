@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem Run independently from Downloads after the R1 source extraction.
rem Reuse an existing Wrangler installation, or install the locked package only
rem inside the isolated R1 source. Existing approved checkouts are untouched.
set "ZG_LOG=%~dp0IRAN_NEWS_ANALYSIS_R1_REPAIR_RESULT.txt"
set "ZG_TARGET=E:\ZGmini\projects\iran-news-analysis-r1-56eec668"
>"%ZG_LOG%" echo ZGMINI IRAN NEWS ANALYSIS R1 - AUTH RUNTIME REPAIR
if errorlevel 1 goto log_unavailable
>>"%ZG_LOG%" echo Scope: Isolated R1 source only; existing tasks untouched
if not exist "%ZG_TARGET%\scripts\iran-progress\news-analysis-scheduled-r1.mjs" goto source_missing
if not exist "%ZG_TARGET%\scripts\iran-progress\news-analysis-schedule-r1.mjs" goto source_missing
if not exist "E:\ZGmini\data\iran-progress-r13\" goto data_missing
call "%ZG_TARGET%\scripts\resolve-local-node.cmd" >>"%ZG_LOG%" 2>&1
if errorlevel 1 goto node_missing
>>"%ZG_LOG%" echo Node: %NODE%

>>"%ZG_LOG%" echo [1] DISCOVER EXISTING OFFICIAL WRANGLER INSTALLATIONS
if exist "%ZG_TARGET%\node_modules\wrangler\bin\wrangler.js" goto auth_ready
if exist "%ZG_TARGET%\node_modules" goto invalid_target_modules
set "ZG_MODULES="
if exist "E:\ZGmini\projects\zgmini\node_modules\wrangler\bin\wrangler.js" set "ZG_MODULES=E:\ZGmini\projects\zgmini\node_modules"
if not defined ZG_MODULES if exist "E:\ZGmini\runtime\node_modules\wrangler\bin\wrangler.js" set "ZG_MODULES=E:\ZGmini\runtime\node_modules"
if not defined ZG_MODULES if exist "E:\ZGmini\node_modules\wrangler\bin\wrangler.js" set "ZG_MODULES=E:\ZGmini\node_modules"
if not defined ZG_MODULES if exist "%APPDATA%\npm\node_modules\wrangler\bin\wrangler.js" set "ZG_MODULES=%APPDATA%\npm\node_modules"
if not defined ZG_MODULES if exist "%ProgramFiles%\nodejs\node_modules\wrangler\bin\wrangler.js" set "ZG_MODULES=%ProgramFiles%\nodejs\node_modules"
if not defined ZG_MODULES if exist "%LOCALAPPDATA%\Programs\nodejs\node_modules\wrangler\bin\wrangler.js" set "ZG_MODULES=%LOCALAPPDATA%\Programs\nodejs\node_modules"
for /d %%P in ("E:\ZGmini\projects\*") do if not defined ZG_MODULES if exist "%%~fP\node_modules\wrangler\bin\wrangler.js" set "ZG_MODULES=%%~fP\node_modules"
for /d %%P in ("E:\ZGmini\projects\legacy\*") do if not defined ZG_MODULES if exist "%%~fP\node_modules\wrangler\bin\wrangler.js" set "ZG_MODULES=%%~fP\node_modules"
if defined ZG_MODULES goto link_existing

>>"%ZG_LOG%" echo [2] NO EXISTING WRANGLER FOUND - PRIVATE LOCKED PACKAGE INSTALL
>>"%ZG_LOG%" echo Package: wrangler@4.92.0; isolated directory only
where npm.cmd >nul 2>&1
if errorlevel 1 goto npm_missing
set "ZG_PRIVATE=%ZG_TARGET%\_analysis_r1_wrangler_runtime"
if exist "%ZG_PRIVATE%\node_modules\wrangler\bin\wrangler.js" goto link_private
rem Retry an interrupted install only in this dedicated private directory.
npm.cmd install --prefix "%ZG_PRIVATE%" --no-save --no-package-lock --no-audit --no-fund --omit=dev wrangler@4.92.0 >>"%ZG_LOG%" 2>&1
if errorlevel 1 goto npm_failed
if not exist "%ZG_PRIVATE%\node_modules\wrangler\bin\wrangler.js" goto npm_failed
:link_private
set "ZG_MODULES=%ZG_PRIVATE%\node_modules"

:link_existing
>>"%ZG_LOG%" echo [3] JUNCTION TO ALREADY INSTALLED DEPENDENCIES
mklink /J "%ZG_TARGET%\node_modules" "%ZG_MODULES%" >>"%ZG_LOG%" 2>&1
if errorlevel 1 goto junction_failed
if not exist "%ZG_TARGET%\node_modules\wrangler\bin\wrangler.js" goto junction_failed
:auth_ready
>>"%ZG_LOG%" echo Wrangler runtime: VERIFIED

>>"%ZG_LOG%" echo [4] READ-ONLY TEN-MINUTE TASK PREFLIGHT
"%NODE%" "%ZG_TARGET%\scripts\iran-progress\news-analysis-schedule-r1.mjs" --inspect >>"%ZG_LOG%" 2>&1
if errorlevel 1 goto task_failed
>>"%ZG_LOG%" echo [5] REGISTER INDEPENDENT TASK OR VERIFY IDENTICAL TASK
"%NODE%" "%ZG_TARGET%\scripts\iran-progress\news-analysis-schedule-r1.mjs" --apply >>"%ZG_LOG%" 2>&1
if errorlevel 1 goto task_failed
>>"%ZG_LOG%" echo [6] ONE REAL ANALYSIS + CORE D1 READBACK CYCLE
"%NODE%" "%ZG_TARGET%\scripts\iran-progress\news-analysis-scheduled-r1.mjs" >>"%ZG_LOG%" 2>&1
if errorlevel 1 goto cycle_failed
>>"%ZG_LOG%" echo FINAL_STATUS=TASK_REGISTERED_AND_CYCLE_VERIFIED
goto success

:source_missing
>>"%ZG_LOG%" echo ERROR=PINNED_R1_SOURCE_NOT_FOUND_RERUN_ORIGINAL_ONE_CLICK
goto blocked
:data_missing
>>"%ZG_LOG%" echo ERROR=APPROVED_IRAN_DATA_DIRECTORY_NOT_FOUND
goto blocked
:node_missing
>>"%ZG_LOG%" echo ERROR=NODE24_NOT_AVAILABLE
goto blocked
:invalid_target_modules
>>"%ZG_LOG%" echo ERROR=ISOLATED_NODE_MODULES_ENTRY_ALREADY_EXISTS_NO_OVERWRITE
goto blocked
:npm_missing
>>"%ZG_LOG%" echo ERROR=NPM_NOT_INSTALLED_NO_EXISTING_WRANGLER_FOUND
goto blocked
:npm_failed
>>"%ZG_LOG%" echo ERROR=LOCKED_PRIVATE_WRANGLER_INSTALL_FAILED
goto blocked
:junction_failed
>>"%ZG_LOG%" echo ERROR=WRANGLER_JUNCTION_OR_READBACK_FAILED
goto blocked
:task_failed
>>"%ZG_LOG%" echo ERROR=TASK_PREFLIGHT_OR_INSTALL_FAILED_EXISTING_TASKS_UNCHANGED
goto blocked
:cycle_failed
>>"%ZG_LOG%" echo ERROR=R1_ANALYSIS_OR_D1_PUBLISH_FAILED
>>"%ZG_LOG%" echo FINAL_STATUS=TASK_REGISTERED_CYCLE_BLOCKED_CHECK_DETAILS
goto failed
:blocked
>>"%ZG_LOG%" echo FINAL_STATUS=BLOCKED_CHECK_ERROR_AND_DETAILS
:failed
type "%ZG_LOG%"
echo.
echo Log: "%ZG_LOG%"
echo Press any key to close.
pause >nul
exit /b 1
:success
type "%ZG_LOG%"
echo.
echo Log: "%ZG_LOG%"
echo Press any key to close.
pause >nul
exit /b 0
:log_unavailable
echo ERROR=CANNOT_WRITE_RESULT_NEXT_TO_CMD
pause
exit /b 1
