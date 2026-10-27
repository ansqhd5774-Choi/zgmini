@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo ERROR=NODE_NOT_FOUND
  pause
  exit /b 2
)
if not exist "%~dp0EARNINGS_R4_C_READ_MODEL_PREVIEW_READONLY.mjs" (
  echo ERROR=R4_MJS_NOT_FOUND
  pause
  exit /b 2
)
if not exist "%~dp0EARNINGS_R3D_STORED_BLS_CALC_READONLY.mjs" (
  echo ERROR=R3D_VALIDATOR_MJS_NOT_FOUND
  pause
  exit /b 2
)
node "%~dp0EARNINGS_R4_C_READ_MODEL_PREVIEW_READONLY.mjs"
set "R4_EXIT=%errorlevel%"
echo.
echo Upload both newly generated EARNINGS_R4_C_READ_MODEL_PREVIEW_RESULT_*.txt and *.json to ChatGPT.
pause
exit /b %R4_EXIT%
