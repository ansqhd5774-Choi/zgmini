@echo off
setlocal EnableExtensions DisableDelayedExpansion

set "LOG=%USERPROFILE%\.zgmini\pc-writer\ZGMINI-sector-fear-greed-r21343-internal-correlation-sign-persistence-log.txt"
set "SCRIPT=%~dp0sector-fear-greed-r21343-internal-correlation-sign-persistence.mjs"
set "TEST=%~dp0..\..\tests\sector-fear-greed-r21343-internal-correlation-sign-persistence.test.mjs"

> "%LOG%" echo ============================================================
>>"%LOG%" echo ZGMINI SECTOR FEAR ^& GREED R2.13.43
>>"%LOG%" echo INTERNAL CORRELATION SIGN PERSISTENCE - LOCAL ONLY
>>"%LOG%" echo STARTED=%DATE% %TIME%
>>"%LOG%" echo ============================================================
>>"%LOG%" echo [SCOPE]
>>"%LOG%" echo PROVIDER_CALLS=0
>>"%LOG%" echo MODE=LOCAL_READ_ONLY_INTERNAL_CORRELATION_SIGN_PERSISTENCE
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
>>"%LOG%" echo [1/2] R2.13.43 dedicated tests

node --test "%TEST%" >>"%LOG%" 2>&1
set "TEST_RC=%ERRORLEVEL%"
>>"%LOG%" echo TEST_EXIT=%TEST_RC%
if not "%TEST_RC%"=="0" (
  >>"%LOG%" echo STATUS=R21343_TEST_FAILED
  >>"%LOG%" echo FINAL_EXIT_CODE=%TEST_RC%
  type "%LOG%"
  exit /b %TEST_RC%
)

>>"%LOG%" echo [2/2] Local-only internal correlation sign persistence
node "%SCRIPT%" >>"%LOG%" 2>&1
set "RUN_RC=%ERRORLEVEL%"
>>"%LOG%" echo RUNTIME_EXIT=%RUN_RC%
if not "%RUN_RC%"=="0" (
  >>"%LOG%" echo STATUS=R21343_RUNTIME_FAILED
  >>"%LOG%" echo FINAL_EXIT_CODE=%RUN_RC%
  type "%LOG%"
  exit /b %RUN_RC%
)

>>"%LOG%" echo STATUS=R21343_COMPLETE
>>"%LOG%" echo FINAL_EXIT_CODE=0
type "%LOG%"
exit /b 0
