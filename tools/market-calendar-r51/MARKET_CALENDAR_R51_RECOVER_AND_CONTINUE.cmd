@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "ZGR51_NODE=E:\ZGmini\runtime\node.exe"
set "ZGR51_SCRIPT=%~dp0scripts\pc-writer\market-calendar-r51-resume.mjs"
echo [R51] Existing stored rows will be preserved.
echo [R51] Recovery progress appears here. Please keep this window open.
if not exist "%ZGR51_NODE%" (
  echo STOP=R51_APPROVED_NODE_MISSING
  pause
  exit /b 3
)
if not exist "%ZGR51_SCRIPT%" (
  echo STOP=R51_RECOVERY_SCRIPT_MISSING
  pause
  exit /b 3
)
"%ZGR51_NODE%" "%ZGR51_SCRIPT%" "%~dp0."
set "ZGR51_CODE=%ERRORLEVEL%"
echo.
echo [R51] EXIT_CODE=%ZGR51_CODE%
echo [R51] Upload only MARKET_CALENDAR_R51_LATEST_RESULT.txt.
echo [R51] Collection is separate from market capitalization and public stars.
pause
exit /b %ZGR51_CODE%
