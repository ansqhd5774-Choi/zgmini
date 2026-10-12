@echo off
setlocal EnableExtensions
chcp 65001 >nul
set "BASE=%USERPROFILE%\.zgmini\pc-writer"
set "LOG=%BASE%\ZGMINI-sector-fear-greed-r21327-five-axis-source-span-log.txt"
>"%LOG%" echo ============================================================
>>"%LOG%" echo ZGMINI SECTOR FEAR ^& GREED R2.13.27 FIVE-AXIS SOURCE SPAN
>>"%LOG%" echo STARTED=%DATE% %TIME%
>>"%LOG%" echo ============================================================
>>"%LOG%" echo [SCOPE]
>>"%LOG%" echo PROVIDER_CALLS=0
>>"%LOG%" echo PUBLIC_MUTATION=NO
>>"%LOG%" echo D1_MUTATION=NO
>>"%LOG%" echo PRODUCTION_FORMULA_CHANGE=NO
>>"%LOG%" echo REFERENCE_REQUIREMENT_CHANGE=NO
>>"%LOG%" echo APPROVED_R1_REFERENCE=756_UNCHANGED
>>"%LOG%" echo.
>>"%LOG%" echo [1/2] R2.13.27 dedicated tests
node --test tests\sector-fear-greed-r21327-five-axis-source-span.test.mjs >>"%LOG%" 2>&1
set "TEST_EXIT=%ERRORLEVEL%"
>>"%LOG%" echo TEST_EXIT=%TEST_EXIT%
if not "%TEST_EXIT%"=="0" exit /b %TEST_EXIT%
>>"%LOG%" echo [2/2] Local-only five-axis source span diagnostic
node scripts\pc-writer\sector-fear-greed-r21327-five-axis-source-span.mjs >>"%LOG%" 2>&1
set "RUNTIME_EXIT=%ERRORLEVEL%"
>>"%LOG%" echo RUNTIME_EXIT=%RUNTIME_EXIT%
if exist "%BASE%\local-sector-fear-greed-r21327-five-axis-source-span.txt" (
  >>"%LOG%" echo.
  >>"%LOG%" echo ============================================================
  >>"%LOG%" echo [R21327_REPORT]
  >>"%LOG%" echo ============================================================
  type "%BASE%\local-sector-fear-greed-r21327-five-axis-source-span.txt" >>"%LOG%"
)
>>"%LOG%" echo.
>>"%LOG%" echo STATUS=SHADOW_R21327_FIVE_AXIS_SOURCE_SPAN_COMPLETE
>>"%LOG%" echo FINAL_EXIT_CODE=%RUNTIME_EXIT%
if not "%RUNTIME_EXIT%"=="0" exit /b %RUNTIME_EXIT%
echo R2.13.27 COMPLETE
exit /b 0
