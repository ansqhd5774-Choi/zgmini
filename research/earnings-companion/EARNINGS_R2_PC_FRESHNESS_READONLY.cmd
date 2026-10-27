@echo off
setlocal EnableExtensions DisableDelayedExpansion
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  >"%~dp0EARNINGS_R2_PC_FRESHNESS_PRECHECK_ERROR.txt" echo NODE_NOT_FOUND. Requires Node.js 24 or newer.
  echo Node.js missing. See PRECHECK_ERROR.txt next to this CMD.
  pause
  exit /b 1
)
node "%~dp0EARNINGS_R2_PC_FRESHNESS_READONLY.mjs"
set "RUN_EXIT=%ERRORLEVEL%"
echo.
echo Send EARNINGS_R2_PC_FRESHNESS_RESULT_*.txt to ChatGPT.
pause
exit /b %RUN_EXIT%
