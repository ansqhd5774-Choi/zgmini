@echo off
setlocal
cd /d "%~dp0"
echo WARNING: This can write the independent Census QFR D1 key.
echo Requires clean tracked main publisher and separately approved PC operational source.
set /p "ZG_QFR_APPROVAL=Type APPLY to continue: "
if /I not "%ZG_QFR_APPROVAL%"=="APPLY" (
  echo RESULT=CANCELLED_NO_D1_WRITE
  pause
  exit /b 2
)
set "ZG_QFR_NODE=E:\ZGmini\runtime\node.exe"
if not exist "%ZG_QFR_NODE%" (
  where node >nul 2>nul
  if errorlevel 1 (
    echo ERROR=NODE_NOT_FOUND
    pause
    exit /b 2
  )
  set "ZG_QFR_NODE=node"
)
"%ZG_QFR_NODE%" "%~dp0EARNINGS_CENSUS_QFR_R4_D1_ONCE.mjs" --apply --confirm-census-qfr-d1-write
set "ZG_QFR_EXIT=%errorlevel%"
echo.
echo QFR D1 result TXT is next to this CMD. Check D1_READBACK.
pause
exit /b %ZG_QFR_EXIT%
