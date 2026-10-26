@echo off
setlocal EnableExtensions DisableDelayedExpansion

rem ZGMINI Iran news: read-only PC verification. No deletes, no D1 writes.
rem Downloaded code is pinned to a reviewed immutable GitHub commit.
set "ZG_IRAN_LOG=%~dp0IRAN_NEWS_R1_RESULT.txt"
set "ZG_IRAN_RUNTIME=%~dp0IRAN_NEWS_R1_RUNTIME"
set "ZG_IRAN_RAW=https://raw.githubusercontent.com/ansqhd5774-Choi/zgmini/8332e42d2d783ee44a73fe7b87781add4c256c43"

> "%ZG_IRAN_LOG%" echo ZGMINI IRAN NEWS R1 - READ ONLY PC CHECK
>> "%ZG_IRAN_LOG%" echo Commit: 8332e42d2d783ee44a73fe7b87781add4c256c43
>> "%ZG_IRAN_LOG%" echo No cache deletion, no database changes, no D1 publishing.

where node >nul 2>nul
if errorlevel 1 (
 >> "%ZG_IRAN_LOG%" echo ERROR: Node.js was not found in PATH.
 goto :failed
)
where curl >nul 2>nul
if errorlevel 1 (
 >> "%ZG_IRAN_LOG%" echo ERROR: curl was not found in PATH.
 goto :failed
)

if not exist "%ZG_IRAN_RUNTIME%\scripts\iran-progress" mkdir "%ZG_IRAN_RUNTIME%\scripts\iran-progress"
if errorlevel 1 goto :failed
if not exist "%ZG_IRAN_RUNTIME%\lib\iran-progress" mkdir "%ZG_IRAN_RUNTIME%\lib\iran-progress"
if errorlevel 1 goto :failed

call :download "scripts/iran-progress/sources.mjs" "scripts\iran-progress\sources.mjs"
if errorlevel 1 goto :failed
call :download "scripts/iran-progress/news-display-discover-r1.mjs" "scripts\iran-progress\news-display-discover-r1.mjs"
if errorlevel 1 goto :failed
call :download "scripts/iran-progress/news-display-maintenance-r1.mjs" "scripts\iran-progress\news-display-maintenance-r1.mjs"
if errorlevel 1 goto :failed
call :download "scripts/iran-progress/news-display-r1.mjs" "scripts\iran-progress\news-display-r1.mjs"
if errorlevel 1 goto :failed
call :download "scripts/iran-progress/news-display-io-r1.mjs" "scripts\iran-progress\news-display-io-r1.mjs"
if errorlevel 1 goto :failed
call :download "scripts/iran-progress/news-display-publication-r1.mjs" "scripts\iran-progress\news-display-publication-r1.mjs"
if errorlevel 1 goto :failed
call :download "lib/iran-progress/news-display-r1.mjs" "lib\iran-progress\news-display-r1.mjs"
if errorlevel 1 goto :failed

>> "%ZG_IRAN_LOG%" echo.
>> "%ZG_IRAN_LOG%" echo [1] GOV.UK feed preview - candidate discovery only
node "%ZG_IRAN_RUNTIME%\scripts\iran-progress\news-display-discover-r1.mjs" --preview >> "%ZG_IRAN_LOG%" 2>&1
set "ZG_IRAN_DISCOVERY_EXIT=%ERRORLEVEL%"
>> "%ZG_IRAN_LOG%" echo DISCOVERY_EXIT=%ZG_IRAN_DISCOVERY_EXIT%

>> "%ZG_IRAN_LOG%" echo.
>> "%ZG_IRAN_LOG%" echo [2] PC display cache 30-day retention DRY-RUN
node "%ZG_IRAN_RUNTIME%\scripts\iran-progress\news-display-maintenance-r1.mjs" --dry-run >> "%ZG_IRAN_LOG%" 2>&1
set "ZG_IRAN_RETENTION_EXIT=%ERRORLEVEL%"
>> "%ZG_IRAN_LOG%" echo RETENTION_DRY_RUN_EXIT=%ZG_IRAN_RETENTION_EXIT%

if not "%ZG_IRAN_DISCOVERY_EXIT%"=="0" goto :failed
if not "%ZG_IRAN_RETENTION_EXIT%"=="0" goto :failed
>> "%ZG_IRAN_LOG%" echo FINAL_STATUS=PASS_READ_ONLY
echo Finished. Upload IRAN_NEWS_R1_RESULT.txt to ChatGPT.
exit /b 0

:download
curl --fail --location --silent --show-error --max-time 30 "%ZG_IRAN_RAW%/%~1" --output "%ZG_IRAN_RUNTIME%\%~2" >> "%ZG_IRAN_LOG%" 2>&1
if errorlevel 1 (
 >> "%ZG_IRAN_LOG%" echo ERROR: Failed to download %~1
 exit /b 1
)
exit /b 0

:failed
>> "%ZG_IRAN_LOG%" echo FINAL_STATUS=FAIL_OR_PARTIAL_READ_ONLY
echo Check failed or partial. Upload IRAN_NEWS_R1_RESULT.txt to ChatGPT.
exit /b 1
