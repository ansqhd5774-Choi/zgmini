@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "NODE_BIN=E:\ZGmini\runtime\node.exe"
set "SCRIPT=%~dp0scripts\pc-writer\market-calendar-r20-census-apply.mjs"
set "CANDIDATE=%~dp0staging\market-calendar\r20-census\lib\release-calendar.mjs"
set "RESULT=%~dp0MARKET_CALENDAR_R20_CENSUS_APPLY_RESULT.txt"
if not exist "%NODE_BIN%" set "NODE_BIN=node.exe"
if not exist "%SCRIPT%" (
  echo R20_SCRIPT_MISSING
  exit /b 2
)
if not exist "%CANDIDATE%" (
  echo R20_CENSUS_PARSER_MISSING
  exit /b 2
)
"%NODE_BIN%" "%SCRIPT%" "%RESULT%" --apply
if errorlevel 1 (
  echo R20_REPORT_FAILED
  exit /b 2
)
findstr /C:"CENSUS_INSTALLED_IN_EXISTING_PC_SOURCE_NO_FORCED_COLLECTION" "%RESULT%" >nul
if errorlevel 1 (
  echo R20_INSTALL_NOT_COMPLETED
  echo RESULT_FILE=%RESULT%
  exit /b 1
)
echo R20_INSTALL_SUCCESS
echo RESULT_FILE=%RESULT%
exit /b 0
