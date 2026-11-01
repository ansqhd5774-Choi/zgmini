@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "ROOT=%~dp0"
set "NODE=E:\ZGmini\runtime\node.exe"
set "SCRIPT=%ROOT%scripts\pc-writer\market-calendar-r34-earnings-sync.mjs"
set "RESULT=%ROOT%MARKET_CALENDAR_R34_EARNINGS_SYNC_RESULT.txt"
if not exist "%NODE%" (
  echo R34_STOP_NODE_RUNTIME_MISSING
  exit /b 2
)
if not exist "%SCRIPT%" (
  echo R34_STOP_SCRIPT_MISSING
  exit /b 2
)
"%NODE%" "%SCRIPT%" "%RESULT%"
set "CODE=%ERRORLEVEL%"
echo R34_RESULT_FILE=%RESULT%
if not "%CODE%"=="0" echo R34_STOP_CHECK_RESULT
endlocal & exit /b %CODE%
