@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem Independent R1 news interpretation queue repair for the already installed task.
rem Does not change the R41 collector, R26 approvals, R5 score, or any task.
set "ZG_LOG=%~dp0IRAN_NEWS_ANALYSIS_R1_QUEUE_FIX_RESULT.txt"
set "ZG_TARGET=E:\ZGmini\projects\iran-news-analysis-r1-56eec668"
set "ZG_DATA=E:\ZGmini\data\iran-progress-r13"
set "ZG_SOURCE=%ZG_TARGET%\scripts\iran-progress\news-r41-auto-interpret-r1.mjs"
set "ZG_BACKUP=%ZG_SOURCE%.r1-original-56eec668.bak"
set "ZG_TEMP=%ZG_SOURCE%.r1-queue-fix-download"
set "ZG_OLD_SHA256=0c82f115eba64d6f073b1510908248cf236e37d7ed3e00bab229c0bbcf431edc"
set "ZG_NEW_SHA256=55c12f747cbf22e402a172c56d4037020fb6f72f9e5fa989548520805f248376"
set "ZG_PINNED=4178b2a85957841c46392f9e8b7e5a2cb04f68e3"
set "ZG_OWN_TEMP=0"
>"%ZG_LOG%" echo ZGMINI IRAN NEWS ANALYSIS R1 - QUEUE FIX
if errorlevel 1 goto log_unavailable
>>"%ZG_LOG%" echo Scope: independent R1 analysis script only
>>"%ZG_LOG%" echo Pinned source commit: %ZG_PINNED%
if not exist "%ZG_SOURCE%" goto source_missing
if not exist "%ZG_TARGET%\scripts\iran-progress\news-analysis-scheduled-r1.mjs" goto source_missing
if not exist "%ZG_TARGET%\scripts\iran-progress\news-analysis-schedule-r1.mjs" goto source_missing
if not exist "%ZG_DATA%\" goto data_missing
where curl.exe >nul 2>&1
if errorlevel 1 goto utility_missing
where certutil.exe >nul 2>&1
if errorlevel 1 goto utility_missing
if exist "%ZG_TEMP%" goto temp_exists
call "%ZG_TARGET%\scripts\resolve-local-node.cmd" >>"%ZG_LOG%" 2>&1
if errorlevel 1 goto node_missing

>>"%ZG_LOG%" echo [1] VERIFY CURRENT SCRIPT IN PINNED R1 DIRECTORY
certutil.exe -hashfile "%ZG_SOURCE%" SHA256 >>"%ZG_LOG%" 2>&1
if errorlevel 1 goto source_unknown
certutil.exe -hashfile "%ZG_SOURCE%" SHA256 | findstr /I /C:"%ZG_NEW_SHA256%" >nul
if not errorlevel 1 goto already_updated
certutil.exe -hashfile "%ZG_SOURCE%" SHA256 | findstr /I /C:"%ZG_OLD_SHA256%" >nul
if errorlevel 1 goto source_unknown

>>"%ZG_LOG%" echo [2] DOWNLOAD EXACT VERIFIED SCRIPT
set "ZG_OWN_TEMP=1"
curl.exe -fL --retry 2 --connect-timeout 15 --max-time 120 -o "%ZG_TEMP%" "https://raw.githubusercontent.com/ansqhd5774-Choi/zgmini/%ZG_PINNED%/scripts/iran-progress/news-r41-auto-interpret-r1.mjs" >>"%ZG_LOG%" 2>&1
if errorlevel 1 goto download_failed
certutil.exe -hashfile "%ZG_TEMP%" SHA256 >>"%ZG_LOG%" 2>&1
if errorlevel 1 goto downloaded_invalid
certutil.exe -hashfile "%ZG_TEMP%" SHA256 | findstr /I /C:"%ZG_NEW_SHA256%" >nul
if errorlevel 1 goto downloaded_invalid

>>"%ZG_LOG%" echo [3] BACK UP THE EXACT ORIGINAL SCRIPT
if exist "%ZG_BACKUP%" goto verify_existing_backup
copy /B "%ZG_SOURCE%" "%ZG_BACKUP%" >>"%ZG_LOG%" 2>&1
if errorlevel 1 goto backup_failed
:verify_existing_backup
certutil.exe -hashfile "%ZG_BACKUP%" SHA256 | findstr /I /C:"%ZG_OLD_SHA256%" >nul
if errorlevel 1 goto backup_failed

