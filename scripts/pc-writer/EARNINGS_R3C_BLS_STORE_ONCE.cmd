@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo ERROR=NODE_NOT_FOUND
  echo Install or configure Node.js 22.13+ before running.
  pause
  exit /b 2
)
if not exist "%~dp0EARNINGS_R3C_BLS_STORE_ONCE.mjs" (
  echo ERROR=COMPANION_MJS_NOT_FOUND
  pause
  exit /b 2
)
node "%~dp0EARNINGS_R3C_BLS_STORE_ONCE.mjs"
set "R3C_EXIT=%errorlevel%"
echo.
echo The TXT result file was created next to this CMD file.
echo Upload that TXT result file to ChatGPT for review.
pause
exit /b %R3C_EXIT%
