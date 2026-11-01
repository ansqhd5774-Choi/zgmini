@echo off
setlocal
cd /d "%~dp0"
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
"%ZG_QFR_NODE%" "%~dp0EARNINGS_CENSUS_QFR_R4_D1_ONCE.mjs" --dry-run
set "ZG_QFR_EXIT=%errorlevel%"
echo.
echo QFR D1 preflight finished. Result TXT is next to this CMD.
echo No remote D1 request or write was issued in dry-run mode.
pause
exit /b %ZG_QFR_EXIT%
