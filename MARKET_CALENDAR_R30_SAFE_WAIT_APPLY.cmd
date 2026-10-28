@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "ROOT=%~dp0"
set "NODE=E:\ZGmini\runtime\node.exe"
set "WAITER=%ROOT%scripts\pc-writer\market-calendar-r30-safe-wait.mjs"
set "RESULT=%ROOT%MARKET_CALENDAR_R30_SAFE_WAIT_RESULT.txt"
if not exist "%NODE%" (
  echo R30_STOP_NODE_RUNTIME_MISSING
  exit /b 2
)
if not exist "%WAITER%" (
  echo R30_STOP_WAITER_MISSING
  exit /b 2
)
"%NODE%" "%WAITER%" "%RESULT%"
set "CODE=%ERRORLEVEL%"
echo R30_RESULT_FILE=%RESULT%
if not "%CODE%"=="0" echo R30_STOP_CHECK_RESULT
endlocal & exit /b %CODE%
