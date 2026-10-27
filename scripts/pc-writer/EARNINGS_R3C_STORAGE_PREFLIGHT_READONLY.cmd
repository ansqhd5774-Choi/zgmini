@echo off
setlocal EnableExtensions DisableDelayedExpansion
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo NODE_NOT_FOUND. Node.js 24 or newer is required.
  pause
  exit /b 1
)
node "%~dp0EARNINGS_R3C_STORAGE_PREFLIGHT_READONLY.mjs"
set "zg_r3c_exit=%ERRORLEVEL%"
echo.
if "%zg_r3c_exit%"=="0" (
  echo R3C storage preflight finished. Upload the TXT file next to this CMD.
) else (
  echo R3C storage preflight incomplete. Upload the TXT for diagnosis.
)
pause
exit /b %zg_r3c_exit%
