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
"%ZG_NODE%" "%~dp0EARNINGS_R3C_BLS_STORE_ONCE.mjs" --services-only --dry-run
set "ZG_SERVICE_RC=%errorlevel%"
echo.
echo Read-only preflight finished. Result TXT is next to this CMD.
echo No PC SQLite or D1 write was requested.
pause
exit /b %ZG_SERVICE_RC%
