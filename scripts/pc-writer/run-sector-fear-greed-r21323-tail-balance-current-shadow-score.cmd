@echo off
setlocal EnableExtensions EnableDelayedExpansion

set "BASE=%USERPROFILE%\.zgmini\pc-writer"
set "LOG=%BASE%\ZGMINI-sector-fear-greed-r21323-tail-balance-current-shadow-score-log.txt"

if not exist "%BASE%" mkdir "%BASE%"
> "%LOG%" echo ============================================================
>>"%LOG%" echo ZGMINI SECTOR FEAR ^& GREED R2.13.23
>>"%LOG%" echo TAIL BALANCE CURRENT SHADOW SCORE
>>"%LOG%" echo STARTED=%DATE% %TIME%
>>"%LOG%" echo ============================================================
>>"%LOG%" echo [SCOPE]
>>"%LOG%" echo PROVIDER_CALLS=0
>>"%LOG%" echo MODE=LOCAL_READ_ONLY_CURRENT_POINT_756_NORMALIZATION
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

>>"%LOG%" echo [1/2] R2.13.23 dedicated tests
call node --test tests\sector-fear-greed-r21323-tail-balance-current-shadow-score.test.mjs >>"%LOG%" 2>&1
set "TEST_EXIT=!ERRORLEVEL!"
>>"%LOG%" echo TEST_EXIT=!TEST_EXIT!
if not "!TEST_EXIT!"=="0" (
  >>"%LOG%" echo STATUS=R21323_TEST_FAILED
  exit /b 1
)

>>"%LOG%" echo [2/2] Current-point Tail Balance 756 shadow scoring
call node scripts\pc-writer\sector-fear-greed-r21323-tail-balance-current-shadow-score.mjs >>"%LOG%" 2>&1
set "RUNTIME_EXIT=!ERRORLEVEL!"
>>"%LOG%" echo RUNTIME_EXIT=!RUNTIME_EXIT!
if not "!RUNTIME_EXIT!"=="0" (
  >>"%LOG%" echo STATUS=R21323_RUNTIME_FAILED
  exit /b 1
)

if exist "%BASE%\local-sector-fear-greed-r21323-tail-balance-current-shadow-score.txt" (
  >>"%LOG%" echo.
  >>"%LOG%" echo ============================================================
  >>"%LOG%" echo [R21323_REPORT]
  >>"%LOG%" echo ============================================================
  type "%BASE%\local-sector-fear-greed-r21323-tail-balance-current-shadow-score.txt" >>"%LOG%"
) else (
  >>"%LOG%" echo R21323_REPORT_MISSING=YES
  exit /b 1
)

>>"%LOG%" echo.
>>"%LOG%" echo STATUS=SHADOW_R21323_TAIL_BALANCE_CURRENT_SCORE_COMPLETE
>>"%LOG%" echo FINAL_EXIT_CODE=0
echo R2.13.23 COMPLETE
exit /b 0
