@echo off
setlocal EnableExtensions
chcp 65001 >nul

set "BASE=%USERPROFILE%\.zgmini\pc-writer"
set "LOG=%BASE%\ZGMINI-sector-fear-greed-r21317-tail-balance-backfill-feasibility-log.txt"

>"%LOG%" echo ============================================================
>>"%LOG%" echo ZGMINI SECTOR FEAR ^& GREED R2.13.17 TAIL BALANCE BACKFILL FEASIBILITY
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
>>"%LOG%" echo.
where node.exe >>"%LOG%" 2>&1
if errorlevel 1 goto :FAIL
for /f "delims=" %%H in ('git rev-parse HEAD 2^>nul') do set "HEAD_SHA=%%H"
>>"%LOG%" echo HEAD=%HEAD_SHA%
>>"%LOG%" echo.
>>"%LOG%" echo [R21317_TEST]
node --test tests\sector-fear-greed-r21317-tail-balance-backfill-feasibility.test.mjs >>"%LOG%" 2>&1
set "TEST_EXIT=%ERRORLEVEL%"
>>"%LOG%" echo R21317_TEST_EXIT=%TEST_EXIT%
if not "%TEST_EXIT%"=="0" goto :FAIL
>>"%LOG%" echo.
>>"%LOG%" echo [R21317_RUNTIME]
node scripts\pc-writer\sector-fear-greed-r21317-tail-balance-backfill-feasibility.mjs >>"%LOG%" 2>&1
set "RUN_EXIT=%ERRORLEVEL%"
>>"%LOG%" echo R21317_RUNTIME_EXIT=%RUN_EXIT%
if not "%RUN_EXIT%"=="0" goto :FAIL
>>"%LOG%" echo.
>>"%LOG%" echo [R21317_REPORT]
if exist "%BASE%\local-sector-fear-greed-r21317-tail-balance-backfill-feasibility.txt" type "%BASE%\local-sector-fear-greed-r21317-tail-balance-backfill-feasibility.txt" >>"%LOG%"
>>"%LOG%" echo.
>>"%LOG%" echo FINAL_EXIT_CODE=0
>>"%LOG%" echo ENDED=%DATE% %TIME%
echo DONE: R21317_TAIL_BALANCE_BACKFILL_FEASIBILITY_COMPLETE
echo RESULT=%LOG%
exit /b 0

:FAIL
>>"%LOG%" echo.
>>"%LOG%" echo FINAL_EXIT_CODE=1
>>"%LOG%" echo ENDED=%DATE% %TIME%
echo FAILED: R21317_TAIL_BALANCE_BACKFILL_FEASIBILITY
 echo RESULT=%LOG%
exit /b 1
