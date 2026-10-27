@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "NODE_BIN=E:\ZGmini\runtime\node.exe"
set "SCRIPT=%~dp0scripts\pc-writer\market-calendar-r15-vbs-structure.mjs"
set "RESULT=%~dp0MARKET_CALENDAR_R15_VBS_STRUCTURE_RESULT.txt"
if not exist "%NODE_BIN%" set "NODE_BIN=node.exe"
if not exist "%SCRIPT%" (
  echo R15_SCRIPT_MISSING
  exit /b 2
)
"%NODE_BIN%" "%SCRIPT%" "%RESULT%"
if errorlevel 1 (
  echo R15_REPORT_FAILED
  exit /b 2
)
echo RESULT_FILE=%RESULT%
exit /b 0
