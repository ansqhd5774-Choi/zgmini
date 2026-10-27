@echo off
setlocal
cd /d "%~dp0"
set "ZG_QFR_R3_SETUP_ERROR="
if not exist "%~dp0EARNINGS_CENSUS_QFR_R1_READONLY.mjs" set "ZG_QFR_R3_SETUP_ERROR=QFR_R1_READONLY_MODULE_MISSING_NO_WRITE"
if not exist "%~dp0EARNINGS_CENSUS_QFR_R2_SQLITE_APPEND.mjs" set "ZG_QFR_R3_SETUP_ERROR=QFR_R2_STORE_MODULE_MISSING_NO_WRITE"
if not exist "%~dp0EARNINGS_CENSUS_QFR_R3_STORED_PREVIEW_READONLY.mjs" set "ZG_QFR_R3_SETUP_ERROR=QFR_R3_PREVIEW_MODULE_MISSING_NO_WRITE"
if defined ZG_QFR_R3_SETUP_ERROR goto :setup_failure

set "ZG_QFR_R3_NODE=E:\ZGmini\runtime\node.exe"
if not exist "%ZG_QFR_R3_NODE%" (
  where node >nul 2>nul
  if errorlevel 1 (
    set "ZG_QFR_R3_SETUP_ERROR=NODE_NOT_FOUND_NO_WRITE"
    goto :setup_failure
  )
  set "ZG_QFR_R3_NODE=node"
)

echo Read-only Census QFR proof from existing PC SQLite raw ZIP.
echo No Census HTTP request, no PC database write, no D1 or score change.
"%ZG_QFR_R3_NODE%" "%~dp0EARNINGS_CENSUS_QFR_R3_STORED_PREVIEW_READONLY.mjs"
set "ZG_QFR_R3_EXIT=%errorlevel%"
echo.
echo Review EARNINGS_CENSUS_QFR_R3_STORED_RESULT_*.txt beside this CMD.
pause
exit /b %ZG_QFR_R3_EXIT%

:setup_failure
set "ZG_QFR_R3_DIAG=%~dp0EARNINGS_CENSUS_QFR_R3_STORED_RESULT_SETUP_%RANDOM%_%RANDOM%.txt"
(
  echo EARNINGS_CENSUS_QFR_R3_STORED_PREVIEW_READONLY
  echo MODE=DEPENDENCY_PREFLIGHT_NO_WRITE
  echo ERROR=%ZG_QFR_R3_SETUP_ERROR%
  echo PC_SQLITE_WRITES=0
  echo D1_WRITES=0
  echo SCORE_WRITES=0
  echo RESULT=FAIL_QFR_STORED_PREVIEW_NO_WRITE
) > "%ZG_QFR_R3_DIAG%"
echo ERROR=%ZG_QFR_R3_SETUP_ERROR%
echo Check all three MJS files next to this CMD.
echo Diagnostic TXT: "%ZG_QFR_R3_DIAG%"
pause
exit /b 2
