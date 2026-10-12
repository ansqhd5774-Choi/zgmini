@echo off
chcp 65001 >nul
setlocal EnableExtensions EnableDelayedExpansion

set "LOG=%USERPROFILE%\.zgmini\pc-writer\ZGMINI-sector-fear-greed-r21332-full-252-historical-validation-log.txt"

> "%LOG%" echo ============================================================
>>"%LOG%" echo ZGMINI SECTOR FEAR ^& GREED R2.13.32
>>"%LOG%" echo FULL 252 HISTORICAL VALIDATION
>>"%LOG%" echo STARTED=%DATE% %TIME%
>>"%LOG%" echo ============================================================
>>"%LOG%" echo [SCOPE]
>>"%LOG%" echo PROVIDER_CALLS=0
>>"%LOG%" echo MODE=LOCAL_READ_ONLY_FULL_252_HISTORY
>>"%LOG%" echo PUBLIC_MUTATION=NO
>>"%LOG%" echo D1_MUTATION=NO
>>"%LOG%" echo DB_SCHEMA_CHANGE=NO
>>"%LOG%" echo PRODUCTION_FORMULA_CHANGE=NO
>>"%LOG%" echo REFERENCE_REQUIREMENT_CHANGE=NO
>>"%LOG%" echo APPROVED_R1_REFERENCE=756_UNCHANGED
>>"%LOG%" echo NORMALIZATION_CHANGE=NO
>>"%LOG%" echo WEIGHT_CHANGE=NO
>>"%LOG%" echo PRODUCTION_BENCHMARK_SOURCE_CHANGE=NO
>>"%LOG%" echo.

>>"%LOG%" echo [1/2] R2.13.32 dedicated tests
call node --test tests\sector-fear-greed-r21332-full-252-historical-validation.test.mjs >>"%LOG%" 2>&1
set "TEST_EXIT=!ERRORLEVEL!"
>>"%LOG%" echo TEST_EXIT=!TEST_EXIT!
if not "!TEST_EXIT!"=="0" exit /b !TEST_EXIT!

>>"%LOG%" echo [2/2] Local-only full 252 historical validation
call node scripts\pc-writer\sector-fear-greed-r21332-full-252-historical-validation.mjs >>"%LOG%" 2>&1
set "RUNTIME_EXIT=!ERRORLEVEL!"
>>"%LOG%" echo RUNTIME_EXIT=!RUNTIME_EXIT!
if not "!RUNTIME_EXIT!"=="0" exit /b !RUNTIME_EXIT!

if exist "%USERPROFILE%\.zgmini\pc-writer\local-sector-fear-greed-r21332-full-252-historical-validation.txt" (
  >>"%LOG%" echo.
  >>"%LOG%" echo ============================================================
  >>"%LOG%" echo [R21332_REPORT]
  >>"%LOG%" echo ============================================================
  type "%USERPROFILE%\.zgmini\pc-writer\local-sector-fear-greed-r21332-full-252-historical-validation.txt" >>"%LOG%"
)

>>"%LOG%" echo.
>>"%LOG%" echo STATUS=R21332_COMPLETE
>>"%LOG%" echo FINAL_EXIT_CODE=0
exit /b 0
