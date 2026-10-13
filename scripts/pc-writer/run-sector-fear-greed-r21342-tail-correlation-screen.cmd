@echo off
setlocal EnableExtensions DisableDelayedExpansion

set "BASE=%USERPROFILE%\.zgmini\pc-writer"
set "LOG=%BASE%\ZGMINI-sector-fear-greed-r21342-tail-correlation-screen-log.txt"

if not exist "%BASE%" mkdir "%BASE%"
> "%LOG%" echo ============================================================
>>"%LOG%" echo ZGMINI SECTOR FEAR ^& GREED R2.13.42
>>"%LOG%" echo TAIL + CORRELATION SCREEN - LOCAL ONLY
>>"%LOG%" echo STARTED=%DATE% %TIME%
>>"%LOG%" echo ============================================================
>>"%LOG%" echo [SCOPE]
>>"%LOG%" echo PROVIDER_CALLS=0
>>"%LOG%" echo MODE=LOCAL_READ_ONLY_TAIL_CORRELATION_SCREEN
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

echo [1/2] R2.13.42 dedicated tests>>"%LOG%"
node --test tests\sector-fear-greed-r21342-tail-correlation-screen.test.mjs >>"%LOG%" 2>&1
set "TEST_EXIT=%ERRORLEVEL%"
>>"%LOG%" echo TEST_EXIT=%TEST_EXIT%
if not "%TEST_EXIT%"=="0" (
  >>"%LOG%" echo STATUS=R21342_TEST_FAILED
  >>"%LOG%" echo FINAL_EXIT_CODE=%TEST_EXIT%
  type "%LOG%"
  exit /b %TEST_EXIT%
)

echo [2/2] Local-only tail + correlation screen>>"%LOG%"
node scripts\pc-writer\sector-fear-greed-r21342-tail-correlation-screen.mjs >>"%LOG%" 2>&1
set "RUNTIME_EXIT=%ERRORLEVEL%"
>>"%LOG%" echo RUNTIME_EXIT=%RUNTIME_EXIT%
if not "%RUNTIME_EXIT%"=="0" (
  >>"%LOG%" echo STATUS=R21342_RUNTIME_FAILED
  >>"%LOG%" echo FINAL_EXIT_CODE=%RUNTIME_EXIT%
  type "%LOG%"
  exit /b %RUNTIME_EXIT%
)

>>"%LOG%" echo STATUS=R21342_COMPLETE
>>"%LOG%" echo FINAL_EXIT_CODE=0
type "%LOG%"
exit /b 0
