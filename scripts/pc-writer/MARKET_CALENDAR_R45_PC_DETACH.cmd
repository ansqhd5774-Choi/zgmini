@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "R45_DETACH_DIR=%~dp0"
set "R45_DETACH_NODE=E:\ZGmini\runtime\node.exe"
if defined ZGMINI_NODE_EXE set "R45_DETACH_NODE=%ZGMINI_NODE_EXE%"
set "R45_DETACH_HOME=E:\ZGmini\data\pc-writer"
if defined ZGMINI_PC_HOME set "R45_DETACH_HOME=%ZGMINI_PC_HOME%"
set "R45_DETACH_PREFLIGHT=%R45_DETACH_DIR%MARKET_CALENDAR_R45_PC_DETACH_PREFLIGHT_RESULT.txt"
set "R45_DETACH_RESULT=%R45_DETACH_PREFLIGHT%"
set "R45_DETACH_ARG="

if not "%~2"=="" goto R45_USAGE
if "%~1"=="" goto R45_RUN
if /I not "%~1"=="--apply" goto R45_USAGE
set "R45_DETACH_RESULT=%R45_DETACH_DIR%MARKET_CALENDAR_R45_PC_DETACH_APPLY_RESULT.txt"
set "R45_DETACH_ARG=--apply"
if not exist "%R45_DETACH_PREFLIGHT%" (
 echo Run read-only preflight in this folder first.
 exit /b 2
)
findstr /C:"R45_DETACH_PREFLIGHT_READY_NO_CHANGES" "%R45_DETACH_PREFLIGHT%" >nul
if errorlevel 1 (
 echo Preflight did not approve the exact PC source. No apply was attempted.
 exit /b 2
)

:R45_RUN
if exist "%R45_DETACH_RESULT%" (
 echo Existing result is preserved. Use a fresh extraction folder for another attempt.
 exit /b 2
)
if not exist "%R45_DETACH_NODE%" (
 echo Approved Node runtime not found. No PC changes made.
 exit /b 3
)
if not exist "%R45_DETACH_DIR%market-calendar-r45-pc-detach.mjs" (
 echo R45 detach helper is missing. No PC changes made.
 exit /b 3
)
if not exist "%R45_DETACH_DIR%market-calendar-r51-core-origin.mjs" (
 echo R51 origin resolver is missing. No PC changes made.
 exit /b 3
)
"%R45_DETACH_NODE%" "%R45_DETACH_DIR%market-calendar-r45-pc-detach.mjs" %R45_DETACH_ARG% --base="%R45_DETACH_HOME%" > "%R45_DETACH_RESULT%" 2>&1
set "R45_DETACH_EXIT=%ERRORLEVEL%"
type "%R45_DETACH_RESULT%"
echo Result: "%R45_DETACH_RESULT%"
exit /b %R45_DETACH_EXIT%

:R45_USAGE
echo Usage: MARKET_CALENDAR_R45_PC_DETACH.cmd [--apply]
echo Default is read-only. --apply requires prior successful preflight in this folder.
exit /b 2
