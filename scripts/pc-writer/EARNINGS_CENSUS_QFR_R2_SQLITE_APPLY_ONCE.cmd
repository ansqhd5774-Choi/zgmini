@echo off
setlocal
cd /d "%~dp0"
set "ZG_QFR_R2_EXPECTED_SHA=232f7757e654e787a9eab49792302feb3683e5280a66ff0cc9bd7f0cbc448654"

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
    echo ERROR=NODE_NOT_FOUND_NO_WRITE
    pause
    exit /b 2
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
