@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "R45_NOW_DIR=%~dp0"
set "R45_NOW_NODE=E:\ZGmini\runtime\node.exe"
if defined ZGMINI_NODE_EXE set "R45_NOW_NODE=%ZGMINI_NODE_EXE%"
set "R45_NOW_HOME=E:\ZGmini\data\pc-writer"
if defined ZGMINI_PC_HOME set "R45_NOW_HOME=%ZGMINI_PC_HOME%"
set "R45_NOW_PREFLIGHT=%R45_NOW_DIR%MARKET_CALENDAR_R45_PC_CURRENT_PREFLIGHT_RESULT.txt"
set "R45_NOW_RESULT=%R45_NOW_PREFLIGHT%"
set "R45_NOW_ARG="
if not "%~2"=="" goto R45_NOW_USAGE
if "%~1"=="" goto R45_NOW_RUN
if /I not "%~1"=="--apply" goto R45_NOW_USAGE
set "R45_NOW_RESULT=%R45_NOW_DIR%MARKET_CALENDAR_R45_PC_CURRENT_APPLY_RESULT.txt"
set "R45_NOW_ARG=--apply"
if not exist "%R45_NOW_PREFLIGHT%" (
 echo Read-only preflight must run first. Nothing was changed.
 exit /b 2
)
findstr /C:"R45_CURRENT_PREFLIGHT_READY_NO_CHANGES" "%R45_NOW_PREFLIGHT%" >nul
if errorlevel 1 (
 echo Current PC source was not verified. No apply attempted.
 exit /b 2
)
:R45_NOW_RUN
if exist "%R45_NOW_RESULT%" (
 echo Existing result is preserved. Use a NEW extraction folder if needed.
 exit /b 2
)
if not exist "%R45_NOW_NODE%" (
 echo Approved Node runtime unavailable. No PC changes made.
 exit /b 3
)
if not exist "%R45_NOW_DIR%market-calendar-r45-pc-current-detach.mjs" (
 echo R45 current-source helper missing. No PC changes made.
 exit /b 3
)
if not exist "%R45_NOW_DIR%market-calendar-r45-pc-live-inventory.mjs" (
 echo Core launcher read-only resolver missing. No PC changes made.
 exit /b 3
)
"%R45_NOW_NODE%" "%R45_NOW_DIR%market-calendar-r45-pc-current-detach.mjs" %R45_NOW_ARG% --base="%R45_NOW_HOME%" > "%R45_NOW_RESULT%" 2>&1
set "R45_NOW_EXIT=%ERRORLEVEL%"
type "%R45_NOW_RESULT%"
echo Result: "%R45_NOW_RESULT%"
exit /b %R45_NOW_EXIT%
:R45_NOW_USAGE
echo Usage: MARKET_CALENDAR_R45_PC_CURRENT_DETACH.cmd [--apply]
echo Without arguments the operation is read-only.
exit /b 2
