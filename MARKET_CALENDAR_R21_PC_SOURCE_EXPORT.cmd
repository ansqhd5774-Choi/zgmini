@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "NODE_BIN=E:\ZGmini\runtime\node.exe"
set "SCRIPT=%~dp0scripts\pc-writer\market-calendar-r21-source-export.mjs"
set "HELPER=%~dp0scripts\pc-writer\market-calendar-r19-bea-apply.mjs"
set "RESULT=%~dp0MARKET_CALENDAR_R21_PC_SOURCE_EXPORT_RESULT.txt"
if not exist "%NODE_BIN%" set "NODE_BIN=node.exe"
if not exist "%SCRIPT%" (
  echo R21_SOURCE_EXPORT_SCRIPT_MISSING
  exit /b 2
)
if not exist "%HELPER%" (
  echo R21_CORE_IDENTITY_HELPER_MISSING
  exit /b 2
)
"%NODE_BIN%" "%SCRIPT%" "%RESULT%"
if errorlevel 1 (
  echo R21_SOURCE_EXPORT_STOPPED
  echo RESULT_FILE=%RESULT%
  exit /b 1
)
echo R21_SOURCE_EXPORT_DONE
echo RESULT_FILE=%RESULT%
exit /b 0
