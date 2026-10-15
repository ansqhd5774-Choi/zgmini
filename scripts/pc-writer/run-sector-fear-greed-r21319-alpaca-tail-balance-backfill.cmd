@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul

set "BASE=%USERPROFILE%\.zgmini\pc-writer"
set "LOG=%BASE%\ZGMINI-sector-fear-greed-r21319-alpaca-tail-balance-backfill-log.txt"
set "REPORT=%BASE%\local-sector-fear-greed-r21319-alpaca-tail-balance-backfill.txt"

>"%LOG%" echo ============================================================
>>"%LOG%" echo ZGMINI SECTOR FEAR ^& GREED R2.13.19 ALPACA TAIL BALANCE BACKFILL
>>"%LOG%" echo STARTED=%DATE% %TIME%
>>"%LOG%" echo ============================================================
>>"%LOG%" echo.
>>"%LOG%" echo [SAFETY]
>>"%LOG%" echo PROVIDER_CALLS_ALLOWED=YES_ALPACA_ONLY
>>"%LOG%" echo MAX_PROVIDER_REQUESTS=55
>>"%LOG%" echo APPROVED_WINDOW=2023-07-12..2023-09-29
>>"%LOG%" echo APPROVED_GROUPS=55_EXISTING_GROUPS_ONLY
>>"%LOG%" echo FEED=iex
>>"%LOG%" echo ADJUSTMENT=split
>>"%LOG%" echo RAW_ROWS_STORED=YES_LOCAL_ONLY
>>"%LOG%" echo PUBLIC_MUTATION=NO
>>"%LOG%" echo D1_MUTATION=NO
>>"%LOG%" echo DB_SCHEMA_CHANGE=NO
>>"%LOG%" echo PRODUCTION_FORMULA_CHANGE=NO
>>"%LOG%" echo REFERENCE_REQUIREMENT_CHANGE=NO
>>"%LOG%" echo APPROVED_R1_REFERENCE=756_UNCHANGED
>>"%LOG%" echo BENCHMARK_SOURCE_CHANGE=NO
>>"%LOG%" echo SCHEDULER_CHANGE=NO
>>"%LOG%" echo.

where node.exe >>"%LOG%" 2>&1
if errorlevel 1 goto :FAIL
for /f "delims=" %%H in ('git rev-parse HEAD 2^>nul') do set "HEAD_SHA=%%H"
>>"%LOG%" echo HEAD=!HEAD_SHA!
>>"%LOG%" echo.
>>"%LOG%" echo [R21319_TEST]
node --test tests\sector-fear-greed-r21319-alpaca-tail-balance-backfill.test.mjs >>"%LOG%" 2>&1
set "TEST_EXIT=!ERRORLEVEL!"
>>"%LOG%" echo R21319_TEST_EXIT=!TEST_EXIT!
if not "!TEST_EXIT!"=="0" goto :FAIL

>>"%LOG%" echo.
>>"%LOG%" echo [R21319_RUNTIME]
node scripts\pc-writer\sector-fear-greed-r21319-alpaca-tail-balance-backfill.mjs >>"%LOG%" 2>&1
set "RUN_EXIT=!ERRORLEVEL!"
>>"%LOG%" echo R21319_RUNTIME_EXIT=!RUN_EXIT!
if not "!RUN_EXIT!"=="0" goto :FAIL

if exist "%REPORT%" (
  >>"%LOG%" echo.
  >>"%LOG%" echo [R21319_REPORT]
  type "%REPORT%" >>"%LOG%"
) else (
  >>"%LOG%" echo R21319_REPORT_MISSING
  goto :FAIL
)

>>"%LOG%" echo.
>>"%LOG%" echo FINAL_EXIT_CODE=0
>>"%LOG%" echo ENDED=%DATE% %TIME%
echo DONE: R21319_ALPACA_TAIL_BALANCE_BACKFILL_COMPLETE
echo RESULT=%LOG%
exit /b 0

:FAIL
>>"%LOG%" echo.
>>"%LOG%" echo FINAL_EXIT_CODE=1
>>"%LOG%" echo ENDED=%DATE% %TIME%
echo FAILED_OR_STOPPED: R21319_ALPACA_TAIL_BALANCE_BACKFILL
echo DO_NOT_BLINDLY_RERUN_UPLOAD_LOG_FIRST
 echo RESULT=%LOG%
exit /b 1
