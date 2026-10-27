@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "R41_BUNDLE=%~dp0"
set "R41_NODE=E:\ZGmini\runtime\node.exe"
if not exist "%R41_NODE%" set "R41_NODE=node"
if not exist "%R41_BUNDLE%theme-nine-r41-existing-cycle-audit.mjs" goto missing
if not exist "%R41_BUNDLE%theme-nine-r20-approved-candidates.json" goto missing
echo ZGMINI R41 existing PC collector audit (read-only)
echo No API calls, recalculation, scheduler edits, database writes, or publication.
"%R41_NODE%" "%R41_BUNDLE%theme-nine-r41-existing-cycle-audit.mjs" --inspect
set "R41_EXIT=%ERRORLEVEL%"
echo.
if not "%R41_EXIT%"=="0" echo See STOP code in TXT; do not retry until reviewed.
pause
exit /b %R41_EXIT%
:missing
echo STOP_R41_BUNDLE_INCOMPLETE
echo Extract all 3 files from ZIP into one folder.
pause
exit /b 2
