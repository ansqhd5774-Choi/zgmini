@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem R6B: read-only R13 VBS entrypoint audit. Allows extra .mjs arguments.
rem No scheduler, source, news cache, D1 or SQLite writes.
set "ZG_R6B_LOG=%~dp0IRAN_NEWS_R6B_CHAIN_READONLY_RESULT.txt"
set "ZG_R6B_HELPER=%~dp0IRAN_NEWS_R6B_CHAIN_HELPER.mjs"
set "ZG_R6B_SOURCE=https://raw.githubusercontent.com/ansqhd5774-Choi/zgmini/9d4655b55d6259399127695d1755fe00b1e63640/scripts/iran-progress/news-display-chain-audit-r6.mjs"
> "%ZG_R6B_LOG%" echo ZGMINI Iran News R6B - Fixed Read-Only Runner Chain Audit
>> "%ZG_R6B_LOG%" echo Pinned SHA: 9d4655b55d6259399127695d1755fe00b1e63640
>> "%ZG_R6B_LOG%" echo R6 fix: only first Node .mjs is entrypoint; subsequent .mjs are args.
>> "%ZG_R6B_LOG%" echo Existing R13 task, VBS, source, score, cache, ledger, D1: UNCHANGED.
if exist "%ZG_R6B_HELPER%" (
 >> "%ZG_R6B_LOG%" echo STOP: helper path already occupied; existing file preserved
 goto :failed_no_cleanup
)
where node >nul 2>nul
if errorlevel 1 goto :failed_no_cleanup
where curl >nul 2>nul
if errorlevel 1 goto :failed_no_cleanup
>> "%ZG_R6B_LOG%" echo [1] Get fixed helper at immutable commit
curl --fail --location --silent --show-error --max-time 30 "%ZG_R6B_SOURCE%" --output "%ZG_R6B_HELPER%" >> "%ZG_R6B_LOG%" 2>&1
if errorlevel 1 goto :failed_cleanup
>> "%ZG_R6B_LOG%" echo [2] Identify scheduled VBS then first Node entrypoint safely
node "%ZG_R6B_HELPER%" --read-only >> "%ZG_R6B_LOG%" 2>&1
set "ZG_R6B_EXIT=%ERRORLEVEL%"
if exist "%ZG_R6B_HELPER%" del /q "%ZG_R6B_HELPER%" >nul 2>nul
if not "%ZG_R6B_EXIT%"=="0" goto :failed_no_cleanup
>> "%ZG_R6B_LOG%" echo FINAL_STATUS=PASS_R6B_CHAIN_READ_ONLY
echo Finished. Upload IRAN_NEWS_R6B_CHAIN_READONLY_RESULT.txt.
exit /b 0
:failed_cleanup
if exist "%ZG_R6B_HELPER%" del /q "%ZG_R6B_HELPER%" >nul 2>nul
:failed_no_cleanup
>> "%ZG_R6B_LOG%" echo FINAL_STATUS=STOP_R6B_CHAIN_READ_ONLY
echo Read-only audit stopped. Upload IRAN_NEWS_R6B_CHAIN_READONLY_RESULT.txt.
exit /b 1
