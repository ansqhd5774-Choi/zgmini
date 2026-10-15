@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul
set "BASE=%USERPROFILE%\.zgmini\pc-writer"
set "LOG=%BASE%\ZGMINI-sector-fear-greed-r21318-tail-balance-backfill-window-log.txt"
set "REPORT=%BASE%\local-sector-fear-greed-r21318-tail-balance-backfill-window.txt"

>"%LOG%" echo ============================================================
>>"%LOG%" echo ZGMINI SECTOR FEAR ^& GREED R2.13.18 TAIL BALANCE BACKFILL WINDOW
>>"%LOG%" echo STARTED=%DATE% %TIME%
>>"%LOG%" echo ============================================================
>>"%LOG%" echo.
>>"%LOG%" echo [SAFETY]
>>"%LOG%" echo PROVIDER_CALLS_ALLOWED=NO
>>"%LOG%" echo MODE=SHADOW_ONLY_EXISTING_LOCAL_DATA
>>"%LOG%" echo RAW_ROWS_STORED=NO
>>"%LOG%" echo PUBLIC_MUTATION=NO
>>"%LOG%" echo D1_MUTATION=NO
>>"%LOG%" echo DB_SCHEMA_CHANGE=NO
>>"%LOG%" echo PRODUCTION_FORMULA_CHANGE=NO
>>"%LOG%" echo REFERENCE_REQUIREMENT_CHANGE=NO
>>"%LOG%" echo SCHEDULER_CHANGE=NO
>>"%LOG%" echo APPROVED_R1_REFERENCE=756_UNCHANGED
>>"%LOG%" echo FILL_FORWARD_FILL=NO
>>"%LOG%" echo SOURCE_FILE_MUTATION=NO
>>"%LOG%" echo CANDIDATE_SELECTED=NO
>>"%LOG%" echo SELECTION_THRESHOLD_INTRODUCED=NO
>>"%LOG%" echo OPTIONS_EQUIVALENCE_CLAIMED=NO
>>"%LOG%" echo NEW_FORMULA_INTRODUCED=NO
>>"%LOG%" echo NORMALIZATION_CHANGED=NO
>>"%LOG%" echo REFERENCE_WINDOW_CHANGED=NO
>>"%LOG%" echo BACKFILL_EXECUTED=NO
>>"%LOG%" echo.

where node.exe >>"%LOG%" 2>&1
if errorlevel 1 exit /b 1
for /f "delims=" %%H in ('git rev-parse HEAD 2^>nul') do set "HEAD=%%H"
>>"%LOG%" echo HEAD=!HEAD!
>>"%LOG%" echo.
>>"%LOG%" echo [R21318_TEST]
node --test tests\sector-fear-greed-r21318-tail-balance-backfill-window.test.mjs >>"%LOG%" 2>&1
set "TEST_EXIT=!ERRORLEVEL!"
>>"%LOG%" echo R21318_TEST_EXIT=!TEST_EXIT!
if not "!TEST_EXIT!"=="0" exit /b !TEST_EXIT!

>>"%LOG%" echo.
>>"%LOG%" echo [R21318_RUNTIME]
node scripts\pc-writer\sector-fear-greed-r21318-tail-balance-backfill-window.mjs >>"%LOG%" 2>&1
set "RUNTIME_EXIT=!ERRORLEVEL!"
>>"%LOG%" echo R21318_RUNTIME_EXIT=!RUNTIME_EXIT!
if not "!RUNTIME_EXIT!"=="0" exit /b !RUNTIME_EXIT!

if exist "%REPORT%" (
  >>"%LOG%" echo.
  >>"%LOG%" echo [R21318_REPORT]
  type "%REPORT%" >>"%LOG%"
) else (
  >>"%LOG%" echo R21318_REPORT_MISSING
  exit /b 1
)

>>"%LOG%" echo.
>>"%LOG%" echo FINAL_EXIT_CODE=0
>>"%LOG%" echo ENDED=%DATE% %TIME%
echo DONE: R21318_TAIL_BALANCE_BACKFILL_WINDOW_COMPLETE
echo RESULT=%LOG%
exit /b 0
