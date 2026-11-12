@echo off
setlocal EnableExtensions EnableDelayedExpansion

set "BASE=%USERPROFILE%\.zgmini\pc-writer"
set "LOG=%BASE%\ZGMINI-sector-fear-greed-r21324-tail-balance-history-backfill-plan-log.txt"

if not exist "%BASE%" mkdir "%BASE%"
> "%LOG%" echo ============================================================
>>"%LOG%" echo ZGMINI SECTOR FEAR ^& GREED R2.13.24
>>"%LOG%" echo TAIL BALANCE HISTORY BACKFILL PLAN
>>"%LOG%" echo STARTED=%DATE% %TIME%
>>"%LOG%" echo ============================================================
>>"%LOG%" echo [SCOPE]
>>"%LOG%" echo PROVIDER_CALLS=0
>>"%LOG%" echo MODE=LOCAL_READ_ONLY_252_NORMALIZED_DATE_CAPACITY_PLAN
>>"%LOG%" echo BACKFILL_EXECUTED=NO
>>"%LOG%" echo PUBLIC_MUTATION=NO
>>"%LOG%" echo D1_MUTATION=NO
>>"%LOG%" echo DB_SCHEMA_CHANGE=NO
>>"%LOG%" echo PRODUCTION_FORMULA_CHANGE=NO
>>"%LOG%" echo REFERENCE_REQUIREMENT_CHANGE=NO
>>"%LOG%" echo APPROVED_R1_REFERENCE=756_UNCHANGED
>>"%LOG%" echo NORMALIZATION_CHANGE=NO
>>"%LOG%" echo WEIGHT_CHANGE=NO
>>"%LOG%" echo PRODUCTION_BENCHMARK_SOURCE_CHANGE=NO
>>"%LOG%" echo CANDIDATE_SELECTED=NO
>>"%LOG%" echo.

>>"%LOG%" echo [1/2] R2.13.24 dedicated tests
call node --test tests\sector-fear-greed-r21324-tail-balance-history-backfill-plan.test.mjs >>"%LOG%" 2>&1
set "TEST_EXIT=!ERRORLEVEL!"
>>"%LOG%" echo TEST_EXIT=!TEST_EXIT!
if not "!TEST_EXIT!"=="0" (
  >>"%LOG%" echo STATUS=R21324_TEST_FAILED
  exit /b 1
)

>>"%LOG%" echo [2/2] Local-only 252 normalized-date backfill capacity plan
call node scripts\pc-writer\sector-fear-greed-r21324-tail-balance-history-backfill-plan.mjs >>"%LOG%" 2>&1
set "RUNTIME_EXIT=!ERRORLEVEL!"
>>"%LOG%" echo RUNTIME_EXIT=!RUNTIME_EXIT!
if not "!RUNTIME_EXIT!"=="0" (
  >>"%LOG%" echo STATUS=R21324_RUNTIME_FAILED
  exit /b 1
)

if exist "%BASE%\local-sector-fear-greed-r21324-tail-balance-history-backfill-plan.txt" (
  >>"%LOG%" echo.
  >>"%LOG%" echo ============================================================
  >>"%LOG%" echo [R21324_REPORT]
  >>"%LOG%" echo ============================================================
  type "%BASE%\local-sector-fear-greed-r21324-tail-balance-history-backfill-plan.txt" >>"%LOG%"
) else (
  >>"%LOG%" echo R21324_REPORT_MISSING=YES
  exit /b 1
)

>>"%LOG%" echo.
>>"%LOG%" echo STATUS=SHADOW_R21324_TAIL_BALANCE_HISTORY_BACKFILL_PLAN_COMPLETE
>>"%LOG%" echo FINAL_EXIT_CODE=0
echo R2.13.24 COMPLETE
exit /b 0
