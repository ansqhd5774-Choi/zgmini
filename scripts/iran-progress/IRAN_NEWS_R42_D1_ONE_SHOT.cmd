@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "SCRIPT_DIR=%~dp0"
set "NODE_BIN=E:\ZGmini\runtime\node.exe"
set "SCRIPT_FILE=%SCRIPT_DIR%news-metadata-d1-once-r42.mjs"
set "RESULT_FILE=%SCRIPT_DIR%IRAN_NEWS_R42_D1_ONE_SHOT_RESULT.txt"
if exist "%USERPROFILE%\Desktop\" set "RESULT_FILE=%USERPROFILE%\Desktop\IRAN_NEWS_R42_D1_ONE_SHOT_RESULT.txt"
if exist "%RESULT_FILE%" goto existing_result
if not exist "%NODE_BIN%" goto missing_node
if not exist "%SCRIPT_FILE%" goto missing_script

"%NODE_BIN%" "%SCRIPT_FILE%" --preflight > "%RESULT_FILE%" 2>&1
if errorlevel 1 goto preflight_failed

set "IRAN_NEWS_R42_APPROVED=YES"
"%NODE_BIN%" "%SCRIPT_FILE%" --apply-approved >> "%RESULT_FILE%" 2>&1
if errorlevel 2 goto stored_api_pending
if errorlevel 1 goto write_outcome_unknown
echo R42_D1_AND_PUBLIC_API_VERIFIED >> "%RESULT_FILE%"
echo SUCCESS. Result: "%RESULT_FILE%"
exit /b 0

:stored_api_pending
echo R42_D1_STORED_PUBLIC_API_PENDING >> "%RESULT_FILE%"
echo D1 verified. Public API is pending. DO NOT rerun blindly.
echo Result: "%RESULT_FILE%"
exit /b 2

:preflight_failed
echo R42_PREFLIGHT_FAILED_NO_WRITE >> "%RESULT_FILE%"
echo Preflight failed. D1 write was not started.
echo Result: "%RESULT_FILE%"
exit /b 1

:write_outcome_unknown
echo R42_WRITE_OUTCOME_UNKNOWN_NO_AUTO_RETRY >> "%RESULT_FILE%"
echo Write outcome uncertain. Read the result before any new execution.
echo Result: "%RESULT_FILE%"
exit /b 1

:missing_node
echo R42_EXISTING_NODE_NOT_FOUND: "%NODE_BIN%"
exit /b 1

:missing_script
echo R42_SCRIPT_NOT_FOUND: "%SCRIPT_FILE%"
exit /b 1

:existing_result
echo R42_RESULT_ALREADY_EXISTS_NO_OVERWRITE: "%RESULT_FILE%"
echo Inspect the previous result before deciding whether any new run is safe.
exit /b 1
