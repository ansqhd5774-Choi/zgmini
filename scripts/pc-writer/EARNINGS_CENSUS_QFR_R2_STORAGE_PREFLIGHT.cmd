@echo off
setlocal
cd /d "%~dp0"
set "ZG_QFR_R2_NODE=E:\ZGmini\runtime\node.exe"
if not exist "%ZG_QFR_R2_NODE%" (
  where node >nul 2>nul
  if errorlevel 1 (
    echo ERROR=NODE_NOT_FOUND
    pause
    exit /b 2
  )
  set "ZG_QFR_R2_NODE=node"
)
"%ZG_QFR_R2_NODE%" "%~dp0EARNINGS_CENSUS_QFR_R2_SQLITE_APPEND.mjs" --dry-run
set "ZG_QFR_R2_CODE=%errorlevel%"
echo.
echo Census QFR storage compatibility preflight complete.
echo Check EARNINGS_CENSUS_QFR_R2_STORE_RESULT_*.txt in this folder.
echo This CMD NEVER writes SQLite, D1, score or website.
pause
exit /b %ZG_QFR_R2_CODE%
