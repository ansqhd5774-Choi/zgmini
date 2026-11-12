@echo off
chcp 65001 >nul
setlocal EnableExtensions

set "BASE=%USERPROFILE%\.zgmini\pc-writer"
set "LOG=%BASE%\ZGMINI-sector-fear-greed-r21328-five-axis-axis-span-log.txt"

> "%LOG%" echo ============================================================
>>"%LOG%" echo ZGMINI SECTOR FEAR ^& GREED R2.13.28
>>"%LOG%" echo FIVE-AXIS AXIS-SPAN DIAGNOSTIC
>>"%LOG%" echo STARTED=%DATE% %TIME%
>>"%LOG%" echo ============================================================
>>"%LOG%" echo [SCOPE]
>>"%LOG%" echo PROVIDER_CALLS=0
>>"%LOG%" echo MODE=LOCAL_READ_ONLY_AXIS_SPAN_DIAGNOSTIC
>>"%LOG%" echo PUBLIC_MUTATION=NO
>>"%LOG%" echo D1_MUTATION=NO
>>"%LOG%" echo DB_SCHEMA_CHANGE=NO
>>"%LOG%" echo PRODUCTION_FORMULA_CHANGE=NO
>>"%LOG%" echo REFERENCE_REQUIREMENT_CHANGE=NO
>>"%LOG%" echo APPROVED_R1_REFERENCE=756_UNCHANGED
>>"%LOG%" echo NORMALIZATION_CHANGE=NO
>>"%LOG%" echo WEIGHT_CHANGE=NO
>>"%LOG%" echo.

echo [1/2] R2.13.28 dedicated tests
>>"%LOG%" echo [1/2] R2.13.28 dedicated tests
node --test tests\sector-fear-greed-r21328-five-axis-axis-span.test.mjs >>"%LOG%" 2>&1
set "TEST_EXIT=%ERRORLEVEL%"
>>"%LOG%" echo TEST_EXIT=%TEST_EXIT%
if not "%TEST_EXIT%"=="0" goto :FAIL

echo [2/2] Local-only five-axis per-axis span diagnostic
>>"%LOG%" echo [2/2] Local-only five-axis per-axis span diagnostic
node scripts\pc-writer\sector-fear-greed-r21328-five-axis-axis-span.mjs >>"%LOG%" 2>&1
set "RUNTIME_EXIT=%ERRORLEVEL%"
>>"%LOG%" echo RUNTIME_EXIT=%RUNTIME_EXIT%
if not "%RUNTIME_EXIT%"=="0" goto :FAIL

if exist "%BASE%\local-sector-fear-greed-r21328-five-axis-axis-span.txt" (
  >>"%LOG%" echo.
  >>"%LOG%" echo ============================================================
  >>"%LOG%" echo [R21328_REPORT]
  >>"%LOG%" echo ============================================================
  type "%BASE%\local-sector-fear-greed-r21328-five-axis-axis-span.txt" >>"%LOG%"
)
>>"%LOG%" echo.
>>"%LOG%" echo STATUS=SHADOW_R21328_FIVE_AXIS_AXIS_SPAN_COMPLETE
>>"%LOG%" echo FINAL_EXIT_CODE=0
echo R2.13.28 COMPLETE
exit /b 0

:FAIL
>>"%LOG%" echo.
>>"%LOG%" echo STATUS=R21328_FAILED
>>"%LOG%" echo FINAL_EXIT_CODE=1
echo R2.13.28 FAILED
exit /b 1
