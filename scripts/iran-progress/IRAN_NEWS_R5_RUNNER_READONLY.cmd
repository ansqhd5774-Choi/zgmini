@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem GOV.UK news-only R5: investigate the existing R13 task and PC cache.
rem This script does NOT collect, delete, publish, schedule or change score data.
set "ZG_R5_LOG=%~dp0IRAN_NEWS_R5_RUNNER_READONLY_RESULT.txt"
set "ZG_R5_HELPER=%~dp0IRAN_NEWS_R5_RUNNER_AUDIT_HELPER.mjs"
set "ZG_R5_SOURCE=https://raw.githubusercontent.com/ansqhd5774-Choi/zgmini/eea57dcb93e53cf64586b1ec69844191dfdfde1a/scripts/iran-progress/news-display-runner-audit-r5.mjs"
> "%ZG_R5_LOG%" echo ZGMINI Iran News R5 - Existing R13 Runner Read-Only Audit
>> "%ZG_R5_LOG%" echo Source SHA: eea57dcb93e53cf64586b1ec69844191dfdfde1a
>> "%ZG_R5_LOG%" echo No scheduler, PC cache, R3/R5 ledger, D1 or public page modifications.
>> "%ZG_R5_LOG%" echo.
if exist "%ZG_R5_HELPER%" (
 >> "%ZG_R5_LOG%" echo STOP: audit helper name is already occupied. Existing file preserved.
 goto :failed_no_cleanup
)
where node >nul 2>nul
if errorlevel 1 goto :failed_no_cleanup
where curl >nul 2>nul
if errorlevel 1 goto :failed_no_cleanup
>> "%ZG_R5_LOG%" echo [1] Download approved read-only source from immutable commit
curl --fail --location --silent --show-error --max-time 30 "%ZG_R5_SOURCE%" --output "%ZG_R5_HELPER%" >> "%ZG_R5_LOG%" 2>&1
if errorlevel 1 goto :failed_cleanup
>> "%ZG_R5_LOG%" echo [2] Audit registered task action and isolated news cache WITHOUT writing
node "%ZG_R5_HELPER%" --read-only >> "%ZG_R5_LOG%" 2>&1
set "ZG_R5_CODE=%ERRORLEVEL%"
if exist "%ZG_R5_HELPER%" del /q "%ZG_R5_HELPER%" >nul 2>nul
if not "%ZG_R5_CODE%"=="0" goto :failed_no_cleanup
>> "%ZG_R5_LOG%" echo FINAL_STATUS=PASS_READ_ONLY_RUNNER_AUDIT
echo Read-only audit finished. Upload IRAN_NEWS_R5_RUNNER_READONLY_RESULT.txt.
exit /b 0
:failed_cleanup
if exist "%ZG_R5_HELPER%" del /q "%ZG_R5_HELPER%" >nul 2>nul
:failed_no_cleanup
>> "%ZG_R5_LOG%" echo FINAL_STATUS=STOP_READ_ONLY_RUNNER_AUDIT
echo Read-only audit stopped. Upload IRAN_NEWS_R5_RUNNER_READONLY_RESULT.txt.
exit /b 1
