@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "ROOT=%~dp0"
set "NODE=E:\ZGmini\runtime\node.exe"
set "RUNNER=%ROOT%scripts\pc-writer\market-calendar-r29-pc-apply-v2.mjs"
set "RESULT=%ROOT%MARKET_CALENDAR_R29_PC_PRIVATE_APPLY_V2_RESULT.txt"
if not exist "%NODE%" (
  echo R29_V2_STOP_NODE_RUNTIME_MISSING
  exit /b 1
)
if not exist "%RUNNER%" (
  echo R29_V2_STOP_INSTALLER_MISSING
  exit /b 1
)
"%NODE%" "%RUNNER%" "%RESULT%" --apply
set "CODE=%ERRORLEVEL%"
echo RESULT_FILE=%RESULT%
if not "%CODE%"=="0" echo R29_V2_INSTALL_STOP_CHECK_RESULT
endlocal & exit /b %CODE%
