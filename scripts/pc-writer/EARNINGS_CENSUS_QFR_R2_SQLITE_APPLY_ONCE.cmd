@echo off
setlocal
cd /d "%~dp0"
set "ZG_QFR_R2_EXPECTED_SHA=232f7757e654e787a9eab49792302feb3683e5280a66ff0cc9bd7f0cbc448654"

set "ZG_QFR_R2_SETUP_ERROR="
if not exist "%~dp0EARNINGS_CENSUS_QFR_R1_READONLY.mjs" set "ZG_QFR_R2_SETUP_ERROR=QFR_R1_READONLY_MODULE_MISSING_NO_WRITE"
if not exist "%~dp0EARNINGS_CENSUS_QFR_R2_SQLITE_APPEND.mjs" set "ZG_QFR_R2_SETUP_ERROR=QFR_R2_STORE_MODULE_MISSING_NO_WRITE"
if defined ZG_QFR_R2_SETUP_ERROR goto :setup_failure

echo Census QFR manufacturing raw ZIP: approved one-time SQLite append.
echo Only preflighted ZIP SHA256 %ZG_QFR_R2_EXPECTED_SHA% will be accepted.
echo Existing SQLite schema, BLS rows, D1, website and score will NOT be changed.
echo A revised source ZIP will STOP before any database write.
echo.
choice /C YN /M "Proceed with approved CENSUS-only append"
if errorlevel 2 (
  echo RESULT=USER_CANCELLED_NO_WRITE
  pause
  exit /b 2
)

set "ZG_QFR_R2_NODE=E:\ZGmini\runtime\node.exe"
if not exist "%ZG_QFR_R2_NODE%" (
  where node >nul 2>nul
  if errorlevel 1 (
    set "ZG_QFR_R2_SETUP_ERROR=NODE_NOT_FOUND_NO_WRITE"
    goto :setup_failure
  )
  set "ZG_QFR_R2_NODE=node"
)

"%ZG_QFR_R2_NODE%" "%~dp0EARNINGS_CENSUS_QFR_R2_SQLITE_APPEND.mjs" --apply --confirm-census-qfr-sqlite-append --expected-source-sha256 "%ZG_QFR_R2_EXPECTED_SHA%"
set "ZG_QFR_R2_CODE=%errorlevel%"
echo.
echo Review EARNINGS_CENSUS_QFR_R2_STORE_RESULT_*.txt in this CMD folder.
echo A result is not confirmed until the TXT reports PASS_QFR_SQLITE_APPEND_READBACK.
pause
exit /b %ZG_QFR_R2_CODE%

:setup_failure
set "ZG_QFR_R2_DIAG=%~dp0EARNINGS_CENSUS_QFR_R2_STORE_RESULT_SETUP_%RANDOM%_%RANDOM%.txt"
(
  echo EARNINGS_CENSUS_QFR_R2_SQLITE_APPEND
  echo MODE=DEPENDENCY_PREFLIGHT_NO_WRITE
  echo ERROR=%ZG_QFR_R2_SETUP_ERROR%
  echo SQLITE_COMMITTED=NO
  echo RAW_ZIP_ARCHIVED_IN_EXISTING_SQLITE=NO
  echo D1_WRITES=0
  echo SCORE_WRITES=0
  echo RESULT=FAIL_NO_COMMIT
) > "%ZG_QFR_R2_DIAG%"
echo ERROR=%ZG_QFR_R2_SETUP_ERROR%
echo Required source files must be next to this CMD.
echo Diagnostic TXT: "%ZG_QFR_R2_DIAG%"
pause
exit /b 2
