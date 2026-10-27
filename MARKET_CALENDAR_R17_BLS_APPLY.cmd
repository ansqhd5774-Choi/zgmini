@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "NODE_BIN=E:\ZGmini\runtime\node.exe"
set "SCRIPT=%~dp0scripts\pc-writer\market-calendar-r17-bls-apply.mjs"
set "RESULT=%~dp0MARKET_CALENDAR_R17_BLS_APPLY_RESULT.txt"
if not exist "%NODE_BIN%" set "NODE_BIN=node.exe"
if not exist "%SCRIPT%" (
  echo R17_SCRIPT_MISSING
  exit /b 2
)
"%NODE_BIN%" "%SCRIPT%" "%RESULT%" --apply
if errorlevel 1 (
  echo R17_REPORT_FAILED
  exit /b 2
)
echo RESULT_FILE=%RESULT%
exit /b 0
