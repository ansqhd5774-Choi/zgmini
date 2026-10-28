@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem R42 stand-alone launcher: download immutable approved source into a local sandbox.
rem It does not alter the PC's approved project, R1 news key or scheduler.
set "R42_NODE=E:\ZGmini\runtime\node.exe"
set "R42_DIR=%~dp0IRAN_NEWS_R42_RUNTIME"
set "R42_RESULT=%~dp0IRAN_NEWS_R42_ONE_CLICK_RESULT.txt"
if exist "%USERPROFILE%\Desktop\" set "R42_RESULT=%USERPROFILE%\Desktop\IRAN_NEWS_R42_ONE_CLICK_RESULT.txt"
set "R42_RAW=https://raw.githubusercontent.com/ansqhd5774-Choi/zgmini/e149bdcef8ff52d555075478f7822114503ef296"
if exist "%R42_RESULT%" goto existing_result
if not exist "%R42_NODE%" goto missing_node
where curl.exe >nul 2>nul
if errorlevel 1 goto missing_curl

if not exist "%R42_DIR%\scripts\iran-progress" mkdir "%R42_DIR%\scripts\iran-progress"
if errorlevel 1 goto setup_failed
if not exist "%R42_DIR%\scripts\pc-writer" mkdir "%R42_DIR%\scripts\pc-writer"
if errorlevel 1 goto setup_failed
if not exist "%R42_DIR%\lib\iran-progress" mkdir "%R42_DIR%\lib\iran-progress"
if errorlevel 1 goto setup_failed
if not exist "%R42_DIR%\db\migrations\iran-news-r41" mkdir "%R42_DIR%\db\migrations\iran-news-r41"
if errorlevel 1 goto setup_failed
if not exist "%R42_DIR%\docs" mkdir "%R42_DIR%\docs"
if errorlevel 1 goto setup_failed

> "%R42_RESULT%" echo R42_SOURCE_COMMIT=e149bdcef8ff52d555075478f7822114503ef296
>> "%R42_RESULT%" echo R42_STAGE_ONLY_NO_EXISTING_PC_SOURCE_CHANGED=YES
call :download "scripts/iran-progress/news-metadata-d1-once-r42.mjs" "scripts\iran-progress\news-metadata-d1-once-r42.mjs"
if errorlevel 1 goto download_failed
call :download "scripts/iran-progress/news-metadata-stage-r41.mjs" "scripts\iran-progress\news-metadata-stage-r41.mjs"
if errorlevel 1 goto download_failed
call :download "lib/iran-progress/news-metadata-r41.mjs" "lib\iran-progress\news-metadata-r41.mjs"
if errorlevel 1 goto download_failed
call :download "lib/iran-progress/news-display-r1.mjs" "lib\iran-progress\news-display-r1.mjs"
if errorlevel 1 goto download_failed
call :download "scripts/pc-writer/d1.mjs" "scripts\pc-writer\d1.mjs"
if errorlevel 1 goto download_failed
call :download "scripts/pc-writer/d1-transient.mjs" "scripts\pc-writer\d1-transient.mjs"
if errorlevel 1 goto download_failed
call :download "scripts/pc-writer/d1-diagnostics.mjs" "scripts\pc-writer\d1-diagnostics.mjs"
if errorlevel 1 goto download_failed
call :download "db/migrations/iran-news-r41/0001_article_metadata.sql" "db\migrations\iran-news-r41\0001_article_metadata.sql"
if errorlevel 1 goto download_failed
call :download "docs/IRAN_NEWS_R41_STAGING_ROWS_20261029.json" "docs\IRAN_NEWS_R41_STAGING_ROWS_20261029.json"
if errorlevel 1 goto download_failed

>> "%R42_RESULT%" echo R42_PREFLIGHT_STARTED=YES
"%R42_NODE%" "%R42_DIR%\scripts\iran-progress\news-metadata-d1-once-r42.mjs" --preflight >> "%R42_RESULT%" 2>&1
if errorlevel 1 goto preflight_failed
>> "%R42_RESULT%" echo R42_PREFLIGHT=PASS_NO_WRITE

set "IRAN_NEWS_R42_APPROVED=YES"
"%R42_NODE%" "%R42_DIR%\scripts\iran-progress\news-metadata-d1-once-r42.mjs" --apply-approved >> "%R42_RESULT%" 2>&1
set "R42_EXIT=%ERRORLEVEL%"
set "IRAN_NEWS_R42_APPROVED="
if "%R42_EXIT%"=="2" goto api_pending
if not "%R42_EXIT%"=="0" goto write_uncertain
>> "%R42_RESULT%" echo FINAL_STATUS=D1_AND_PUBLIC_API_VERIFIED
echo R42 SUCCESS. Upload "IRAN_NEWS_R42_ONE_CLICK_RESULT.txt" from Desktop.
exit /b 0

:download
curl.exe --fail --location --silent --show-error --retry 0 --max-time 45 "%R42_RAW%/%~1" --output "%R42_DIR%\%~2" >> "%R42_RESULT%" 2>&1
if errorlevel 1 (
  >> "%R42_RESULT%" echo R42_DOWNLOAD_FAILED=%~1
  exit /b 1
)
exit /b 0

:api_pending
>> "%R42_RESULT%" echo FINAL_STATUS=D1_STORED_PUBLIC_API_PENDING
echo D1 stored. Public API pending. DO NOT rerun; upload result.
exit /b 2
:write_uncertain
>> "%R42_RESULT%" echo FINAL_STATUS=WRITE_OUTCOME_UNCERTAIN_DO_NOT_RETRY
echo Write outcome uncertain. DO NOT rerun; upload result.
exit /b 1
:preflight_failed
>> "%R42_RESULT%" echo FINAL_STATUS=PREFLIGHT_FAILED_NO_D1_WRITE
echo Preflight failed. No D1 write started. Upload result.
exit /b 1
:download_failed
>> "%R42_RESULT%" echo FINAL_STATUS=DOWNLOAD_FAILED_NO_D1_WRITE
echo Download failed. No D1 write started. Upload result.
exit /b 1
:setup_failed
echo R42_SETUP_FAILED_NO_D1_WRITE
exit /b 1
:missing_node
echo Existing E: drive Node not found: "%R42_NODE%"
exit /b 1
:missing_curl
echo Windows curl.exe not found. No D1 write started.
exit /b 1
:existing_result
echo Result file already exists. DO NOT rerun before review: "%R42_RESULT%"
exit /b 1
