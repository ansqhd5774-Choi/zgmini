@echo off
setlocal
cd /d "%~dp0"
set "NODE=E:\ZGmini\runtime\node.exe"
if not exist "%NODE%" (
 echo R40_NODE_RUNTIME_NOT_FOUND
 exit /b 2
)
"%NODE%" "%~dp0market-calendar-r40-overlap-audit.mjs"
exit /b %ERRORLEVEL%
