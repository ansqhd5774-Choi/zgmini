@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem Read-only detailed validity audit of the permitted GOV.UK R1 model output.
set "ZG_LOG=%~dp0IRAN_NEWS_ANALYSIS_R1_OUTPUT_AUDIT_RESULT.txt"
set "ZG_TARGET=E:\ZGmini\projects\iran-news-analysis-r1-56eec668"
set "ZG_SOURCE=%ZG_TARGET%\scripts\iran-progress\news-r41-auto-interpret-r1.mjs"
set "ZG_HELPER=%~dp0news-analysis-output-audit-r1.mjs"
set "ZG_TEMP=%ZG_HELPER%.download"
set "ZG_COMMIT=a5420eb5c154a1c16579e89a4b00bf03b24c986a"
set "ZG_SOURCE_SHA256=c9d6e4e57ba5ffa799e7d6cd351fbc93380c1dc69fc7f5cdbe59cbd8ab923443"
set "ZG_HELPER_SHA256=a410b9361bf4ed6e55a111f9fe4ee28190c398ecc38ec685d6abf3ef1596f28d"
set "ZG_OWN_TEMP=0"
>"%ZG_LOG%" echo IRAN NEWS ANALYSIS R1 READ-ONLY OUTPUT VALIDATION AUDIT
if errorlevel 1 goto log_unavailable
>>"%ZG_LOG%" echo Writes: none to tasks, source, D1, public feed or R5 scores.
if not exist "%ZG_SOURCE%" goto source_missing
where curl.exe >nul 2>&1
if errorlevel 1 goto utility_missing
where certutil.exe >nul 2>&1
if errorlevel 1 goto utility_missing
if exist "%ZG_TEMP%" goto temp_exists
call "%ZG_TARGET%\scripts\resolve-local-node.cmd" >>"%ZG_LOG%" 2>&1
if errorlevel 1 goto node_missing

>>"%ZG_LOG%" echo [1] VERIFY PINNED R1 SOURCE WITHOUT CHANGING IT
certutil.exe -hashfile "%ZG_SOURCE%" SHA256 >>"%ZG_LOG%" 2>&1
certutil.exe -hashfile "%ZG_SOURCE%" SHA256 | findstr /I /C:"%ZG_SOURCE_SHA256%" >nul
if errorlevel 1 goto source_unknown

>>"%ZG_LOG%" echo [2] VERIFY OR DOWNLOAD AUDIT HELPER
if exist "%ZG_HELPER%" goto verify_helper
set "ZG_OWN_TEMP=1"
curl.exe -fL --retry 2 --connect-timeout 15 --max-time 120 -o "%ZG_TEMP%" "https://raw.githubusercontent.com/ansqhd5774-Choi/zgmini/%ZG_COMMIT%/scripts/iran-progress/news-analysis-output-audit-r1.mjs" >>"%ZG_LOG%" 2>&1
if errorlevel 1 goto download_failed
certutil.exe -hashfile "%ZG_TEMP%" SHA256 | findstr /I /C:"%ZG_HELPER_SHA256%" >nul
if errorlevel 1 goto integrity_failed
move "%ZG_TEMP%" "%ZG_HELPER%" >>"%ZG_LOG%" 2>&1
if errorlevel 1 goto install_failed
:verify_helper
certutil.exe -hashfile "%ZG_HELPER%" SHA256 >>"%ZG_LOG%" 2>&1
certutil.exe -hashfile "%ZG_HELPER%" SHA256 | findstr /I /C:"%ZG_HELPER_SHA256%" >nul
if errorlevel 1 goto integrity_failed
"%NODE%" --check "%ZG_HELPER%" >>"%ZG_LOG%" 2>&1
if errorlevel 1 goto helper_invalid

>>"%ZG_LOG%" echo [3] INSPECT SCHEDULE READ-ONLY
"%NODE%" "%ZG_TARGET%\scripts\iran-progress\news-analysis-schedule-r1.mjs" --inspect >>"%ZG_LOG%" 2>&1
if errorlevel 1 goto schedule_failed
>>"%ZG_LOG%" echo [4] DIAGNOSE EXACT MODEL OUTPUT VALIDATION FIELDS
"%NODE%" "%ZG_HELPER%" >>"%ZG_LOG%" 2>&1
if errorlevel 1 goto diagnostic_failed
>>"%ZG_LOG%" echo FINAL_STATUS=DIAGNOSTIC_COMPLETED_NO_D1_WRITES
goto success

:source_missing
>>"%ZG_LOG%" echo ERROR=ISOLATED_R1_SOURCE_NOT_FOUND
goto blocked
:source_unknown
>>"%ZG_LOG%" echo ERROR=UNKNOWN_R1_SOURCE_SHA256
goto blocked
:utility_missing
>>"%ZG_LOG%" echo ERROR=CURL_OR_CERTUTIL_NOT_FOUND
goto blocked
:temp_exists
>>"%ZG_LOG%" echo ERROR=EXISTING_TEMP_NO_OVERWRITE
goto blocked
:node_missing
>>"%ZG_LOG%" echo ERROR=NODE_RUNTIME_NOT_FOUND
goto blocked
:download_failed
>>"%ZG_LOG%" echo ERROR=PINNED_DOWNLOAD_FAILED
goto blocked
:integrity_failed
>>"%ZG_LOG%" echo ERROR=HELPER_SHA256_MISMATCH
goto blocked
:install_failed
>>"%ZG_LOG%" echo ERROR=HELPER_MOVE_FAILED
goto blocked
:helper_invalid
>>"%ZG_LOG%" echo ERROR=HELPER_SYNTAX_INVALID
goto blocked
:schedule_failed
>>"%ZG_LOG%" echo ERROR=SCHEDULE_INSPECT_FAILED
goto blocked
:diagnostic_failed
>>"%ZG_LOG%" echo ERROR=MODEL_OUTPUT_AUDIT_INCOMPLETE
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
