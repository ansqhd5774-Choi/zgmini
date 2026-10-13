@echo off
setlocal EnableExtensions DisableDelayedExpansion

set "BASE=%USERPROFILE%\.zgmini\pc-writer"
set "LOG=%BASE%\ZGMINI-sector-fear-greed-r21346-prospective-lock-readiness-log.txt"
set "TXT=%BASE%\local-sector-fear-greed-r21346-prospective-lock-readiness.txt"
set "JSON=%BASE%\local-sector-fear-greed-r21346-prospective-lock-readiness.json"

>"%LOG%" echo ============================================================
>>"%LOG%" echo ZGMINI SECTOR FEAR ^& GREED R2.13.46
>>"%LOG%" echo PROSPECTIVE LOCK READINESS - LOCAL ONLY
>>"%LOG%" echo STARTED=%DATE% %TIME%
>>"%LOG%" echo ============================================================
>>"%LOG%" echo [SCOPE]
>>"%LOG%" echo PROVIDER_CALLS=0
>>"%LOG%" echo MODE=LOCAL_ONLY_FROZEN_RESEARCH_LOCK
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

>>"%LOG%" echo [1/2] R2.13.46 dedicated tests
node --test tests\sector-fear-greed-r21346-prospective-lock-readiness.test.mjs >>"%LOG%" 2>&1
set "TEST_EXIT=%ERRORLEVEL%"
>>"%LOG%" echo TEST_EXIT=%TEST_EXIT%
if not "%TEST_EXIT%"=="0" (
  >>"%LOG%" echo STATUS=R21346_TEST_FAILED
  >>"%LOG%" echo FINAL_EXIT_CODE=%TEST_EXIT%
  type "%LOG%"
  exit /b %TEST_EXIT%
)

>>"%LOG%" echo [2/2] Local-only prospective lock readiness
node scripts\pc-writer\sector-fear-greed-r21346-prospective-lock-readiness.mjs >>"%LOG%" 2>&1
set "RUNTIME_EXIT=%ERRORLEVEL%"
>>"%LOG%" echo RUNTIME_EXIT=%RUNTIME_EXIT%
if not "%RUNTIME_EXIT%"=="0" (
  >>"%LOG%" echo STATUS=R21346_RUNTIME_FAILED
  >>"%LOG%" echo FINAL_EXIT_CODE=%RUNTIME_EXIT%
  type "%LOG%"
  exit /b %RUNTIME_EXIT%
)

if not exist "%TXT%" (
  >>"%LOG%" echo STATUS=R21346_TXT_MISSING
  >>"%LOG%" echo FINAL_EXIT_CODE=40
  type "%LOG%"
  exit /b 40
)
if not exist "%JSON%" (
  >>"%LOG%" echo STATUS=R21346_JSON_MISSING
  >>"%LOG%" echo FINAL_EXIT_CODE=41
  type "%LOG%"
  exit /b 41
)

>>"%LOG%" echo STATUS=R21346_COMPLETE
>>"%LOG%" echo FINAL_EXIT_CODE=0
>>"%LOG%" echo.
>>"%LOG%" type "%TXT%"

type "%LOG%"
exit /b 0
