@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "R50_PC_HOME=E:\ZGmini\data\pc-writer"
set "R50_NODE=E:\ZGmini\runtime\node.exe"
set "R50_SCRIPT=%~dp0market-calendar-r50-bulk-facts-readonly.mjs"
set "R50_OUTPUT=%~dp0MARKET_CALENDAR_R50_BULK_FACTS_RESULT.txt"
if exist "%R50_OUTPUT%" (
  echo STOP: R50 result already exists. Do not rerun.
  pause
  exit /b 2
)
if not exist "%R50_NODE%" (
  echo STOP: approved Node runtime missing.
  pause
  exit /b 2
)
if not exist "%R50_SCRIPT%" (
  echo STOP: R50 script missing.
  pause
  exit /b 2
)
"%R50_NODE%" "%R50_SCRIPT%" "%R50_PC_HOME%" "%~dp0."
set "R50_EXIT=%ERRORLEVEL%"
echo R50 exit code: %R50_EXIT%
echo Result: %R50_OUTPUT%
echo Send result file. Do not rerun after failure.
pause
exit /b %R50_EXIT%
