@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "R39_SCRIPT_DIR=%~dp0"
set "R39_NODE=E:\ZGmini\runtime\node.exe"
if not exist "%R39_NODE%" set "R39_NODE=node"
if not exist "%R39_SCRIPT_DIR%theme-nine-r39-parquet-coverage.mjs" goto missing
if not exist "%R39_SCRIPT_DIR%theme-nine-r20-approved-candidates.json" goto missing
echo ZGMINI R39 saved MarketParquet coverage (read-only)
echo Checking the approved ETF roster and 2026-10-23 / 2026-10-26 local snapshots.
echo A result TXT is written to your Windows Desktop.
"%R39_NODE%" "%R39_SCRIPT_DIR%theme-nine-r39-parquet-coverage.mjs" --inspect
set "R39_EXIT=%ERRORLEVEL%"
if not "%R39_EXIT%"=="0" echo Inspect the STOP code in the Desktop result TXT.
echo.
pause
exit /b %R39_EXIT%
:missing
echo STOP_R39_BUNDLE_INCOMPLETE
echo Extract all 3 files from the ZIP into the same folder and rerun this CMD.
echo.
pause
exit /b 2
