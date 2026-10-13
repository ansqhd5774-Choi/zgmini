@echo off
setlocal EnableExtensions DisableDelayedExpansion

set "BASE=%USERPROFILE%\.zgmini\pc-writer"
set "LOG=%BASE%\ZGMINI-sector-fear-greed-r21352-frozen-historical-robustness-log.txt"
set "SCRIPT=scripts\pc-writer\sector-fear-greed-r21352-frozen-historical-robustness.mjs"
set "TEST=tests\sector-fear-greed-r21352-frozen-historical-robustness.test.mjs"

if not exist "%BASE%" mkdir "%BASE%"
> "%LOG%" echo ============================================================
>>"%LOG%" echo ZGMINI SECTOR FEAR ^& GREED R2.13.52
>>"%LOG%" echo FROZEN HISTORICAL ROBUSTNESS - EXISTING DATA ONLY
>>"%LOG%" echo STARTED=%DATE% %TIME%
>>"%LOG%" echo ============================================================
>>"%LOG%" echo [SCOPE]
>>"%LOG%" echo PROVIDER_CALLS=0
>>"%LOG%" echo MODE=LOCAL_STORED_DATA_ONLY_NO_FUTURE_DEPENDENCY
>>"%LOG%" echo PUBLIC_MUTATION=NO
>>"%LOG%" echo D1_MUTATION=NO
>>"%LOG%" echo DB_SCHEMA_CHANGE=NO
>>"%LOG%" echo PRODUCTION_FORMULA_CHANGE=NO
>>"%LOG%" echo APPROVED_R1_REFERENCE=756_UNCHANGED
>>"%LOG%" echo NORMALIZATION_CHANGE=NO
>>"%LOG%" echo WEIGHT_CHANGE=NO
>>"%LOG%" echo REFERENCE_WINDOW_CHANGE=NO
>>"%LOG%" echo SCHEDULER_CHANGE=NO
>>"%LOG%" echo RETUNING=NO
>>"%LOG%" echo CANDIDATE_SELECTION=NO
>>"%LOG%" echo OPTIONS_REPLACEMENT_SELECTION=NO
>>"%LOG%" echo.

>>"%LOG%" echo [1/2] R2.13.52 dedicated tests
node --test "%TEST%" >>"%LOG%" 2>&1
set "TEST_RC=%ERRORLEVEL%"
>>"%LOG%" echo TEST_EXIT=%TEST_RC%
if not "%TEST_RC%"=="0" (
  >>"%LOG%" echo STATUS=R21352_TEST_FAILED
  type "%LOG%"
  exit /b %TEST_RC%
)

>>"%LOG%" echo [2/2] Frozen historical robustness
node "%SCRIPT%" >>"%LOG%" 2>&1
set "RUN_RC=%ERRORLEVEL%"
>>"%LOG%" echo RUNTIME_EXIT=%RUN_RC%
if not "%RUN_RC%"=="0" (
  >>"%LOG%" echo STATUS=R21352_RUNTIME_FAILED
  type "%LOG%"
  exit /b %RUN_RC%
)

>>"%LOG%" echo STATUS=R21352_COMPLETE
>>"%LOG%" echo FINAL_EXIT_CODE=0
type "%LOG%"
exit /b 0
