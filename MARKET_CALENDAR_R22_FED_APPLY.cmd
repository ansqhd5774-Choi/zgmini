@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "NODE_BIN=E:\ZGmini\runtime\node.exe"
set "SCRIPT=%~dp0scripts\pc-writer\market-calendar-r22-fed-apply.mjs"
set "PARSER=%~dp0staging\market-calendar\r22-fed-calendar\lib\release-calendar.mjs"
set "COLLECTOR=%~dp0staging\market-calendar\r22-fed-calendar\scripts\pc-writer\release-calendar.mjs"
set "RESULT=%~dp0MARKET_CALENDAR_R22_FED_APPLY_RESULT.txt"
if not exist "%NODE_BIN%" set "NODE_BIN=node.exe"
if not exist "%SCRIPT%" (
  echo R22_INSTALLER_MISSING
  exit /b 2
)
if not exist "%PARSER%" (
  echo R22_PARSER_MISSING
  exit /b 2
)
if not exist "%COLLECTOR%" (
  echo R22_COLLECTOR_MISSING
  exit /b 2
)
"%NODE_BIN%" "%SCRIPT%" "%RESULT%" --apply
if errorlevel 1 (
  echo R22_REPORT_FAILED
  exit /b 2
)
findstr /C:"R22_FED_CALENDAR_INSTALLED_NO_FORCED_COLLECTION" "%RESULT%" >nul
if errorlevel 1 (
  echo R22_INSTALL_NOT_COMPLETED
  echo RESULT_FILE=%RESULT%
  exit /b 1
)
echo R22_FED_INSTALL_SUCCESS
echo RESULT_FILE=%RESULT%
exit /b 0
