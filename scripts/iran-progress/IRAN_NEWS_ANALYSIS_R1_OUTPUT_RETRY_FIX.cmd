@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem Restore R1 from a repeated model-validation failure; no R5 or collector modifications.
set "ZG_LOG=%~dp0IRAN_NEWS_ANALYSIS_R1_OUTPUT_RETRY_FIX_RESULT.txt"
set "ZG_TARGET=E:\ZGmini\projects\iran-news-analysis-r1-56eec668"
set "ZG_SOURCE=%ZG_TARGET%\scripts\iran-progress\news-r41-auto-interpret-r1.mjs"
set "ZG_BACKUP=%ZG_SOURCE%.r1-before-output-retry.bak"
set "ZG_TEMP=%ZG_SOURCE%.r1-output-retry-download"
set "ZG_DATA=E:\ZGmini\data\iran-progress-r13"
set "ZG_COMMIT=32d157a279887ec4aafa38228b534da215d30c0a"
set "ZG_OLD_SHA256=ba67c36ca0247c6d13c3431c4f7df68563b45fa5d48effcba9d0e02350f73c9b"
set "ZG_NEW_SHA256=c9d6e4e57ba5ffa799e7d6cd351fbc93380c1dc69fc7f5cdbe59cbd8ab923443"
set "ZG_OWN_TEMP=0"
>"%ZG_LOG%" echo IRAN NEWS R1 VALIDATION RETRY FIX
if errorlevel 1 goto log_unavailable
>>"%ZG_LOG%" echo Scope: R1 model generator only. Existing task, R5 score and collector remain unchanged.
if not exist "%ZG_SOURCE%" goto source_missing
if not exist "%ZG_DATA%\" goto data_missing
where curl.exe >nul 2>&1
if errorlevel 1 goto utility_missing
where certutil.exe >nul 2>&1
if errorlevel 1 goto utility_missing
if exist "%ZG_TEMP%" goto temp_exists
call "%ZG_TARGET%\scripts\resolve-local-node.cmd" >>"%ZG_LOG%" 2>&1
if errorlevel 1 goto node_missing

>>"%ZG_LOG%" echo [1] VERIFY INSTALLED SOURCE HASH
certutil.exe -hashfile "%ZG_SOURCE%" SHA256 >>"%ZG_LOG%" 2>&1
certutil.exe -hashfile "%ZG_SOURCE%" SHA256 | findstr /I /C:"%ZG_NEW_SHA256%" >nul
if not errorlevel 1 goto already_updated
certutil.exe -hashfile "%ZG_SOURCE%" SHA256 | findstr /I /C:"%ZG_OLD_SHA256%" >nul
if errorlevel 1 goto source_unknown

>>"%ZG_LOG%" echo [2] DOWNLOAD IMMUTABLY PINNED R1 GENERATOR
set "ZG_OWN_TEMP=1"
curl.exe -fL --retry 2 --connect-timeout 15 --max-time 120 -o "%ZG_TEMP%" "https://raw.githubusercontent.com/ansqhd5774-Choi/zgmini/%ZG_COMMIT%/scripts/iran-progress/news-r41-auto-interpret-r1.mjs" >>"%ZG_LOG%" 2>&1
if errorlevel 1 goto download_failed
certutil.exe -hashfile "%ZG_TEMP%" SHA256 >>"%ZG_LOG%" 2>&1
certutil.exe -hashfile "%ZG_TEMP%" SHA256 | findstr /I /C:"%ZG_NEW_SHA256%" >nul
if errorlevel 1 goto integrity_failed

>>"%ZG_LOG%" echo [3] PRESERVE PREVIOUS R1 SCRIPT
if exist "%ZG_BACKUP%" goto verify_backup
copy /B "%ZG_SOURCE%" "%ZG_BACKUP%" >>"%ZG_LOG%" 2>&1
if errorlevel 1 goto backup_failed
:verify_backup
certutil.exe -hashfile "%ZG_BACKUP%" SHA256 | findstr /I /C:"%ZG_OLD_SHA256%" >nul
if errorlevel 1 goto backup_failed

