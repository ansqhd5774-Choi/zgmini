@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "NODE_BIN=E:\ZGmini\runtime\node.exe"
set "SCRIPT=%~dp0scripts\pc-writer\market-calendar-r24-usda-source-export.mjs"
set "RESULT=%~dp0MARKET_CALENDAR_R24_USDA_SOURCE_EXPORT_RESULT.txt"
if not exist "%NODE_BIN%" set "NODE_BIN=node.exe"
if not exist "%SCRIPT%" (
  echo R24_USDA_SOURCE_EXPORT_SCRIPT_MISSING
  exit /b 2
)
"%NODE_BIN%" "%SCRIPT%" "%RESULT%"
if errorlevel 1 (
  echo R24_USDA_SOURCE_EXPORT_STOP_OR_SOURCE_FAILED
  echo RESULT_FILE=%RESULT%
  exit /b 1
)
echo R24_USDA_READONLY_EXPORT_DONE
echo RESULT_FILE=%RESULT%
exit /b 0
