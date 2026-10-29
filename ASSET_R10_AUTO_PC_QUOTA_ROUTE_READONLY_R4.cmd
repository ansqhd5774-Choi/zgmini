@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "NODE_EXE=E:\ZGmini\runtime\node.exe"
set "SCRIPT=%~dp0ASSET_R10_AUTO_PC_QUOTA_ROUTE_READONLY_R4.mjs"
set "RESULT=%~dp0ASSET_R10_AUTO_PC_QUOTA_R4_RESULT_%RANDOM%.txt"
if not exist "%NODE_EXE%" (
  echo FINAL_STATUS=STOP_NODE_MISSING
  pause
  exit /b 2
)
"%NODE_EXE%" "%SCRIPT%" > "%RESULT%" 2>&1
set "EXIT_CODE=%ERRORLEVEL%"
type "%RESULT%"
echo.
echo RESULT_FILE=%RESULT%
echo EXIT_CODE=%EXIT_CODE%
pause
exit /b %EXIT_CODE%
