@echo off
setlocal
cd /d "%~dp0"
if not exist "E:\ZGmini\runtime\node.exe" (
 echo STATUS=R58_APPROVED_NODE_MISSING_STOP
 exit /b 2
)
if not exist "%~dp0scripts\fhs-r3-private-pilot.mjs" (
 echo STATUS=R58_PACKAGE_INCOMPLETE_STOP
 exit /b 2
)
"E:\ZGmini\runtime\node.exe" "%~dp0scripts\fhs-r3-private-pilot.mjs" "E:\ZGmini\data\pc-writer" "%~dp0"
set "R58_EXIT=%ERRORLEVEL%"
echo EXIT_CODE=%R58_EXIT%
exit /b %R58_EXIT%
