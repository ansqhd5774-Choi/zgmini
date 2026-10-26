@echo off
setlocal EnableExtensions DisableDelayedExpansion
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo NODE_NOT_FOUND. Install Node.js 24 or newer.
  pause
  exit /b 1
)
node "%~dp0EARNINGS_R3A_PARITY_REUSE_READONLY.mjs"
set "zg_exit=%ERRORLEVEL%"
echo.
if "%zg_exit%"=="0" (
  echo R3A parity/reuse check completed. Upload the TXT from this folder.
) else (
  echo R3A parity/reuse check incomplete. Upload the TXT for diagnosis.
)
pause
exit /b %zg_exit%
