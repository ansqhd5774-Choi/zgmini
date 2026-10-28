@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "NODE_BIN=E:\ZGmini\runtime\node.exe"
set "SCRIPT=%~dp0scripts\pc-writer\market-calendar-r24-source-drift-readonly.mjs"
set "RESULT=%~dp0MARKET_CALENDAR_R24_SOURCE_DRIFT_RESULT.txt"
if not exist "%NODE_BIN%" set "NODE_BIN=node.exe"
if not exist "%SCRIPT%" (
  echo R24_DRIFT_DIAGNOSTIC_SCRIPT_MISSING
  exit /b 2
)
"%NODE_BIN%" "%SCRIPT%" "%RESULT%"
if errorlevel 1 (
  echo R24_DRIFT_DIAGNOSTIC_STOP
  echo RESULT_FILE=%RESULT%
  exit /b 1
)
echo R24_SOURCE_DRIFT_READONLY_DONE
echo RESULT_FILE=%RESULT%
exit /b 0
