@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "NODE_BIN=E:\ZGmini\runtime\node.exe"
set "SCRIPT=%~dp0scripts\pc-writer\market-calendar-r22-fed-source-export.mjs"
set "RESULT=%~dp0MARKET_CALENDAR_R22_FED_SOURCE_EXPORT_RESULT.txt"
if not exist "%NODE_BIN%" set "NODE_BIN=node.exe"
if not exist "%SCRIPT%" (
  echo R22_FED_EXPORT_SCRIPT_MISSING
  echo RESULT_FILE=%RESULT%
  exit /b 2
)
"%NODE_BIN%" "%SCRIPT%" "%RESULT%"
if errorlevel 1 (
  echo R22_FED_EXPORT_STOPPED
  echo RESULT_FILE=%RESULT%
  exit /b 1
)
echo R22_FED_EXPORT_FINISHED
echo RESULT_FILE=%RESULT%
exit /b 0