>>"%ZG_LOG%" echo [4] INSTALL VERIFIED R1 SOURCE ONLY
move /Y "%ZG_TEMP%" "%ZG_SOURCE%" >>"%ZG_LOG%" 2>&1
if errorlevel 1 goto install_failed
certutil.exe -hashfile "%ZG_SOURCE%" SHA256 | findstr /I /C:"%ZG_NEW_SHA256%" >nul
if errorlevel 1 goto rollback
"%NODE%" --check "%ZG_SOURCE%" >>"%ZG_LOG%" 2>&1
if errorlevel 1 goto rollback
goto run_cycle

:already_updated
>>"%ZG_LOG%" echo Source already matches the verified hash.
:run_cycle
>>"%ZG_LOG%" echo [5] INSPECT INDEPENDENT SCHEDULE READ-ONLY
"%NODE%" "%ZG_TARGET%\scripts\iran-progress\news-analysis-schedule-r1.mjs" --inspect >>"%ZG_LOG%" 2>&1
if errorlevel 1 goto schedule_failed
>>"%ZG_LOG%" echo [6] RUN ONE R1 ANALYSIS AND D1 READBACK
"%NODE%" "%ZG_TARGET%\scripts\iran-progress\news-analysis-scheduled-r1.mjs" >>"%ZG_LOG%" 2>&1
if errorlevel 1 goto cycle_failed
>>"%ZG_LOG%" echo [7] REPORT READY / PENDING WITHOUT REVEALING ARTICLE TEXT
"%NODE%" -e "const fs=require('fs');const d=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));const reasons={};for(const row of d.pending??[]){const k=row.reason??'UNKNOWN';reasons[k]=(reasons[k]??0)+1;}console.log(JSON.stringify({ready:d.items?.length,pending:d.pending?.length,reasons},null,2));" "%ZG_DATA%\news-analysis-r1-public-staged.json" >>"%ZG_LOG%" 2>&1
if errorlevel 1 goto diagnostic_failed
>>"%ZG_LOG%" echo FINAL_STATUS=OUTPUT_RETRY_FIX_APPLIED_AND_READBACK_VERIFIED
goto success

:source_missing
>>"%ZG_LOG%" echo ERROR=ISOLATED_R1_SOURCE_NOT_FOUND
goto blocked
:data_missing
>>"%ZG_LOG%" echo ERROR=R1_DATA_DIRECTORY_MISSING
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
:source_unknown
>>"%ZG_LOG%" echo ERROR=UNKNOWN_SOURCE_SHA256_NO_OVERWRITE
goto blocked
:download_failed
>>"%ZG_LOG%" echo ERROR=PINNED_DOWNLOAD_FAILED
goto blocked
:integrity_failed
>>"%ZG_LOG%" echo ERROR=DOWNLOADED_SHA256_MISMATCH
goto blocked
:backup_failed
>>"%ZG_LOG%" echo ERROR=ORIGINAL_BACKUP_MISSING_OR_INVALID
goto blocked
:install_failed
>>"%ZG_LOG%" echo ERROR=R1_SCRIPT_INSTALL_FAILED
goto blocked
:rollback
>>"%ZG_LOG%" echo ERROR=SOURCE_CHECK_FAILED_RESTORING_PREVIOUS
copy /Y /B "%ZG_BACKUP%" "%ZG_SOURCE%" >>"%ZG_LOG%" 2>&1
goto blocked
:schedule_failed
>>"%ZG_LOG%" echo ERROR=EXISTING_TASK_INSPECTION_FAILED
goto blocked
:cycle_failed
>>"%ZG_LOG%" echo ERROR=ANALYSIS_OR_D1_PUBLICATION_FAILED
goto blocked
:diagnostic_failed
>>"%ZG_LOG%" echo ERROR=PUBLISHED_BUT_RESULT_READ_FAILED
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
