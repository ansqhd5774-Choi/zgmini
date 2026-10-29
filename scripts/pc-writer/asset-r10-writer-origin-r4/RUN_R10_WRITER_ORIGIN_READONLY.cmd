@echo off
setlocal DisableDelayedExpansion
cd /d "%~dp0"
where node.exe >nul 2>nul
if errorlevel 1 (
  echo STATUS=STOP_NODE_NOT_FOUND
  pause
  exit /b 2
)
node.exe "%~dp0r10-writer-origin-readonly.mjs"
set "R10_RESULT=%ERRORLEVEL%"
echo.
echo RESULT=ASSET_R10_WRITER_ORIGIN_RESULT.txt
echo Please return the result TXT only. Do not run INSTALL.
pause
exit /b %R10_RESULT%
