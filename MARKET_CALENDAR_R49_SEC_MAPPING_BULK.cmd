@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "R49_PC_HOME=E:\ZGmini\data\pc-writer"
set "R49_NODE=E:\ZGmini\runtime\node.exe"
set "R49_SCRIPT=%~dp0market-calendar-r49-sec-map-bulk-readonly.mjs"
set "R49_OUTPUT=%~dp0MARKET_CALENDAR_R49_SEC_MAPPING_BULK_RESULT.txt"
if exist "%R49_OUTPUT%" (
  echo STOP: result already exists. Do not rerun.
  pause
  exit /b 2
)
if not exist "%R49_NODE%" (
  echo STOP: approved Node runtime not found.
  pause
  exit /b 2
)
if not exist "%R49_SCRIPT%" (
  echo STOP: R49 script missing.
  pause
  exit /b 2
)
"E:\ZGmini\runtime\node.exe" "%R49_SCRIPT%" "%R49_PC_HOME%" "%~dp0."
set "R49_EXIT=%ERRORLEVEL%"
echo R49 exit code: %R49_EXIT%
echo Report: %R49_OUTPUT%
echo Upload the report. Do not rerun on failure.
pause
exit /b %R49_EXIT%
