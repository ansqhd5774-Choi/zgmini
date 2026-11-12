@echo off
setlocal EnableExtensions DisableDelayedExpansion

for %%I in ("%~dp0..\..") do set "ROOT=%%~fI"
set "BASE=%USERPROFILE%\.zgmini\pc-writer"
set "SCRIPT=%ROOT%\scripts\pc-writer\sector-fear-greed-r2133-local-benchmark-inventory.mjs"
set "TEST=%ROOT%\tests\sector-fear-greed-r2133-local-benchmark-inventory.test.mjs"
set "REPORT=%BASE%\local-sector-fear-greed-r2133-local-benchmark-inventory.txt"
set "LOG=%BASE%\ZGMINI-sector-fear-greed-r2133-r24-0827-provenance-log.txt"
set "HEAD=UNKNOWN"

if not exist "%BASE%" (
  echo R2133_PC_BASE_MISSING
  exit /b 2
)
if not exist "%SCRIPT%" (
  echo R2133_SCRIPT_MISSING
  exit /b 3
)
if not exist "%TEST%" (
  echo R2133_TEST_FILE_MISSING
  exit /b 4
)
where node.exe >nul 2>&1
if errorlevel 1 (
  echo R2133_NODE_MISSING
  exit /b 5
)
where git.exe >nul 2>&1
if not errorlevel 1 for /f %%H in ('git -C "%ROOT%" rev-parse HEAD 2^>nul') do set "HEAD=%%H"

>"%LOG%" echo ============================================================
>>"%LOG%" echo ZGMINI SECTOR FEAR ^& GREED R2.13.3 2026-08-27 PROVENANCE
>>"%LOG%" echo STARTED=%DATE% %TIME%
>>"%LOG%" echo HEAD=%HEAD%
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
>>"%LOG%" echo.

>>"%LOG%" echo [R2133_TEST]
node --test "%TEST%" >>"%LOG%" 2>&1
set "TEST_EXIT=%ERRORLEVEL%"
>>"%LOG%" echo R2133_TEST_EXIT=%TEST_EXIT%
if not "%TEST_EXIT%"=="0" goto :FAIL_TEST

>>"%LOG%" echo.
>>"%LOG%" echo [R2133_RUNTIME]
node "%SCRIPT%" >>"%LOG%" 2>&1
set "RUNTIME_EXIT=%ERRORLEVEL%"
>>"%LOG%" echo R2133_RUNTIME_EXIT=%RUNTIME_EXIT%
if not "%RUNTIME_EXIT%"=="0" goto :FAIL_RUNTIME

if not exist "%REPORT%" (
  >>"%LOG%" echo R2133_REPORT_MISSING
  >>"%LOG%" echo FINAL_EXIT_CODE=90
  echo R2133_REPORT_MISSING
  echo RESULT=%LOG%
  exit /b 90
)

>>"%LOG%" echo.
>>"%LOG%" echo [R2133_REPORT]
type "%REPORT%" >>"%LOG%"
>>"%LOG%" echo.
>>"%LOG%" echo FINAL_EXIT_CODE=0
>>"%LOG%" echo ENDED=%DATE% %TIME%
echo DONE: R2133_LOCAL_BENCHMARK_INVENTORY_COMPLETE
echo RESULT=%LOG%
exit /b 0

:FAIL_TEST
>>"%LOG%" echo FINAL_EXIT_CODE=%TEST_EXIT%
>>"%LOG%" echo ENDED=%DATE% %TIME%
echo R2133_TEST_FAILED
echo RESULT=%LOG%
exit /b %TEST_EXIT%

:FAIL_RUNTIME
>>"%LOG%" echo FINAL_EXIT_CODE=%RUNTIME_EXIT%
>>"%LOG%" echo ENDED=%DATE% %TIME%
echo R2133_RUNTIME_FAILED
echo RESULT=%LOG%
exit /b %RUNTIME_EXIT%
