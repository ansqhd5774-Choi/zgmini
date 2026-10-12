@echo off
setlocal EnableExtensions DisableDelayedExpansion

set "ROOT=%~dp0..\.."
for %%I in ("%ROOT%") do set "ROOT=%%~fI"
set "BASE=%USERPROFILE%\.zgmini\pc-writer"
set "SCRIPT=%ROOT%\scripts\pc-writer\sector-fear-greed-r2134-r24-benchmark-repair-shadow.mjs"
set "TEST=%ROOT%\tests\sector-fear-greed-r2134-r24-benchmark-repair-shadow.test.mjs"
set "REPORT=%BASE%\local-sector-fear-greed-r2134-r24-benchmark-repair-shadow.txt"
set "LOG=%BASE%\ZGMINI-sector-fear-greed-r2134-r24-repair-log.txt"

if not exist "%BASE%" mkdir "%BASE%" >nul 2>&1

>"%LOG%" echo ============================================================
>>"%LOG%" echo ZGMINI SECTOR FEAR ^& GREED R2.13.4 R2.4 BENCHMARK REPAIR
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
>>"%LOG%" echo.

where node.exe >>"%LOG%" 2>&1
if errorlevel 1 goto :NODE_FAIL
if not exist "%SCRIPT%" goto :SCRIPT_FAIL
if not exist "%TEST%" goto :TEST_FILE_FAIL

for /f "delims=" %%H in ('git -C "%ROOT%" rev-parse HEAD 2^>nul') do set "HEAD_SHA=%%H"
>>"%LOG%" echo HEAD=%HEAD_SHA%
>>"%LOG%" echo.

>>"%LOG%" echo [R2134_TEST]
node --test "%TEST%" >>"%LOG%" 2>&1
set "TEST_EXIT=%ERRORLEVEL%"
>>"%LOG%" echo R2134_TEST_EXIT=%TEST_EXIT%
if not "%TEST_EXIT%"=="0" goto :TEST_FAIL

>>"%LOG%" echo.
>>"%LOG%" echo [R2134_RUNTIME]
node "%SCRIPT%" >>"%LOG%" 2>&1
set "RUN_EXIT=%ERRORLEVEL%"
>>"%LOG%" echo R2134_RUNTIME_EXIT=%RUN_EXIT%
if not "%RUN_EXIT%"=="0" goto :RUN_FAIL

if not exist "%REPORT%" goto :REPORT_FAIL
>>"%LOG%" echo.
>>"%LOG%" echo [R2134_REPORT]
type "%REPORT%" >>"%LOG%" 2>&1
>>"%LOG%" echo.
>>"%LOG%" echo FINAL_EXIT_CODE=0
>>"%LOG%" echo ENDED=%DATE% %TIME%

echo DONE: R2134_R24_BENCHMARK_REPAIR_COMPLETE
echo RESULT=%LOG%
exit /b 0

:NODE_FAIL
>>"%LOG%" echo [FAIL] R2134_NODE_NOT_FOUND
goto :FAIL
:SCRIPT_FAIL
>>"%LOG%" echo [FAIL] R2134_SCRIPT_NOT_FOUND
goto :FAIL
:TEST_FILE_FAIL
>>"%LOG%" echo [FAIL] R2134_TEST_FILE_NOT_FOUND
goto :FAIL
:TEST_FAIL
>>"%LOG%" echo [FAIL] R2134_TEST_FAILED
goto :FAIL
:RUN_FAIL
>>"%LOG%" echo [FAIL] R2134_RUNTIME_FAILED
goto :FAIL
:REPORT_FAIL
>>"%LOG%" echo [FAIL] R2134_REPORT_NOT_FOUND
goto :FAIL
:FAIL
>>"%LOG%" echo FINAL_EXIT_CODE=1
>>"%LOG%" echo ENDED=%DATE% %TIME%
echo R2134_BENCHMARK_REPAIR_FAILED
echo RESULT=%LOG%
exit /b 1
