@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "ROOT=%~dp0"
set "NODE=E:\ZGmini\runtime\node.exe"
set "RUNNER=%ROOT%scripts\pc-writer\market-calendar-r29-pc-apply-v3.mjs"
set "RESULT=%ROOT%MARKET_CALENDAR_R29_PC_PRIVATE_APPLY_V3_RESULT.txt"
if not exist "%NODE%" (
  echo R29_V3_STOP_NODE_RUNTIME_MISSING
  exit /b 1
)
if not exist "%RUNNER%" (
  echo R29_V3_STOP_INSTALLER_MISSING
  exit /b 1
)
"%NODE%" "%RUNNER%" "%RESULT%" --apply
set "CODE=%ERRORLEVEL%"
echo RESULT_FILE=%RESULT%
if not "%CODE%"=="0" echo R29_V3_INSTALL_STOP_CHECK_RESULT
endlocal & exit /b %CODE%
