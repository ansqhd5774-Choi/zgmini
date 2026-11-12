@echo off
setlocal
set "NODE_EXE=E:\ZGmini\runtime\node.exe"
if not exist "%NODE_EXE%" set "NODE_EXE=node"
"%NODE_EXE%" "%~dp0theme-quantum-readiness-r2.mjs"
set "RUN_RESULT=%ERRORLEVEL%"
echo.
echo REPORT: "%~dp0QUANTUM_R2_READONLY_RESULT.json"
echo EXIT_CODE: %RUN_RESULT%
pause
exit /b %RUN_RESULT%
