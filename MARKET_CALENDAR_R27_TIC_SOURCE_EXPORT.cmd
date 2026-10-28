@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "NODE_BIN=E:\ZGmini\runtime\node.exe"
set "SCRIPT=%~dp0scripts\pc-writer\market-calendar-r27-tic-source-export.mjs"
set "RESULT=%~dp0MARKET_CALENDAR_R27_TIC_SOURCE_EXPORT_RESULT.txt"
if not exist "%NODE_BIN%" set "NODE_BIN=node.exe"
if not exist "%SCRIPT%" (
  echo R27_TIC_SOURCE_EXPORT_SCRIPT_MISSING
  exit /b 2
)
"%NODE_BIN%" "%SCRIPT%" "%RESULT%"
if errorlevel 1 (
  echo R27_TIC_READONLY_SOURCE_FAILED
  echo RESULT_FILE=%RESULT%
  exit /b 1
)
echo R27_TIC_READONLY_SOURCE_DONE
echo RESULT_FILE=%RESULT%
exit /b 0
