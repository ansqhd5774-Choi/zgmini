@echo off
setlocal
set "SCRIPT_DIR=%~dp0"
set "NODE_EXE=node"
if exist "E:\ZGmini\runtime\node.exe" set "NODE_EXE=E:\ZGmini\runtime\node.exe"
if "%~1"=="" (
  "%NODE_EXE%" "%SCRIPT_DIR%stage05-fusion-readonly.mjs" --audit-existing-live --output-dir "%SCRIPT_DIR%"
) else (
  "%NODE_EXE%" "%SCRIPT_DIR%stage05-fusion-readonly.mjs" %*
)
set "RUN_RESULT=%ERRORLEVEL%"
if "%RUN_RESULT%"=="2" echo Stage05: source coverage checked; final S5 remains NULL due to missing verified inputs.
if not "%RUN_RESULT%"=="0" if not "%RUN_RESULT%"=="2" echo Stage05: execution error %RUN_RESULT%.
exit /b %RUN_RESULT%
