@echo off
setlocal EnableExtensions DisableDelayedExpansion

set "BASE=%ZGMINI_PC_HOME%"
if not defined BASE set "BASE=%USERPROFILE%\.zgmini\pc-writer"
set "LOG=%BASE%\ZGMINI-sector-fear-greed-r21347-prospective-data-inventory-log.txt"

>"%LOG%" echo ============================================================
>>"%LOG%" echo ZGMINI SECTOR FEAR ^& GREED R2.13.47
>>"%LOG%" echo PROSPECTIVE DATA INVENTORY - LOCAL ONLY
>>"%LOG%" echo STARTED=%DATE% %TIME%
>>"%LOG%" echo ============================================================
>>"%LOG%" echo [SCOPE]
>>"%LOG%" echo PROVIDER_CALLS=0
>>"%LOG%" echo MODE=LOCAL_READ_ONLY_INVENTORY
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

echo [1/2] R2.13.47 dedicated tests>>"%LOG%"
node --test tests\sector-fear-greed-r21347-prospective-data-inventory.test.mjs >>"%LOG%" 2>&1
set "TEST_RC=%ERRORLEVEL%"
>>"%LOG%" echo TEST_EXIT=%TEST_RC%
if not "%TEST_RC%"=="0" (
  type "%LOG%"
  exit /b %TEST_RC%
)

echo [2/2] Local-only prospective data inventory>>"%LOG%"
node scripts\pc-writer\sector-fear-greed-r21347-prospective-data-inventory.mjs >>"%LOG%" 2>&1
set "RUN_RC=%ERRORLEVEL%"
>>"%LOG%" echo RUNTIME_EXIT=%RUN_RC%
if "%RUN_RC%"=="0" (
  >>"%LOG%" echo STATUS=R21347_COMPLETE
) else (
  >>"%LOG%" echo STATUS=R21347_FAILED
)
>>"%LOG%" echo FINAL_EXIT_CODE=%RUN_RC%
type "%LOG%"
exit /b %RUN_RC%
