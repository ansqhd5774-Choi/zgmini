@echo off
setlocal EnableExtensions EnableDelayedExpansion

set "BASE=%USERPROFILE%\.zgmini\pc-writer"
set "LOG=%BASE%\ZGMINI-sector-fear-greed-r21322-spy-gap-backfill-log.txt"

if not exist "%BASE%" mkdir "%BASE%"
> "%LOG%" echo ============================================================
>>"%LOG%" echo ZGMINI SECTOR FEAR ^& GREED R2.13.22
>>"%LOG%" echo SPY GAP BACKFILL
>>"%LOG%" echo STARTED=%DATE% %TIME%
>>"%LOG%" echo ============================================================
>>"%LOG%" echo [SCOPE]
>>"%LOG%" echo PROVIDER=ALPACA_ONLY
>>"%LOG%" echo MAX_PROVIDER_REQUESTS=1
>>"%LOG%" echo SYMBOL=SPY
>>"%LOG%" echo WINDOW=2023-10-02..2024-08-14
>>"%LOG%" echo EXPECTED_SESSIONS=219
>>"%LOG%" echo FEED=iex
>>"%LOG%" echo ADJUSTMENT=split
>>"%LOG%" echo PUBLIC_MUTATION=NO
>>"%LOG%" echo D1_MUTATION=NO
>>"%LOG%" echo DB_SCHEMA_CHANGE=NO
>>"%LOG%" echo PRODUCTION_FORMULA_CHANGE=NO
>>"%LOG%" echo REFERENCE_REQUIREMENT_CHANGE=NO
>>"%LOG%" echo APPROVED_R1_REFERENCE=756_UNCHANGED
>>"%LOG%" echo PRODUCTION_BENCHMARK_SOURCE_CHANGE=NO
>>"%LOG%" echo.

>>"%LOG%" echo [1/2] R2.13.22 dedicated tests
call node --test tests\sector-fear-greed-r21322-spy-gap-backfill.test.mjs >>"%LOG%" 2>&1
set "TEST_EXIT=!ERRORLEVEL!"
>>"%LOG%" echo TEST_EXIT=!TEST_EXIT!
if not "!TEST_EXIT!"=="0" (
  >>"%LOG%" echo STATUS=R21322_TEST_FAILED
  exit /b 1
)

>>"%LOG%" echo [2/2] Approved SPY gap backfill + post-readback readiness recompute
call node scripts\pc-writer\sector-fear-greed-r21322-spy-gap-backfill.mjs >>"%LOG%" 2>&1
set "RUNTIME_EXIT=!ERRORLEVEL!"
>>"%LOG%" echo RUNTIME_EXIT=!RUNTIME_EXIT!
if not "!RUNTIME_EXIT!"=="0" (
  >>"%LOG%" echo STATUS=R21322_RUNTIME_FAILED
  exit /b 1
)

if exist "%BASE%\local-sector-fear-greed-r21322-spy-gap-backfill.txt" (
  >>"%LOG%" echo.
  >>"%LOG%" echo ============================================================
  >>"%LOG%" echo [R21322_REPORT]
  >>"%LOG%" echo ============================================================
  type "%BASE%\local-sector-fear-greed-r21322-spy-gap-backfill.txt" >>"%LOG%"
) else (
  >>"%LOG%" echo R21322_REPORT_MISSING=YES
  exit /b 1
)

>>"%LOG%" echo.
>>"%LOG%" echo STATUS=SHADOW_R21322_SPY_GAP_BACKFILL_COMPLETE
>>"%LOG%" echo FINAL_EXIT_CODE=0
echo R2.13.22 COMPLETE
exit /b 0
