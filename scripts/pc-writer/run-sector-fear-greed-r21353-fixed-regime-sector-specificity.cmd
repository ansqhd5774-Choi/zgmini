@echo off
setlocal EnableExtensions DisableDelayedExpansion

set "BASE=%USERPROFILE%\.zgmini\pc-writer"
set "LOG=%BASE%\ZGMINI-sector-fear-greed-r21353-fixed-regime-sector-specificity-log.txt"
set "REPORT_TXT=%BASE%\local-sector-fear-greed-r21353-fixed-regime-sector-specificity.txt"
set "REPORT_JSON=%BASE%\local-sector-fear-greed-r21353-fixed-regime-sector-specificity.json"

if not exist "%BASE%" mkdir "%BASE%"
>"%LOG%" echo ============================================================
>>"%LOG%" echo ZGMINI SECTOR FEAR ^& GREED R2.13.53 FIXED
>>"%LOG%" echo REGIME + SECTOR SPECIFICITY - EXISTING DATA ONLY
>>"%LOG%" echo STARTED=%DATE% %TIME%
>>"%LOG%" echo ============================================================
>>"%LOG%" echo [SCOPE]
>>"%LOG%" echo PROVIDER_CALLS=0
>>"%LOG%" echo FUTURE_DATA_DEPENDENCY=NO
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
>>"%LOG%" echo [1/2] R2.13.53 fixed dedicated tests
node --test tests\sector-fear-greed-r21353-fixed-regime-sector-specificity.test.mjs >>"%LOG%" 2>&1
set "TEST_RC=%ERRORLEVEL%"
>>"%LOG%" echo TEST_EXIT=%TEST_RC%
if not "%TEST_RC%"=="0" (
  >>"%LOG%" echo STATUS=R21353_FIXED_TEST_FAILED
  >>"%LOG%" echo FINAL_EXIT_CODE=%TEST_RC%
  type "%LOG%"
  exit /b %TEST_RC%
)
>>"%LOG%" echo [2/2] R2.13.53 fixed regime + sector specificity
node scripts\pc-writer\sector-fear-greed-r21353-fixed-regime-sector-specificity.mjs >>"%LOG%" 2>&1
set "RUN_RC=%ERRORLEVEL%"
>>"%LOG%" echo RUNTIME_EXIT=%RUN_RC%
if not "%RUN_RC%"=="0" (
  >>"%LOG%" echo STATUS=R21353_FIXED_RUNTIME_FAILED
  >>"%LOG%" echo FINAL_EXIT_CODE=%RUN_RC%
  type "%LOG%"
  exit /b %RUN_RC%
)
if not exist "%REPORT_TXT%" (
  >>"%LOG%" echo STATUS=R21353_FIXED_REPORT_TXT_MISSING
  >>"%LOG%" echo FINAL_EXIT_CODE=40
  type "%LOG%"
  exit /b 40
)
if not exist "%REPORT_JSON%" (
  >>"%LOG%" echo STATUS=R21353_FIXED_REPORT_JSON_MISSING
  >>"%LOG%" echo FINAL_EXIT_CODE=41
  type "%LOG%"
  exit /b 41
)
>>"%LOG%" echo STATUS=R21353_FIXED_COMPLETE
>>"%LOG%" echo FINAL_EXIT_CODE=0

type "%LOG%"
echo.
echo ================ REPORT TXT BEGIN ================
type "%REPORT_TXT%"
echo ================= REPORT TXT END =================
exit /b 0
