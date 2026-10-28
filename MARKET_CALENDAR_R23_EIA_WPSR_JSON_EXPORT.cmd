@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "NODE_BIN=E:\ZGmini\runtime\node.exe"
set "SCRIPT=%~dp0scripts\pc-writer\market-calendar-r23-eia-wpsr-json-export.mjs"
set "RESULT=%~dp0MARKET_CALENDAR_R23_EIA_WPSR_JSON_RESULT.txt"
if not exist "%NODE_BIN%" set "NODE_BIN=node.exe"
if not exist "%SCRIPT%" (
  echo R23_WPSR_JSON_SCRIPT_MISSING
  exit /b 2
)
"%NODE_BIN%" "%SCRIPT%" "%RESULT%"
if errorlevel 1 (
  echo R23_WPSR_JSON_EXPORT_STOP
  echo RESULT_FILE=%RESULT%
  exit /b 1
)
echo R23_WPSR_JSON_EXPORT_DONE
echo RESULT_FILE=%RESULT%
exit /b 0
