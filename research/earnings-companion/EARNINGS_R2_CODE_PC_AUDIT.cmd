@echo off
setlocal EnableExtensions DisableDelayedExpansion
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  >"%~dp0EARNINGS_R2_CODE_PC_AUDIT_PRECHECK_ERROR.txt" echo NODE_NOT_FOUND. Requires Node.js 24 or newer.
  echo Node.js 24 or newer not found. Check PRECHECK_ERROR.txt next to this CMD.
  pause
  exit /b 1
)
node "%~dp0EARNINGS_R2_CODE_PC_AUDIT.mjs"
set "AUDIT_EXIT=%ERRORLEVEL%"
echo.
echo Send only EARNINGS_R2_CODE_PC_AUDIT_RESULT_*.txt to ChatGPT.
pause
exit /b %AUDIT_EXIT%
