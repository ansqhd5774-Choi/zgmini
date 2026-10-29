@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "NODE_EXE=E:\ZGmini\runtime\node.exe"
set "HELPER=%~dp0scripts\pc-writer\theme-config-package-runner.mjs"
if not exist "%NODE_EXE%" goto MISSING_NODE
if not exist "%HELPER%" goto MISSING_HELPER
"%NODE_EXE%" "%HELPER%" --install
set "RUN_RC=%ERRORLEVEL%"
echo.
echo Check PACKAGE_RESULT.txt in this extracted folder.
echo INSTALL exit code: %RUN_RC%
pause
exit /b %RUN_RC%
:MISSING_NODE
echo STOP: approved E: Node runtime not found. Do not reinstall or retry.
pause
exit /b 2
:MISSING_HELPER
echo STOP: package helper missing. Do not retry this package.
pause
exit /b 2
