@echo off
setlocal EnableExtensions DisableDelayedExpansion
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo NODE_NOT_FOUND. Install Node.js 24 or newer.
  pause
  exit /b 1
)
node "%~dp0EARNINGS_R3A_PC_LINEAGE_READONLY.mjs"
set "zg_exit=%ERRORLEVEL%"
echo.
if "%zg_exit%"=="0" (
  echo R3A read-only inspection finished. Upload the TXT file in this folder.
) else (
  echo R3A inspection incomplete. Upload the TXT file for diagnosis.
)
pause
exit /b %zg_exit%
