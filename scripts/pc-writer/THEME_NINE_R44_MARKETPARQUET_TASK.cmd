@echo off
setlocal DisableDelayedExpansion
set "R44_ROOT=%~dp0"
set "R44_NODE=E:\ZGmini\runtime\node.exe"
if not exist "%R44_NODE%" set "R44_NODE=node"
if not exist "%R44_ROOT%theme-nine-r44-marketparquet-task-shape.mjs" goto missing
if not exist "%R44_ROOT%theme-nine-r43-source-shape.mjs" goto missing
echo ZGMINI R44 - Existing MarketParquet ETF task source only
echo Source, task, data, API and published scores will not be changed.
"%R44_NODE%" "%R44_ROOT%theme-nine-r44-marketparquet-task-shape.mjs" --inspect
set "R44_EXIT=%ERRORLEVEL%"
echo.
if not "%R44_EXIT%"=="0" echo STOP: Do not rerun. Submit the TXT result.
if "%R44_EXIT%"=="0" echo Review masked TXT, then attach it to the chat.
pause
exit /b %R44_EXIT%
:missing
echo STOP_R44_PACKAGE_INCOMPLETE - Extract all 3 files in the same folder.
pause
exit /b 1
