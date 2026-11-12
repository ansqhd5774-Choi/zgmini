@echo off
chcp 65001 >nul
setlocal EnableExtensions

set "BASE=%USERPROFILE%\.zgmini\pc-writer"
set "LOG=%BASE%\ZGMINI-sector-fear-greed-r21331-alpaca-sector-etf-backfill-log.txt"

if not exist "%BASE%" mkdir "%BASE%"
>"%LOG%" echo ============================================================
>>"%LOG%" echo ZGMINI SECTOR FEAR ^& GREED R2.13.31
>>"%LOG%" echo APPROVED ALPACA 11-SECTOR-ETF BACKFILL
>>"%LOG%" echo STARTED=%DATE% %TIME%
>>"%LOG%" echo ============================================================
>>"%LOG%" echo [SCOPE]
>>"%LOG%" echo PROVIDER=ALPACA_ONLY
>>"%LOG%" echo MAX_PROVIDER_REQUESTS=1
>>"%LOG%" echo TARGETS=11_SECTOR_ETFS_ONLY
>>"%LOG%" echo WINDOW=2024-04-09..2024-08-14
>>"%LOG%" echo EXPECTED_SESSIONS=89
>>"%LOG%" echo FEED=iex
>>"%LOG%" echo ADJUSTMENT=split
>>"%LOG%" echo SPY_PROVIDER_CALL=NO
>>"%LOG%" echo PUBLIC_MUTATION=NO
>>"%LOG%" echo D1_MUTATION=NO
>>"%LOG%" echo PRODUCTION_FORMULA_CHANGE=NO
>>"%LOG%" echo REFERENCE_REQUIREMENT_CHANGE=NO
>>"%LOG%" echo APPROVED_R1_REFERENCE=756_UNCHANGED
>>"%LOG%" echo.

>>"%LOG%" echo [1/2] R2.13.31 dedicated tests
node --test tests\sector-fear-greed-r21331-alpaca-sector-etf-backfill.test.mjs >>"%LOG%" 2>&1
set "TEST_EXIT=%ERRORLEVEL%"
>>"%LOG%" echo TEST_EXIT=%TEST_EXIT%
if not "%TEST_EXIT%"=="0" exit /b %TEST_EXIT%

>>"%LOG%" echo [2/2] Approved Alpaca one-request sector ETF backfill
node scripts\pc-writer\sector-fear-greed-r21331-alpaca-sector-etf-backfill.mjs >>"%LOG%" 2>&1
set "RUNTIME_EXIT=%ERRORLEVEL%"
>>"%LOG%" echo RUNTIME_EXIT=%RUNTIME_EXIT%
if not "%RUNTIME_EXIT%"=="0" exit /b %RUNTIME_EXIT%

>>"%LOG%" echo STATUS=R21331_COMPLETE
exit /b 0
