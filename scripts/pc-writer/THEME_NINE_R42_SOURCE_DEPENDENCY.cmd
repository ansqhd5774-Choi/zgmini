@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "R42_BUNDLE=%~dp0"
set "R42_NODE=E:\ZGmini\runtime\node.exe"
if not exist "%R42_NODE%" set "R42_NODE=node"
if not exist "%R42_BUNDLE%theme-nine-r42-source-dependency-audit.mjs" goto missing
if not exist "%R42_BUNDLE%theme-nine-r20-approved-candidates.json" goto missing
echo ZGMINI R42 PC collector source references (read-only)
echo No collection, source execution, database writes, scheduling changes or publishing.
"%R42_NODE%" "%R42_BUNDLE%theme-nine-r42-source-dependency-audit.mjs" --inspect
set "R42_EXIT=%ERRORLEVEL%"
echo.
if not "%R42_EXIT%"=="0" echo STOP result TXT created. Do not rerun before review.
pause
exit /b %R42_EXIT%
:missing
echo STOP_R42_BUNDLE_INCOMPLETE - Extract ALL THREE files from ZIP.
pause
exit /b 2
