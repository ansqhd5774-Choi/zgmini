@echo off
setlocal
cd /d "%~dp0"
if not exist "E:\ZGmini\runtime\node.exe" (
  echo R48_NODE_NOT_FOUND_STOP
  pause
  exit /b 1
)
if exist "%~dp0MARKET_CALENDAR_R48_OFFLINE_QUALITY_RESULT.txt" (
  echo R48_RESULT_ALREADY_EXISTS_STOP
  pause
  exit /b 2
)
set "R48_SCRIPT=%~dp0market-calendar-r48-quality-readonly.mjs"
if not exist "%R48_SCRIPT%" set "R48_SCRIPT=%~dp0scripts\pc-writer\market-calendar-r48-quality-readonly.mjs"
if not exist "%R48_SCRIPT%" (
  echo R48_SCRIPT_NOT_FOUND_STOP
  pause
  exit /b 3
)
"E:\ZGmini\runtime\node.exe" "%R48_SCRIPT%" "E:\ZGmini\data\pc-writer" "%~dp0."
set "RC=%ERRORLEVEL%"
echo.
echo Result: %~dp0MARKET_CALENDAR_R48_OFFLINE_QUALITY_RESULT.txt
if not "%RC%"=="0" echo Stop: do not retry; send the result or error.
pause
exit /b %RC%
