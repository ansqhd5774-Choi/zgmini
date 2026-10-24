@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "SCRIPT=%~dp0theme-biotech-r8-auth-bridge-apply.mjs"
set "NODE_EXE=E:\ZGmini\runtime\node.exe"
set "LOG=%~dp0BIOTECH_R8_AUTH_BRIDGE_LOG.txt"
if not exist "%SCRIPT%" exit /b 3
if not exist "%NODE_EXE%" exit /b 4
> "%LOG%" echo REPORT=BIOTECH_R8_APPROVED_SEVEN_AUTH_BRIDGE
"%NODE_EXE%" "%SCRIPT%" --apply >> "%LOG%" 2>&1
set "CODE=%ERRORLEVEL%"
>> "%LOG%" echo CMD_EXIT_CODE=%CODE%
exit /b %CODE%
