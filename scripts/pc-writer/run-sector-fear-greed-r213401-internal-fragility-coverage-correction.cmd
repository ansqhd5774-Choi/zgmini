@echo off
setlocal EnableExtensions DisableDelayedExpansion

set "LOG=%USERPROFILE%\.zgmini\pc-writer\ZGMINI-sector-fear-greed-r213401-internal-fragility-coverage-correction-log.txt"
if not exist "%USERPROFILE%\.zgmini\pc-writer" mkdir "%USERPROFILE%\.zgmini\pc-writer"

> "%LOG%" echo ============================================================
>>"%LOG%" echo ZGMINI SECTOR FEAR ^& GREED R2.13.40.1
>>"%LOG%" echo INTERNAL FRAGILITY COVERAGE CORRECTION - LOCAL ONLY
>>"%LOG%" echo STARTED=%DATE% %TIME%
>>"%LOG%" echo ============================================================
>>"%LOG%" echo [SCOPE]
>>"%LOG%" echo PROVIDER_CALLS=0
>>"%LOG%" echo MODE=LOCAL_READ_ONLY_FEATURE_INDEPENDENT_COVERAGE
>>"%LOG%" echo PUBLIC_MUTATION=NO
>>"%LOG%" echo D1_MUTATION=NO
>>"%LOG%" echo DB_SCHEMA_CHANGE=NO
>>"%LOG%" echo PRODUCTION_FORMULA_CHANGE=NO
>>"%LOG%" echo REFERENCE_REQUIREMENT_CHANGE=NO
>>"%LOG%" echo APPROVED_R1_REFERENCE=756_UNCHANGED
>>"%LOG%" echo NORMALIZATION_CHANGE=NO
>>"%LOG%" echo WEIGHT_CHANGE=NO
>>"%LOG%" echo REFERENCE_WINDOW_CHANGE=NO
>>"%LOG%" echo SCHEDULER_CHANGE=NO
>>"%LOG%" echo CANDIDATE_SELECTION=NO
>>"%LOG%" echo OPTIONS_REPLACEMENT_SELECTION=NO
>>"%LOG%" echo.

>>"%LOG%" echo [1/2] R2.13.40.1 dedicated tests
node --test tests\sector-fear-greed-r213401-internal-fragility-coverage-correction.test.mjs >>"%LOG%" 2>&1
set "TEST_RC=%ERRORLEVEL%"
>>"%LOG%" echo TEST_EXIT=%TEST_RC%
if not "%TEST_RC%"=="0" (
  >>"%LOG%" echo STATUS=R213401_TEST_FAILED
  >>"%LOG%" echo FINAL_EXIT_CODE=%TEST_RC%
  type "%LOG%"
  exit /b %TEST_RC%
)

>>"%LOG%" echo [2/2] Local-only feature-independent coverage correction
node scripts\pc-writer\sector-fear-greed-r213401-internal-fragility-coverage-correction.mjs >>"%LOG%" 2>&1
set "RUN_RC=%ERRORLEVEL%"
>>"%LOG%" echo RUNTIME_EXIT=%RUN_RC%
if not "%RUN_RC%"=="0" (
  >>"%LOG%" echo STATUS=R213401_RUNTIME_FAILED
  >>"%LOG%" echo FINAL_EXIT_CODE=%RUN_RC%
  type "%LOG%"
  exit /b %RUN_RC%
)

>>"%LOG%" echo STATUS=R213401_COMPLETE
>>"%LOG%" echo FINAL_EXIT_CODE=0
type "%LOG%"
exit /b 0
