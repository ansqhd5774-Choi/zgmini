@echo off
setlocal EnableExtensions DisableDelayedExpansion

set "BASE=%USERPROFILE%\.zgmini\pc-writer"
set "LOG=%BASE%\ZGMINI-sector-fear-greed-r21341-stock-internal-crowding-screen-log.txt"

if not exist "%BASE%" mkdir "%BASE%"

>"%LOG%" echo ============================================================
>>"%LOG%" echo ZGMINI SECTOR FEAR ^& GREED R2.13.41
>>"%LOG%" echo STOCK-INTERNAL CROWDING SCREEN - LOCAL ONLY
>>"%LOG%" echo STARTED=%DATE% %TIME%
>>"%LOG%" echo ============================================================
>>"%LOG%" echo [SCOPE]
>>"%LOG%" echo PROVIDER_CALLS=0
>>"%LOG%" echo MODE=LOCAL_READ_ONLY_STOCK_INTERNAL_CROWDING_SCREEN
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

echo [1/2] R2.13.41 dedicated tests>>"%LOG%"
node --test tests\sector-fear-greed-r21341-stock-internal-crowding-screen.test.mjs >>"%LOG%" 2>&1
set "TEST_RC=%ERRORLEVEL%"
>>"%LOG%" echo TEST_EXIT=%TEST_RC%
if not "%TEST_RC%"=="0" goto FAIL

echo [2/2] Local-only stock-internal crowding screen>>"%LOG%"
node scripts\pc-writer\sector-fear-greed-r21341-stock-internal-crowding-screen.mjs >>"%LOG%" 2>&1
set "RUN_RC=%ERRORLEVEL%"
>>"%LOG%" echo RUNTIME_EXIT=%RUN_RC%
if not "%RUN_RC%"=="0" goto FAIL

>>"%LOG%" echo STATUS=R21341_COMPLETE
>>"%LOG%" echo FINAL_EXIT_CODE=0
type "%LOG%"
exit /b 0

:FAIL
>>"%LOG%" echo STATUS=R21341_RUNTIME_FAILED
if defined RUN_RC (
  >>"%LOG%" echo FINAL_EXIT_CODE=%RUN_RC%
  type "%LOG%"
  exit /b %RUN_RC%
)
>>"%LOG%" echo FINAL_EXIT_CODE=%TEST_RC%
type "%LOG%"
exit /b %TEST_RC%
