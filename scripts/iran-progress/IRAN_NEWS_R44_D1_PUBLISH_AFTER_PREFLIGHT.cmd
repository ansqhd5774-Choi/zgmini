@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem R44: approved one-time R41 metadata publication using the R43-verified PC writer.
rem No new installation, source checkout, R1 snapshot write or schedule changes.
set "R44_NODE=E:\ZGmini\runtime\node.exe"
set "R44_STAGE=%TEMP%\ZGMINI_IRAN_NEWS_R42_RUNTIME_FIX2"
set "R44_SCRIPT=%R44_STAGE%\scripts\iran-progress\news-metadata-d1-once-r42.mjs"
set "R44_RESULT=%~dp0IRAN_NEWS_R44_D1_PUBLISH_RESULT.txt"
if exist "%R44_RESULT%" goto existing_result
> "%R44_RESULT%" echo R44_ONE_TIME_PUBLISH_STARTED=YES
if errorlevel 1 goto log_failed
>> "%R44_RESULT%" echo SOURCE_COMMIT=e149bdcef8ff52d555075478f7822114503ef296
>> "%R44_RESULT%" echo R43_PRIOR_DIAG=PREFLIGHT_PASSED
if not exist "%R44_NODE%" goto missing_node
if not exist "%R44_SCRIPT%" goto missing_script

>> "%R44_RESULT%" echo [1] D1 preflight read-only
"%R44_NODE%" "%R44_SCRIPT%" --preflight >> "%R44_RESULT%" 2>&1
if errorlevel 1 goto preflight_failed
>> "%R44_RESULT%" echo R44_PREFLIGHT=PASS_READ_ONLY

>> "%R44_RESULT%" echo [2] Approved R41 separate-table D1 write, one attempt only
set "IRAN_NEWS_R42_APPROVED=YES"
"%R44_NODE%" "%R44_SCRIPT%" --apply-approved >> "%R44_RESULT%" 2>&1
set "R44_EXIT=%ERRORLEVEL%"
set "IRAN_NEWS_R42_APPROVED="
if "%R44_EXIT%"=="2" goto stored_api_pending
if not "%R44_EXIT%"=="0" goto write_uncertain
>> "%R44_RESULT%" echo FINAL_STATUS=D1_AND_PUBLIC_API_VERIFIED
echo R44 D1 and API verified. Upload IRAN_NEWS_R44_D1_PUBLISH_RESULT.txt.
pause
exit /b 0

:stored_api_pending
>> "%R44_RESULT%" echo FINAL_STATUS=D1_STORED_PUBLIC_API_PENDING_DO_NOT_RETRY
echo D1 read-back succeeded, API pending. DO NOT rerun. Upload result.
pause
exit /b 2
:write_uncertain
>> "%R44_RESULT%" echo FINAL_STATUS=WRITE_OUTCOME_UNKNOWN_DO_NOT_RETRY
echo D1 outcome uncertain. DO NOT rerun. Upload result.
pause
exit /b 1
:preflight_failed
>> "%R44_RESULT%" echo FINAL_STATUS=PREFLIGHT_FAILED_NO_D1_WRITE
echo Preflight failed with no D1 write. Upload result.
pause
exit /b 1
:missing_script
>> "%R44_RESULT%" echo FINAL_STATUS=R42_STAGE_MISSING_NO_D1_WRITE
echo R42 downloaded module not found. Upload result.
pause
exit /b 1
:missing_node
>> "%R44_RESULT%" echo FINAL_STATUS=EXISTING_NODE_MISSING_NO_D1_WRITE
echo Existing Node not found. Upload result.
pause
exit /b 1
:existing_result
echo Existing result detected. DO NOT rerun until result reviewed: "%R44_RESULT%"
pause
exit /b 1
:log_failed
echo Cannot create result beside this CMD. Move it to Downloads and rerun once.
pause
exit /b 1
