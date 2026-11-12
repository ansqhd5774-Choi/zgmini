@echo off
setlocal EnableExtensions
chcp 65001 >nul

set "BASE=%USERPROFILE%\.zgmini\pc-writer"
set "LOG=%BASE%\ZGMINI-sector-fear-greed-r21329-five-axis-extension-feasibility-log.txt"
set "REPORT=%BASE%\local-sector-fear-greed-r21329-five-axis-extension-feasibility.txt"

>"%LOG%" echo ============================================================
>>"%LOG%" echo ZGMINI SECTOR FEAR ^& GREED R2.13.29
>>"%LOG%" echo FIVE-AXIS EXTENSION FEASIBILITY
>>"%LOG%" echo STARTED=%DATE% %TIME%
>>"%LOG%" echo ============================================================
>>"%LOG%" echo [SCOPE]
>>"%LOG%" echo PROVIDER_CALLS=0
>>"%LOG%" echo MODE=LOCAL_READ_ONLY_EXTENSION_FEASIBILITY
>>"%LOG%" echo PUBLIC_MUTATION=NO
>>"%LOG%" echo D1_MUTATION=NO
>>"%LOG%" echo DB_SCHEMA_CHANGE=NO
>>"%LOG%" echo PRODUCTION_FORMULA_CHANGE=NO
>>"%LOG%" echo REFERENCE_REQUIREMENT_CHANGE=NO
>>"%LOG%" echo APPROVED_R1_REFERENCE=756_UNCHANGED
>>"%LOG%" echo NORMALIZATION_CHANGE=NO
>>"%LOG%" echo WEIGHT_CHANGE=NO
>>"%LOG%" echo.

echo [1/2] R2.13.29 dedicated tests
>>"%LOG%" echo [1/2] R2.13.29 dedicated tests
node --test tests\sector-fear-greed-r21329-five-axis-extension-feasibility.test.mjs >>"%LOG%" 2>&1
set "TEST_EXIT=%ERRORLEVEL%"
>>"%LOG%" echo TEST_EXIT=%TEST_EXIT%
if not "%TEST_EXIT%"=="0" goto :FAIL

echo [2/2] Local-only five-axis extension feasibility
>>"%LOG%" echo [2/2] Local-only five-axis extension feasibility
node scripts\pc-writer\sector-fear-greed-r21329-five-axis-extension-feasibility.mjs >>"%LOG%" 2>&1
set "RUN_EXIT=%ERRORLEVEL%"
>>"%LOG%" echo RUNTIME_EXIT=%RUN_EXIT%
if not "%RUN_EXIT%"=="0" goto :FAIL

if not exist "%REPORT%" (
  >>"%LOG%" echo REPORT_MISSING=%REPORT%
  goto :FAIL
)

>>"%LOG%" echo.
>>"%LOG%" echo ============================================================
>>"%LOG%" echo [R21329_REPORT]
>>"%LOG%" echo ============================================================
type "%REPORT%" >>"%LOG%"
>>"%LOG%" echo.
>>"%LOG%" echo STATUS=SHADOW_R21329_FIVE_AXIS_EXTENSION_FEASIBILITY_COMPLETE
>>"%LOG%" echo FINAL_EXIT_CODE=0
echo R2.13.29 COMPLETE
exit /b 0

:FAIL
>>"%LOG%" echo.
>>"%LOG%" echo STATUS=R21329_FAILED
>>"%LOG%" echo FINAL_EXIT_CODE=1
echo R2.13.29 FAILED
exit /b 1
