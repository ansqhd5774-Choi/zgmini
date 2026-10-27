@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "NODE_BIN=E:\ZGmini\runtime\node.exe"
set "SCRIPT=%~dp0scripts\pc-writer\market-calendar-r19-bea-apply.mjs"
set "CANDIDATE=%~dp0staging\market-calendar\r19-bea\lib\release-calendar.mjs"
set "RESULT=%~dp0MARKET_CALENDAR_R19_BEA_APPLY_RESULT.txt"
if not exist "%NODE_BIN%" set "NODE_BIN=node.exe"
if not exist "%SCRIPT%" (
  echo R19_SCRIPT_MISSING
  exit /b 2
)
if not exist "%CANDIDATE%" (
  echo R19_BEA_PARSER_MISSING
  exit /b 2
)
"%NODE_BIN%" "%SCRIPT%" "%RESULT%" --apply
if errorlevel 1 (
  echo R19_REPORT_FAILED
  exit /b 2
)
echo RESULT_FILE=%RESULT%
exit /b 0
