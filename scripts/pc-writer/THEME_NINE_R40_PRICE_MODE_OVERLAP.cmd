@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "R40_BUNDLE=%~dp0"
set "R40_NODE=E:\ZGmini\runtime\node.exe"
if not exist "%R40_NODE%" set "R40_NODE=node"
if not exist "%R40_BUNDLE%theme-nine-r40-price-mode-overlap.mjs" goto missing
if not exist "%R40_BUNDLE%theme-nine-r39-parquet-coverage.mjs" goto missing
if not exist "%R40_BUNDLE%theme-nine-r25-approved-selector.mjs" goto missing
if not exist "%R40_BUNDLE%theme-nine-r20-approved-candidates.json" goto missing
echo ZGMINI R40 saved-source price-mode comparison (read-only)
echo R23 1h NY proxy vs verified MarketParquet EOD split-adjusted.
echo A result TXT is saved next to this CMD. No collection or publication.
"%R40_NODE%" "%R40_BUNDLE%theme-nine-r40-price-mode-overlap.mjs" --inspect
set "R40_EXIT=%ERRORLEVEL%"
echo.
if not "%R40_EXIT%"=="0" echo See the STOP code in the result TXT.
pause
exit /b %R40_EXIT%
:missing
echo STOP_R40_BUNDLE_INCOMPLETE
echo Extract all 5 files from the ZIP into the same folder.
echo.
pause
exit /b 2
