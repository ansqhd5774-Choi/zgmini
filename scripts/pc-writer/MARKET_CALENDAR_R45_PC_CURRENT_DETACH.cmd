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
 set "R45_NOW_REASON=R45_CURRENT_PREFLIGHT_RESULT_MISSING_STOP"
 goto R45_NOW_LOCAL_STOP
)
findstr /C:"R45_CURRENT_PREFLIGHT_READY_NO_CHANGES" "%R45_NOW_PREFLIGHT%" >nul
if errorlevel 1 (
 set "R45_NOW_REASON=R45_CURRENT_PREFLIGHT_NOT_READY_STOP"
 goto R45_NOW_LOCAL_STOP
)
:R45_NOW_RUN
if exist "%R45_NOW_RESULT%" (
 echo Existing result is preserved. Use a NEW extraction folder if needed.
 exit /b 2
)
if not exist "%R45_NOW_NODE%" (
 set "R45_NOW_REASON=R45_CURRENT_APPROVED_NODE_MISSING_STOP"
 goto R45_NOW_LOCAL_STOP
)
if not exist "%R45_NOW_DIR%market-calendar-r45-pc-current-detach.mjs" (
 set "R45_NOW_REASON=R45_CURRENT_HELPER_MISSING_STOP"
 goto R45_NOW_LOCAL_STOP
)
if not exist "%R45_NOW_DIR%market-calendar-r45-pc-live-inventory.mjs" (
 set "R45_NOW_REASON=R45_CURRENT_CORE_RESOLVER_MISSING_STOP"
 goto R45_NOW_LOCAL_STOP
)
"%R45_NOW_NODE%" "%R45_NOW_DIR%market-calendar-r45-pc-current-detach.mjs" %R45_NOW_ARG% --base="%R45_NOW_HOME%" > "%R45_NOW_RESULT%" 2>&1
set "R45_NOW_EXIT=%ERRORLEVEL%"
type "%R45_NOW_RESULT%"
echo Result: "%R45_NOW_RESULT%"
exit /b %R45_NOW_EXIT%
:R45_NOW_LOCAL_STOP
if exist "%R45_NOW_RESULT%" (
 echo Existing result is preserved. Use a NEW extraction folder if needed.
 exit /b 2
)
> "%R45_NOW_RESULT%" echo {"audit":"MARKET_CALENDAR_R45_PC_CURRENT_DETACH_LAUNCHER","phase":"LOCAL_STOP","decision":"%R45_NOW_REASON%","changedFiles":[],"schedulerChanged":false,"forcedCoreRun":false,"providerCalls":0,"dbWrites":0,"published":false,"gitPushed":false}
if not exist "%R45_NOW_RESULT%" (
 echo Cannot create result file. Check extraction-folder write access.
 exit /b 3
)
type "%R45_NOW_RESULT%"
echo Result: "%R45_NOW_RESULT%"
exit /b 2
:R45_NOW_USAGE
echo Usage: MARKET_CALENDAR_R45_PC_CURRENT_DETACH.cmd [--apply]
echo Without arguments the operation is read-only.
exit /b 2
