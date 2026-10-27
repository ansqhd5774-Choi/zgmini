@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "NODE_BIN=E:\ZGmini\runtime\node.exe"
set "SCRIPT=%~dp0scripts\pc-writer\market-calendar-r21-year-apply.mjs"
set "CANDIDATE=%~dp0staging\market-calendar\r21-census-year\scripts\pc-writer\release-calendar.mjs"
set "RESULT=%~dp0MARKET_CALENDAR_R21_CENSUS_YEAR_APPLY_CRLF_RESULT.txt"
if not exist "%NODE_BIN%" set "NODE_BIN=node.exe"
if not exist "%SCRIPT%" (
  echo R21_CRLF_INSTALLER_MISSING
  exit /b 2
)
if not exist "%CANDIDATE%" (
  echo R21_CRLF_CANDIDATE_MISSING
  exit /b 2
)
"%NODE_BIN%" "%SCRIPT%" "%RESULT%" --apply
if errorlevel 1 (
  echo R21_CRLF_REPORT_FAILED
  exit /b 2
)
findstr /C:"R21_CENSUS_YEAR_INSTALLED_NO_FORCED_COLLECTION" "%RESULT%" >nul
if errorlevel 1 (
  echo R21_CRLF_INSTALL_NOT_COMPLETED
  echo RESULT_FILE=%RESULT%
  exit /b 1
)
echo R21_CRLF_INSTALL_SUCCESS
echo RESULT_FILE=%RESULT%
exit /b 0
