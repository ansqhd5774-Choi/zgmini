@echo off
setlocal EnableExtensions DisableDelayedExpansion
cd /d "%~dp0"
set "NODE=E:\ZGmini\runtime\node.exe"
if not exist "%NODE%" (
  >"%~dp0ASSET_R10_WRITER_ORIGIN_LAUNCH_RESULT.txt" echo STATUS=STOP_PINNED_NODE_MISSING
  echo STATUS=STOP_PINNED_NODE_MISSING
  echo RESULT=ASSET_R10_WRITER_ORIGIN_LAUNCH_RESULT.txt
  pause
  exit /b 2
)
"%NODE%" --version >nul 2>nul
if errorlevel 1 (
  >"%~dp0ASSET_R10_WRITER_ORIGIN_LAUNCH_RESULT.txt" echo STATUS=STOP_PINNED_NODE_INCOMPATIBLE
  echo STATUS=STOP_PINNED_NODE_INCOMPATIBLE
  echo RESULT=ASSET_R10_WRITER_ORIGIN_LAUNCH_RESULT.txt
  pause
  exit /b 2
)
"%NODE%" "%~dp0r10-writer-origin-readonly.mjs"
set "R10_RESULT=%ERRORLEVEL%"
echo.
echo RESULT=ASSET_R10_WRITER_ORIGIN_RESULT.txt
echo Please return the result TXT only. Do not run INSTALL.
pause
exit /b %R10_RESULT%
