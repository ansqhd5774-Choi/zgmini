@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "ZGR51_NODE=E:\ZGmini\runtime\node.exe"
set "ZGR51_SCRIPT=%~dp0scripts\pc-writer\market-calendar-r51-price-coverage.mjs"
if not exist "%ZGR51_NODE%" (
  echo STOP=R51_APPROVED_NODE_MISSING
  exit /b 3
)
if not exist "%ZGR51_SCRIPT%" (
  echo STOP=R51_PACKAGE_SCRIPT_MISSING
  exit /b 3
)
"%ZGR51_NODE%" "%ZGR51_SCRIPT%" preflight "E:\ZGmini\data\pc-writer" "%~dp0"
set "ZGR51_CODE=%ERRORLEVEL%"
if not "%ZGR51_CODE%"=="0" echo STOP=R51_PREFLIGHT_FAILED_DO_NOT_REPEAT_BLINDLY
exit /b %ZGR51_CODE%
