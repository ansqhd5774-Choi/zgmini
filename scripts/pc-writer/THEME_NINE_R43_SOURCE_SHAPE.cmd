@echo off
setlocal DisableDelayedExpansion
set "R43_ROOT=%~dp0"
set "R43_NODE=E:\ZGmini\runtime\node.exe"
if not exist "%R43_NODE%" set "R43_NODE=node"
if not exist "%R43_ROOT%theme-nine-r43-source-shape.mjs" goto missing
echo ZGMINI R43 - Existing PC source structure only
echo Source files and scheduled tasks will NOT be changed.
"%R43_NODE%" "%R43_ROOT%theme-nine-r43-source-shape.mjs" --inspect
set "R43_EXIT=%ERRORLEVEL%"
echo.
if not "%R43_EXIT%"=="0" echo STOP: Do not rerun; provide the generated TXT result.
if "%R43_EXIT%"=="0" echo Check TXT before sharing. It contains masked non-executable source structure.
pause
exit /b %R43_EXIT%
:missing
echo STOP_R43_PACKAGE_INCOMPLETE - Keep the CMD and MJS in one folder.
pause
exit /b 1
