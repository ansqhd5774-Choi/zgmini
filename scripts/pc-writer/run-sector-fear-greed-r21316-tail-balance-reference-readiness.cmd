@echo off
setlocal EnableExtensions EnableDelayedExpansion
set "ROOT=%~dp0..\.."
set "BASE=%USERPROFILE%\.zgmini\pc-writer"
set "SCRIPT=%ROOT%\scripts\pc-writer\sector-fear-greed-r21316-tail-balance-reference-readiness.mjs"
set "TEST=%ROOT%\tests\sector-fear-greed-r21316-tail-balance-reference-readiness.test.mjs"
set "LOG=%BASE%\ZGMINI-sector-fear-greed-r21316-tail-balance-reference-readiness-log.txt"

if not exist "%BASE%" mkdir "%BASE%"
>"%LOG%" echo ============================================================
>>"%LOG%" echo ZGMINI SECTOR FEAR ^& GREED R2.13.16 TAIL BALANCE REFERENCE READINESS
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
if errorlevel 1 goto :NODE_FAIL
if exist "%ROOT%\.git" (for /f "delims=" %%H in ('git -C "%ROOT%" rev-parse HEAD 2^>nul') do >>"%LOG%" echo HEAD=%%H)
if not exist "%TEST%" goto :TEST_MISSING
if not exist "%SCRIPT%" goto :SCRIPT_MISSING

>>"%LOG%" echo.
>>"%LOG%" echo [R21316_TEST]
node --test "%TEST%" >>"%LOG%" 2>&1
set "TEST_EXIT=!ERRORLEVEL!"
>>"%LOG%" echo R21316_TEST_EXIT=!TEST_EXIT!
if not "!TEST_EXIT!"=="0" goto :TEST_FAIL

>>"%LOG%" echo.
>>"%LOG%" echo [R21316_RUNTIME]
node "%SCRIPT%" >>"%LOG%" 2>&1
set "RUN_EXIT=!ERRORLEVEL!"
>>"%LOG%" echo R21316_RUNTIME_EXIT=!RUN_EXIT!
if not "!RUN_EXIT!"=="0" goto :RUN_FAIL

set "REPORT=%BASE%\local-sector-fear-greed-r21316-tail-balance-reference-readiness.txt"
if not exist "%REPORT%" goto :REPORT_MISSING
>>"%LOG%" echo.
>>"%LOG%" echo [R21316_REPORT]
type "%REPORT%" >>"%LOG%" 2>&1
>>"%LOG%" echo.
>>"%LOG%" echo FINAL_EXIT_CODE=0
>>"%LOG%" echo ENDED=%DATE% %TIME%
echo DONE: R21316_TAIL_BALANCE_REFERENCE_READINESS_COMPLETE
echo RESULT=%LOG%
exit /b 0

:NODE_FAIL
>>"%LOG%" echo R21316_NODE_NOT_FOUND
goto :FAIL
:TEST_MISSING
>>"%LOG%" echo R21316_TEST_FILE_MISSING
goto :FAIL
:SCRIPT_MISSING
>>"%LOG%" echo R21316_SCRIPT_FILE_MISSING
goto :FAIL
:TEST_FAIL
>>"%LOG%" echo R21316_TEST_FAILED
goto :FAIL
:RUN_FAIL
>>"%LOG%" echo R21316_RUNTIME_FAILED
goto :FAIL
:REPORT_MISSING
>>"%LOG%" echo R21316_REPORT_MISSING
goto :FAIL
:FAIL
>>"%LOG%" echo FINAL_EXIT_CODE=1
>>"%LOG%" echo ENDED=%DATE% %TIME%
echo R21316_TAIL_BALANCE_REFERENCE_READINESS_FAILED
echo RESULT=%LOG%
exit /b 1
