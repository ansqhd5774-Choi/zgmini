@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "ZGR51_NODE=E:\ZGmini\runtime\node.exe"
set "ZGR51_SCRIPT=%~dp0scripts\pc-writer\market-calendar-r51-price-coverage.mjs"
set "ZGR51_LOG=%~dp0MARKET_CALENDAR_R51_COLLECT_LAUNCH_RESULT.txt"
if exist "%ZGR51_LOG%" (
  echo STOP=R51_COLLECT_LAUNCH_LOG_ALREADY_EXISTS
  pause
  exit /b 3
)
> "%ZGR51_LOG%" echo LAUNCH=R51_COLLECT
if not exist "%ZGR51_NODE%" (
  >> "%ZGR51_LOG%" echo STOP=R51_APPROVED_NODE_MISSING
  type "%ZGR51_LOG%"
  pause
  exit /b 3
)
if not exist "%ZGR51_SCRIPT%" (
  >> "%ZGR51_LOG%" echo STOP=R51_PACKAGE_SCRIPT_MISSING
  type "%ZGR51_LOG%"
  pause
  exit /b 3
)
"%ZGR51_NODE%" "%ZGR51_SCRIPT%" collect "E:\ZGmini\data\pc-writer" "%~dp0." >> "%ZGR51_LOG%" 2>&1
set "ZGR51_CODE=%ERRORLEVEL%"
>> "%ZGR51_LOG%" echo EXIT_CODE=%ZGR51_CODE%
type "%ZGR51_LOG%"
if not "%ZGR51_CODE%"=="0" pause
exit /b %ZGR51_CODE%
