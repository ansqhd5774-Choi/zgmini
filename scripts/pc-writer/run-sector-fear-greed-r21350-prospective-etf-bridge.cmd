@echo off
setlocal EnableExtensions DisableDelayedExpansion

set "BASE=%ZGMINI_PC_HOME%"
if not defined BASE set "BASE=%USERPROFILE%\.zgmini\pc-writer"
set "LOG=%BASE%\ZGMINI-sector-fear-greed-r21350-prospective-etf-bridge-log.txt"

>"%LOG%" echo ============================================================
>>"%LOG%" echo ZGMINI SECTOR FEAR ^& GREED R2.13.50
>>"%LOG%" echo PROSPECTIVE ETF BRIDGE - APPROVED ONE PROVIDER CALL MAX
>>"%LOG%" echo STARTED=%DATE% %TIME%
>>"%LOG%" echo ============================================================
>>"%LOG%" echo [SCOPE]
>>"%LOG%" echo PROVIDER=ALPACA
>>"%LOG%" echo PROVIDER_CALL_APPROVED=YES
>>"%LOG%" echo MAX_PROVIDER_REQUESTS=1
>>"%LOG%" echo MODE=LOCAL_RESEARCH_ONLY
>>"%LOG%" echo PUBLIC_MUTATION=NO
>>"%LOG%" echo D1_MUTATION=NO
>>"%LOG%" echo DB_SCHEMA_CHANGE=NO
>>"%LOG%" echo PRODUCTION_FORMULA_CHANGE=NO
>>"%LOG%" echo APPROVED_R1_REFERENCE=756_UNCHANGED
>>"%LOG%" echo NORMALIZATION_CHANGE=NO
>>"%LOG%" echo WEIGHT_CHANGE=NO
>>"%LOG%" echo REFERENCE_WINDOW_CHANGE=NO
>>"%LOG%" echo SCHEDULER_CHANGE=NO
>>"%LOG%" echo CANDIDATE_SELECTION=NO
>>"%LOG%" echo OPTIONS_REPLACEMENT_SELECTION=NO
>>"%LOG%" echo.

echo [1/2] R2.13.50 dedicated tests>>"%LOG%"
node --test tests\sector-fear-greed-r21350-prospective-etf-bridge.test.mjs >>"%LOG%" 2>&1
set "TEST_RC=%ERRORLEVEL%"
>>"%LOG%" echo TEST_EXIT=%TEST_RC%
if not "%TEST_RC%"=="0" (
  >>"%LOG%" echo STATUS=R21350_TEST_FAILED_NO_PROVIDER_CALL
  type "%LOG%"
  exit /b %TEST_RC%
)

echo [2/2] Approved one-request prospective ETF bridge>>"%LOG%"
set "ZGMINI_R21350_PROVIDER_CALL_APPROVED=YES"
node scripts\pc-writer\sector-fear-greed-r21350-prospective-etf-bridge.mjs >>"%LOG%" 2>&1
set "RUN_RC=%ERRORLEVEL%"
set "ZGMINI_R21350_PROVIDER_CALL_APPROVED="
>>"%LOG%" echo RUNTIME_EXIT=%RUN_RC%
if "%RUN_RC%"=="0" (
  >>"%LOG%" echo STATUS=R21350_COMPLETE
) else (
  >>"%LOG%" echo STATUS=R21350_FAILED
)
>>"%LOG%" echo FINAL_EXIT_CODE=%RUN_RC%
type "%LOG%"
exit /b %RUN_RC%
