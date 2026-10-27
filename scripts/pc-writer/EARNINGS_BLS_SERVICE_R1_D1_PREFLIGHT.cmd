@echo off
setlocal
cd /d "%~dp0"
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
"%ZG_SERVICE_NODE%" "%~dp0EARNINGS_BLS_SERVICE_R1_D1_ONCE.mjs" --dry-run
set "ZG_SERVICE_RESULT=%errorlevel%"
echo.
echo Read-only D1 preflight finished. TXT is next to this CMD.
echo No remote D1 request or write was issued.
pause
exit /b %ZG_SERVICE_RESULT%
