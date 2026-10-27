@echo off
setlocal
cd /d "%~dp0"
echo CAUTION: This writes a new WPSFD42-only D1 snapshot after approved deployment.
echo Do not run without explicit owner approval and confirmed PC source gates.
set /p "ZG_SERVICE_APPROVE=Type APPLY to continue: "
if /I not "%ZG_SERVICE_APPROVE%"=="APPLY" (
  echo RESULT=CANCELLED_NO_D1_WRITE
  pause
  exit /b 2
)
set "ZG_SERVICE_NODE=E:\ZGmini\runtime\node.exe"
if not exist "%ZG_SERVICE_NODE%" (
  where node >nul 2>nul
  if errorlevel 1 (
    echo ERROR=NODE_NOT_FOUND
    pause
    exit /b 2
  )
  set "ZG_SERVICE_NODE=node"
)
"%ZG_SERVICE_NODE%" "%~dp0EARNINGS_BLS_SERVICE_R1_D1_ONCE.mjs" --apply --confirm-earnings-c-service-d1-write
set "ZG_SERVICE_RESULT=%errorlevel%"
echo.
echo D1 result TXT is next to this CMD. Check READBACK result.
pause
exit /b %ZG_SERVICE_RESULT%
