@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "NODE_BIN=E:\ZGmini\runtime\node.exe"
set "INSTALLER=%~dp0scripts\pc-writer\market-calendar-r23-eia-apply.mjs"
set "HELPER=%~dp0scripts\pc-writer\market-calendar-r19-bea-apply.mjs"
set "PARSER=%~dp0staging\market-calendar\r23-eia\lib\release-calendar.mjs"
set "EIA=%~dp0staging\market-calendar\r23-eia\lib\eia-calendar.mjs"
set "COLLECTOR=%~dp0staging\market-calendar\r23-eia\scripts\pc-writer\release-calendar.mjs"
set "RESULT=%~dp0MARKET_CALENDAR_R23_EIA_APPLY_RESULT.txt"
if not exist "%NODE_BIN%" set "NODE_BIN=node.exe"
if not exist "%INSTALLER%" (
  echo R23_INSTALLER_MISSING
  exit /b 2
)
if not exist "%HELPER%" (
  echo R23_CORE_HELPER_MISSING
  exit /b 2
)
if not exist "%PARSER%" (
  echo R23_PARSER_MISSING
  exit /b 2
)
if not exist "%EIA%" (
  echo R23_EIA_MODULE_MISSING
  exit /b 2
)
if not exist "%COLLECTOR%" (
  echo R23_COLLECTOR_MISSING
  exit /b 2
)
"%NODE_BIN%" "%INSTALLER%" "%RESULT%" --apply
if errorlevel 1 (
  echo R23_RESULT_WRITE_FAILED
  exit /b 2
)
findstr /C:"R23_EIA_CALENDAR_INSTALLED_NO_FORCED_COLLECTION" "%RESULT%" >nul
if errorlevel 1 (
  echo R23_INSTALL_NOT_COMPLETED
  echo RESULT_FILE=%RESULT%
  exit /b 1
)
echo R23_EIA_INSTALL_SUCCESS
echo RESULT_FILE=%RESULT%
exit /b 0
