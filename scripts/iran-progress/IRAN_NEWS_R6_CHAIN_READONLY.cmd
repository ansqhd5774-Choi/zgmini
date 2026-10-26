@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem Inspect existing R13 task -> VBS -> Node chain; do not change any operating files.
set "ZG_R6_LOG=%~dp0IRAN_NEWS_R6_CHAIN_READONLY_RESULT.txt"
set "ZG_R6_HELPER=%~dp0IRAN_NEWS_R6_CHAIN_HELPER.mjs"
set "ZG_R6_SOURCE=https://raw.githubusercontent.com/ansqhd5774-Choi/zgmini/aebf0b7e19d09c5f4492b318ac4a95a9c62bd613/scripts/iran-progress/news-display-chain-audit-r6.mjs"
> "%ZG_R6_LOG%" echo ZGMINI Iran News R6 - Existing R13 Launcher Lineage READ ONLY
>> "%ZG_R6_LOG%" echo Pinned SHA: aebf0b7e19d09c5f4492b318ac4a95a9c62bd613
>> "%ZG_R6_LOG%" echo No changes to task, VBS, runner, score, cache, ledger or D1.
if exist "%ZG_R6_HELPER%" (
 >> "%ZG_R6_LOG%" echo STOP: existing helper path preserved
 goto :failed_no_cleanup
)
where node >nul 2>nul
if errorlevel 1 goto :failed_no_cleanup
where curl >nul 2>nul
if errorlevel 1 goto :failed_no_cleanup
>> "%ZG_R6_LOG%" echo [1] Download fixed read-only lineage verifier
curl --fail --location --silent --show-error --max-time 30 "%ZG_R6_SOURCE%" --output "%ZG_R6_HELPER%" >> "%ZG_R6_LOG%" 2>&1
if errorlevel 1 goto :failed_cleanup
>> "%ZG_R6_LOG%" echo [2] Inspect task VBS and Node script identity without exposing contents
node "%ZG_R6_HELPER%" --read-only >> "%ZG_R6_LOG%" 2>&1
set "ZG_R6_EXIT=%ERRORLEVEL%"
if exist "%ZG_R6_HELPER%" del /q "%ZG_R6_HELPER%" >nul 2>nul
if not "%ZG_R6_EXIT%"=="0" goto :failed_no_cleanup
>> "%ZG_R6_LOG%" echo FINAL_STATUS=PASS_R6_CHAIN_READ_ONLY
echo Finished. Upload IRAN_NEWS_R6_CHAIN_READONLY_RESULT.txt.
exit /b 0
:failed_cleanup
if exist "%ZG_R6_HELPER%" del /q "%ZG_R6_HELPER%" >nul 2>nul
:failed_no_cleanup
>> "%ZG_R6_LOG%" echo FINAL_STATUS=STOP_R6_CHAIN_READ_ONLY
echo Read-only audit stopped. Upload IRAN_NEWS_R6_CHAIN_READONLY_RESULT.txt.
exit /b 1
