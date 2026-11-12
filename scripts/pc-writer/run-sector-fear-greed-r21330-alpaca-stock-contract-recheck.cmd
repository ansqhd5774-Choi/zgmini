@echo off
setlocal EnableExtensions

set "BASE=%USERPROFILE%\.zgmini\pc-writer"
set "LOG=%BASE%\ZGMINI-sector-fear-greed-r21330-alpaca-stock-contract-recheck-log.txt"

if not exist "%BASE%" mkdir "%BASE%"

> "%LOG%" echo ============================================================
>>"%LOG%" echo ZGMINI SECTOR FEAR ^& GREED R2.13.30
>>"%LOG%" echo ALPACA STOCK CONTRACT RECHECK
>>"%LOG%" echo STARTED=%DATE% %TIME%
>>"%LOG%" echo ============================================================
>>"%LOG%" echo [SCOPE]
>>"%LOG%" echo PROVIDER_CALLS=0
>>"%LOG%" echo MODE=LOCAL_READ_ONLY_CONTRACT_ADAPTER_RECHECK
>>"%LOG%" echo RAW_ROWS_STORED=NO
>>"%LOG%" echo PUBLIC_MUTATION=NO
>>"%LOG%" echo D1_MUTATION=NO
>>"%LOG%" echo DB_SCHEMA_CHANGE=NO
>>"%LOG%" echo PRODUCTION_FORMULA_CHANGE=NO
>>"%LOG%" echo REFERENCE_REQUIREMENT_CHANGE=NO
>>"%LOG%" echo APPROVED_R1_REFERENCE=756_UNCHANGED
>>"%LOG%" echo NORMALIZATION_CHANGE=NO
>>"%LOG%" echo WEIGHT_CHANGE=NO
>>"%LOG%" echo.

>>"%LOG%" echo [1/2] R2.13.30 dedicated tests
call node --test tests\sector-fear-greed-r21330-alpaca-stock-contract-recheck.test.mjs >>"%LOG%" 2>&1
set "TEST_EXIT=%ERRORLEVEL%"
>>"%LOG%" echo TEST_EXIT=%TEST_EXIT%
if not "%TEST_EXIT%"=="0" exit /b %TEST_EXIT%

>>"%LOG%" echo [2/2] Local-only Alpaca row-contract recheck
call node scripts\pc-writer\sector-fear-greed-r21330-alpaca-stock-contract-recheck.mjs >>"%LOG%" 2>&1
set "RUNTIME_EXIT=%ERRORLEVEL%"
>>"%LOG%" echo RUNTIME_EXIT=%RUNTIME_EXIT%
if not "%RUNTIME_EXIT%"=="0" exit /b %RUNTIME_EXIT%

echo R2.13.30 COMPLETE
exit /b 0
