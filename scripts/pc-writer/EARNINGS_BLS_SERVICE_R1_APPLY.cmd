@echo off
setlocal
cd /d "%~dp0"
set "ZG_NODE=E:\ZGmini\runtime\node.exe"
if not exist "%ZG_NODE%" (
  where node >nul 2>nul
  if errorlevel 1 (
    echo ERROR=NODE_NOT_FOUND
    pause
    exit /b 2
  )
  set "ZG_NODE=node"
)
if not exist "%~dp0EARNINGS_R3C_BLS_STORE_ONCE.mjs" (
  echo ERROR=COLLECTOR_NOT_FOUND
  pause
  exit /b 2
)
echo This will append the new BLS WPSFD42 source only
echo to the approved existing PC SQLite. No tables or D1 will be modified.
echo Run only after the preflight TXT and operational source are approved.
set /p "ZG_SERVICE_APPROVAL=Type APPLY to append existing SQLite: "
if /I not "%ZG_SERVICE_APPROVAL%"=="APPLY" (
  echo RESULT=CANCELLED_NO_WRITE
  pause
  exit /b 3
)
"%ZG_NODE%" "%~dp0EARNINGS_R3C_BLS_STORE_ONCE.mjs" --services-only --apply --confirm-service-sqlite-append
set "ZG_SERVICE_RC=%errorlevel%"
echo.
echo Result TXT is next to this CMD. D1 and Production were not touched.
pause
exit /b %ZG_SERVICE_RC%
