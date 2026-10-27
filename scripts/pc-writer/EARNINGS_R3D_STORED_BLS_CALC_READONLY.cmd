@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo ERROR=NODE_NOT_FOUND
  pause
  exit /b 2
)
if not exist "%~dp0EARNINGS_R3D_STORED_BLS_CALC_READONLY.mjs" (
  echo ERROR=COMPANION_MJS_NOT_FOUND
  pause
  exit /b 2
)
node "%~dp0EARNINGS_R3D_STORED_BLS_CALC_READONLY.mjs"
set "R3D_EXIT=%errorlevel%"
echo.
echo Upload the newly generated EARNINGS_R3D_STORED_BLS_CALC_RESULT_*.txt next to this CMD to ChatGPT.
pause
exit /b %R3D_EXIT%
