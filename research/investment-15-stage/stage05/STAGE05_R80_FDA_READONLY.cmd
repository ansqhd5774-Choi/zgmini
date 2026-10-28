@echo off
setlocal
set "SCRIPT_DIR=%~dp0"
set "NODE_EXE=node"
if exist "E:\ZGmini\runtime\node.exe" set "NODE_EXE=E:\ZGmini\runtime\node.exe"
"%NODE_EXE%" "%SCRIPT_DIR%stage05-fusion-readonly.mjs" --audit-fda-growth-live --output-dir "%SCRIPT_DIR%"
set "RUN_RESULT=%ERRORLEVEL%"
if "%RUN_RESULT%"=="2" echo Stage05 R80: FDA source check finished. Research-only growth; official M4 and S5 remain NULL.
if not "%RUN_RESULT%"=="2" echo Stage05 R80: source check did not complete. Return code %RUN_RESULT%.
exit /b %RUN_RESULT%
