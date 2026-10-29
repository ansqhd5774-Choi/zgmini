@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem Independent read-only R1 Ollama HTTP 500 diagnostic. No task or D1 changes.
set "ZG_LOG=%~dp0IRAN_NEWS_ANALYSIS_R1_OLLAMA_DIAG_RESULT.txt"
set "ZG_TARGET=E:\ZGmini\projects\iran-news-analysis-r1-56eec668"
set "ZG_SCRIPT=%~dp0news-analysis-ollama-diagnostic-r1.mjs"
set "ZG_TEMP=%ZG_SCRIPT%.download"
set "ZG_COMMIT=b6c37e376445d5aa1b8bfa516bfbf789ed653af0"
set "ZG_SHA256=2b511e1f58cb2d61d14635d9cfeeda09752ec16f2d6ab3fd92cf6e967fd78684"
set "ZG_OWN_TEMP=0"
>"%ZG_LOG%" echo IRAN NEWS R1 OLLAMA HTTP 500 DIAGNOSTIC
if errorlevel 1 goto log_unavailable
>>"%ZG_LOG%" echo Scope: HTTP probes only; no task, R5 or D1 writes
if not exist "%ZG_TARGET%\scripts\resolve-local-node.cmd" goto runtime_missing
if not exist "%ZG_TARGET%\scripts\iran-progress\news-r41-auto-interpret-r1.mjs" goto runtime_missing
if exist "%ZG_TEMP%" goto temp_exists
where curl.exe >nul 2>&1
if errorlevel 1 goto utility_missing
where certutil.exe >nul 2>&1
if errorlevel 1 goto utility_missing
call "%ZG_TARGET%\scripts\resolve-local-node.cmd" >>"%ZG_LOG%" 2>&1
if errorlevel 1 goto node_missing

>>"%ZG_LOG%" echo [1] VERIFY BOUNDED DIAGNOSTIC SOURCE
if exist "%ZG_SCRIPT%" goto verify_script
set "ZG_OWN_TEMP=1"
curl.exe -fL --retry 2 --connect-timeout 15 --max-time 120 -o "%ZG_TEMP%" "https://raw.githubusercontent.com/ansqhd5774-Choi/zgmini/%ZG_COMMIT%/scripts/iran-progress/news-analysis-ollama-diagnostic-r1.mjs" >>"%ZG_LOG%" 2>&1
if errorlevel 1 goto download_failed
certutil.exe -hashfile "%ZG_TEMP%" SHA256 | findstr /I /C:"%ZG_SHA256%" >nul
if errorlevel 1 goto integrity_failed
move "%ZG_TEMP%" "%ZG_SCRIPT%" >>"%ZG_LOG%" 2>&1
if errorlevel 1 goto install_failed
:verify_script
certutil.exe -hashfile "%ZG_SCRIPT%" SHA256 >>"%ZG_LOG%" 2>&1
certutil.exe -hashfile "%ZG_SCRIPT%" SHA256 | findstr /I /C:"%ZG_SHA256%" >nul
if errorlevel 1 goto integrity_failed
"%NODE%" --check "%ZG_SCRIPT%" >>"%ZG_LOG%" 2>&1
if errorlevel 1 goto syntax_failed

>>"%ZG_LOG%" echo [2] QUERY LOCAL OLLAMA AND REPRODUCE R1 REQUEST
"%NODE%" "%ZG_SCRIPT%" >>"%ZG_LOG%" 2>&1
if errorlevel 1 goto diagnostic_failed
>>"%ZG_LOG%" echo FINAL_STATUS=DIAGNOSTIC_COMPLETED_NO_TASK_OR_D1_CHANGES
goto success

:runtime_missing
>>"%ZG_LOG%" echo ERROR=ISOLATED_R1_RUNTIME_NOT_FOUND
goto blocked
:temp_exists
>>"%ZG_LOG%" echo ERROR=EXISTING_DOWNLOAD_TEMP_NO_OVERWRITE
goto blocked
:utility_missing
>>"%ZG_LOG%" echo ERROR=CURL_OR_CERTUTIL_MISSING
goto blocked
:node_missing
>>"%ZG_LOG%" echo ERROR=NODE_NOT_FOUND
goto blocked
:download_failed
>>"%ZG_LOG%" echo ERROR=DIAGNOSTIC_DOWNLOAD_FAILED
goto blocked
:integrity_failed
>>"%ZG_LOG%" echo ERROR=DIAGNOSTIC_SHA256_MISMATCH
goto blocked
:install_failed
>>"%ZG_LOG%" echo ERROR=DIAGNOSTIC_SOURCE_MOVE_FAILED
goto blocked
:syntax_failed
>>"%ZG_LOG%" echo ERROR=DIAGNOSTIC_NODE_CHECK_FAILED
goto blocked
:diagnostic_failed
>>"%ZG_LOG%" echo ERROR=DIAGNOSTIC_COMPLETED_WITH_BLOCKER_SEE_JSON
goto blocked
:blocked
if "%ZG_OWN_TEMP%"=="1" if exist "%ZG_TEMP%" del /Q "%ZG_TEMP%" >nul 2>&1
>>"%ZG_LOG%" echo FINAL_STATUS=BLOCKED_CHECK_LOG
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
echo ERROR=CANNOT_CREATE_LOG
pause
exit /b 1