>>"%ZG_LOG%" echo [4] REPLACE ONLY THE VERIFIED R1 SCRIPT
move /Y "%ZG_TEMP%" "%ZG_SOURCE%" >>"%ZG_LOG%" 2>&1
if errorlevel 1 goto install_failed
certutil.exe -hashfile "%ZG_SOURCE%" SHA256 | findstr /I /C:"%ZG_NEW_SHA256%" >nul
if errorlevel 1 goto rollback
"%NODE%" --check "%ZG_SOURCE%" >>"%ZG_LOG%" 2>&1
if errorlevel 1 goto rollback
goto run_cycle

:already_updated
>>"%ZG_LOG%" echo Script already matches the new verified SHA256.

:run_cycle
>>"%ZG_LOG%" echo [5] READ-ONLY VERIFY EXISTING R1 TASK
"%NODE%" "%ZG_TARGET%\scripts\iran-progress\news-analysis-schedule-r1.mjs" --inspect >>"%ZG_LOG%" 2>&1
if errorlevel 1 goto task_failed
>>"%ZG_LOG%" echo [6] RUN ONE REAL ANALYSIS AND D1 PUBLISH READBACK
"%NODE%" "%ZG_TARGET%\scripts\iran-progress\news-analysis-scheduled-r1.mjs" >>"%ZG_LOG%" 2>&1
if errorlevel 1 goto cycle_failed
>>"%ZG_LOG%" echo [7] DIAGNOSE THE RESULT WITHOUT CHANGING IT
"%NODE%" -e "const fs=require('fs');const p=process.argv[1];const d=JSON.parse(fs.readFileSync(p,'utf8'));const reasons={};for(const row of d.pending??[]){const k=row.reason??'UNKNOWN';reasons[k]=(reasons[k]??0)+1;}console.log(JSON.stringify({ready:d.items?.length,pending:d.pending?.length,reasons},null,2));" "%ZG_DATA%\news-analysis-r1-public-staged.json" >>"%ZG_LOG%" 2>&1
if errorlevel 1 goto diagnosis_failed
>>"%ZG_LOG%" echo FINAL_STATUS=QUEUE_FIX_APPLIED_AND_PUBLISH_READBACK_VERIFIED
goto success

:source_missing
>>"%ZG_LOG%" echo ERROR=ISOLATED_R1_SOURCE_NOT_FOUND
goto blocked
:data_missing
>>"%ZG_LOG%" echo ERROR=APPROVED_IRAN_DATA_DIRECTORY_NOT_FOUND
goto blocked
:utility_missing
>>"%ZG_LOG%" echo ERROR=CURL_OR_CERTUTIL_MISSING
goto blocked
:temp_exists
>>"%ZG_LOG%" echo ERROR=EXISTING_TEMP_FILE_NO_OVERWRITE
goto blocked
:node_missing
>>"%ZG_LOG%" echo ERROR=NODE_RUNTIME_NOT_FOUND
goto blocked
:source_unknown
>>"%ZG_LOG%" echo ERROR=SOURCE_SHA256_UNRECOGNIZED_NO_OVERWRITE
goto blocked
:download_failed
>>"%ZG_LOG%" echo ERROR=PINNED_DOWNLOAD_FAILED
goto blocked
:downloaded_invalid
>>"%ZG_LOG%" echo ERROR=DOWNLOADED_SHA256_MISMATCH_NO_INSTALL
goto blocked
:backup_failed
>>"%ZG_LOG%" echo ERROR=ORIGINAL_BACKUP_MISSING_OR_INVALID_NO_INSTALL
goto blocked
:install_failed
>>"%ZG_LOG%" echo ERROR=SCRIPT_MOVE_FAILED_OR_IN_USE
goto blocked
:rollback
>>"%ZG_LOG%" echo ERROR=INSTALLED_FILE_VALIDATION_FAILED_ROLLING_BACK
copy /Y /B "%ZG_BACKUP%" "%ZG_SOURCE%" >>"%ZG_LOG%" 2>&1
goto blocked
:task_failed
>>"%ZG_LOG%" echo ERROR=EXISTING_R1_TASK_NOT_VERIFIED
goto blocked
:cycle_failed
>>"%ZG_LOG%" echo ERROR=R1_ANALYZE_OR_PUBLISH_CYCLE_FAILED
goto blocked
:diagnosis_failed
>>"%ZG_LOG%" echo ERROR=R1_PUBLISHED_BUT_DIAGNOSTIC_READ_FAILED
goto blocked
:blocked
if "%ZG_OWN_TEMP%"=="1" if exist "%ZG_TEMP%" del /Q "%ZG_TEMP%" >nul 2>&1
>>"%ZG_LOG%" echo FINAL_STATUS=BLOCKED_CHECK_ERROR_AND_DETAILS
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
