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
"%ZG_QFR_NODE%" "%~dp0EARNINGS_CENSUS_QFR_R1_READONLY.mjs" --dry-run
set "ZG_QFR_RESULT=%errorlevel%"
echo.
echo Read-only Census QFR check finished. Result TXT is next to this CMD.
echo No database, website or score was updated.
pause
exit /b %ZG_QFR_RESULT%
