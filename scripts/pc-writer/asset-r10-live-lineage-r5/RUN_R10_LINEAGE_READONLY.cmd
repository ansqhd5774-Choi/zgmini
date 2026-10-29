@echo off
setlocal EnableExtensions DisableDelayedExpansion
cd /d "%~dp0"
set "NODE_EXE=E:\ZGmini\runtime\node.exe"
set "LAUNCH_RESULT=%~dp0ASSET_R10_LINEAGE_LAUNCH_RESULT.txt"
if not exist "%NODE_EXE%" (
  >"%LAUNCH_RESULT%" echo STATUS=STOP_NODE_MISSING
  echo STOP_NODE_MISSING
  pause
  exit /b 2
)
"%NODE_EXE%" "%~dp0r10-live-lineage-readonly.mjs"
set "EXIT_CODE=%ERRORLEVEL%"
if not "%EXIT_CODE%"=="0" (
  >"%LAUNCH_RESULT%" echo STATUS=STOP_READONLY_LAUNCH
  >>"%LAUNCH_RESULT%" echo EXIT_CODE=%EXIT_CODE%
)
echo.
echo Read-only result: ASSET_R10_LINEAGE_RESULT.txt
pause
exit /b %EXIT_CODE%
