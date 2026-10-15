@echo off
chcp 65001 >nul
setlocal EnableExtensions EnableDelayedExpansion

set "BASE=%USERPROFILE%\.zgmini\pc-writer"
set "LOG=%BASE%\ZGMINI-sector-fear-greed-r21320-alpaca-benchmark-backfill-log.txt"
set "REPORT=%BASE%\local-sector-fear-greed-r21320-alpaca-benchmark-backfill.txt"

if not exist "%BASE%" mkdir "%BASE%" >nul 2>&1
> "%LOG%" echo ============================================================
>>"%LOG%" echo ZGMINI SECTOR FEAR ^& GREED R2.13.20
>>"%LOG%" echo APPROVED ALPACA BENCHMARK BACKFILL
>>"%LOG%" echo STARTED=%DATE% %TIME%
>>"%LOG%" echo ============================================================
>>"%LOG%" echo [SCOPE]
>>"%LOG%" echo PROVIDER=ALPACA_ONLY
>>"%LOG%" echo MAX_PROVIDER_REQUESTS=1
>>"%LOG%" echo SYMBOLS=SPY_PLUS_11_SECTOR_ETFS
>>"%LOG%" echo WINDOW=2023-07-12..2023-09-29
>>"%LOG%" echo FEED=iex
>>"%LOG%" echo ADJUSTMENT=split
>>"%LOG%" echo STORAGE=LOCAL_SHADOW_FILE_ONLY
>>"%LOG%" echo PUBLIC_MUTATION=NO
>>"%LOG%" echo D1_MUTATION=NO
>>"%LOG%" echo DB_SCHEMA_CHANGE=NO
>>"%LOG%" echo PRODUCTION_FORMULA_CHANGE=NO
>>"%LOG%" echo REFERENCE_REQUIREMENT_CHANGE=NO
>>"%LOG%" echo APPROVED_R1_REFERENCE=756_UNCHANGED
>>"%LOG%" echo PRODUCTION_BENCHMARK_SOURCE_CHANGE=NO
>>"%LOG%" echo.

echo [1/2] R2.13.20 dedicated tests
node --test tests\sector-fear-greed-r21320-alpaca-benchmark-backfill.test.mjs >>"%LOG%" 2>&1
set "TEST_EXIT=!ERRORLEVEL!"
>>"%LOG%" echo TEST_EXIT=!TEST_EXIT!
if not "!TEST_EXIT!"=="0" goto :FAIL

echo [2/2] Approved Alpaca benchmark backfill
node scripts\pc-writer\sector-fear-greed-r21320-alpaca-benchmark-backfill.mjs >>"%LOG%" 2>&1
set "RUNTIME_EXIT=!ERRORLEVEL!"
>>"%LOG%" echo RUNTIME_EXIT=!RUNTIME_EXIT!
if not "!RUNTIME_EXIT!"=="0" goto :FAIL

if exist "%REPORT%" (
  >>"%LOG%" echo.
  >>"%LOG%" echo ============================================================
  >>"%LOG%" echo [R21320_REPORT]
  >>"%LOG%" echo ============================================================
  type "%REPORT%" >>"%LOG%" 2>&1
) else (
  >>"%LOG%" echo REPORT_MISSING=%REPORT%
  goto :FAIL
)

>>"%LOG%" echo.
>>"%LOG%" echo STATUS=SHADOW_R21320_ALPACA_BENCHMARK_BACKFILL_COMPLETE
>>"%LOG%" echo FINAL_EXIT_CODE=0
echo R2.13.20 COMPLETE
exit /b 0

:FAIL
>>"%LOG%" echo.
>>"%LOG%" echo STATUS=FAILED_OR_STOPPED
>>"%LOG%" echo FINAL_EXIT_CODE=1
>>"%LOG%" echo NOTE=DO_NOT_RERUN_BLINDLY_CHECK_LOCAL_STORAGE_AND_LOG_FIRST
echo R2.13.20 FAILED OR STOPPED
exit /b 1
