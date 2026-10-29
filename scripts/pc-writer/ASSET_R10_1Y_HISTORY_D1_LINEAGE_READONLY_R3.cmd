@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem R3 read-only diagnosis of already-stored D1 versus approved PC one-year history.
rem Never writes to D1/PC SQLite; never runs the history publisher.
set "NODE_EXE=E:\ZGmini\runtime\node.exe"
if not defined ZGMINI_PC_HOME set "ZGMINI_PC_HOME=E:\ZGmini\data\pc-writer"
set "LOG_DIR=%USERPROFILE%\Desktop"
if not exist "%LOG_DIR%\" if exist "%USERPROFILE%\OneDrive\Desktop\" set "LOG_DIR=%USERPROFILE%\OneDrive\Desktop"
if not exist "%LOG_DIR%\" set "LOG_DIR=%TEMP%"
set "LOG=%LOG_DIR%\ASSET_R10_1Y_HISTORY_D1_LINEAGE_R3_RESULT_%RANDOM%_%RANDOM%.txt"
> "%LOG%" echo ZGMINI_ASSET_R10_1Y_HISTORY_D1_LINEAGE_READONLY_R3
>> "%LOG%" echo MODE=READ_ONLY
>> "%LOG%" echo D1_WRITES=DISABLED
>> "%LOG%" echo PC_SQLITE_WRITES=DISABLED
>> "%LOG%" echo SCORING_WRITES=DISABLED
>> "%LOG%" echo NO_D1_APPLY=TRUE
if not defined TEMP (
 >> "%LOG%" echo ERROR=TEMP_NOT_CONFIGURED
 goto :failed
)
if not exist "%NODE_EXE%" (
 >> "%LOG%" echo ERROR=APPROVED_NODE_MISSING
 goto :failed
)
if not exist "%ZGMINI_PC_HOME%\storage\core.sqlite" (
 >> "%LOG%" echo ERROR=APPROVED_PC_SQLITE_MISSING
 goto :failed
)
where git.exe >nul 2>&1
if errorlevel 1 (
 >> "%LOG%" echo ERROR=GIT_NOT_FOUND
 goto :failed
)
set "ISOLATED=%TEMP%\ZGMINI_ASSET_R10_HISTORY_R3_DIAG_%RANDOM%_%RANDOM%"
if exist "%ISOLATED%\" (
 >> "%LOG%" echo ERROR=ISOLATED_SOURCE_ALREADY_EXISTS
 goto :failed
)
>> "%LOG%" echo STAGE=CLONE_EXISTING_WORK_BRANCH_READONLY
git clone --quiet --depth 1 --single-branch --branch codex/api-site-integration-r1-20261026 https://github.com/ansqhd5774-Choi/zgmini.git "%ISOLATED%" >> "%LOG%" 2>&1
if errorlevel 1 (
 >> "%LOG%" echo ERROR=APPROVED_WORK_BRANCH_CLONE_FAILED
 goto :failed
)
for /f "delims=" %%S in ('git -C "%ISOLATED%" rev-parse HEAD') do set "SOURCE_SHA=%%S"
>> "%LOG%" echo SOURCE_BRANCH=codex/api-site-integration-r1-20261026
>> "%LOG%" echo SOURCE_SHA=%SOURCE_SHA%
for /f "delims=" %%H in ('git -C "%ISOLATED%" hash-object scripts/pc-writer/ASSET_R10_1Y_HISTORY_D1_LINEAGE_READONLY_R3.mjs') do set "DIAG_HASH=%%H"
if /I not "%DIAG_HASH%"=="f75fe9e5f3737959d05f13f55fcde0b34d95b646" (
 >> "%LOG%" echo ERROR=DIAG_SOURCE_SHA_DRIFT
 goto :failed
)
for /f "delims=" %%H in ('git -C "%ISOLATED%" hash-object lib/diagnostic-layer/asset-bubble-r10-d1-lineage-r3.mjs') do set "DIFF_HASH=%%H"
if /I not "%DIFF_HASH%"=="39c2f3bc94eea4bb706889a074661e2f03b1924e" (
 >> "%LOG%" echo ERROR=DIFF_SOURCE_SHA_DRIFT
 goto :failed
)
for /f "delims=" %%H in ('git -C "%ISOLATED%" hash-object scripts/pc-writer/ASSET_R10_1Y_HISTORY_READONLY_R1.mjs') do set "AUDIT_HASH=%%H"
if /I not "%AUDIT_HASH%"=="c02af8c557baf9f41ff2f59d21f2ffb446334ec0" (
 >> "%LOG%" echo ERROR=HISTORY_AUDIT_SHA_DRIFT
 goto :failed
)
for /f "delims=" %%H in ('git -C "%ISOLATED%" hash-object worker/asset-bubble-r10-raw-r1.mjs') do set "RAW_HASH=%%H"
if /I not "%RAW_HASH%"=="35c321df10b90072cec044abe181d180aa2c349e" (
 >> "%LOG%" echo ERROR=RAW_VALIDATOR_SHA_DRIFT
 goto :failed
)
for /f "delims=" %%H in ('git -C "%ISOLATED%" hash-object worker/asset-bubble-r10-history-r1.mjs') do set "HISTORY_HASH=%%H"
if /I not "%HISTORY_HASH%"=="6749a1f6a767a3a5f5cda3258870f46658cb8640" (
 >> "%LOG%" echo ERROR=HISTORY_VALIDATOR_SHA_DRIFT
 goto :failed
)
>> "%LOG%" echo STAGE=READONLY_APPROVED_PC_AND_TWO_D1_KEYS
"%NODE_EXE%" "%ISOLATED%\scripts\pc-writer\ASSET_R10_1Y_HISTORY_D1_LINEAGE_READONLY_R3.mjs" --read-only >> "%LOG%" 2>&1
set "DIAG_RC=%ERRORLEVEL%"
>> "%LOG%" echo DIAG_EXIT_CODE=%DIAG_RC%
if not "%DIAG_RC%"=="0" (
 >> "%LOG%" echo ERROR=ASSET_R10_HISTORY_D1_DIAG_STOP_NO_RETRY
 goto :failed
)
>> "%LOG%" echo WRAPPER_RESULT=PASS_READONLY_DIAG_EXECUTED
set "EXIT_RC=0"
goto :finish
:failed
>> "%LOG%" echo WRAPPER_RESULT=STOPPED_NO_RETRY
set "EXIT_RC=1"
:finish
echo.
echo LOG=%LOG%
type "%LOG%"
echo.
echo Send only this TXT. Do NOT retry R2 D1 apply.
pause
exit /b %EXIT_RC%
