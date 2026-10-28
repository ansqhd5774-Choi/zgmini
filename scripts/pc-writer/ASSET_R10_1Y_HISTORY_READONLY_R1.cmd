@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem One-click coverage audit. No PC SQLite, D1, score or deployment writes.
set "NODE_EXE=E:\ZGmini\runtime\node.exe"
if not defined ZGMINI_PC_HOME set "ZGMINI_PC_HOME=E:\ZGmini\data\pc-writer"
set "LOG_DIR=%USERPROFILE%\Desktop"
if not exist "%LOG_DIR%\" if exist "%USERPROFILE%\OneDrive\Desktop\" set "LOG_DIR=%USERPROFILE%\OneDrive\Desktop"
if not exist "%LOG_DIR%\" set "LOG_DIR=%TEMP%"
set "LOG=%LOG_DIR%\ASSET_R10_1Y_HISTORY_READONLY_RESULT_%RANDOM%_%RANDOM%.txt"
> "%LOG%" echo ZGMINI_ASSET_R10_1Y_HISTORY_READONLY_R1
>> "%LOG%" echo PC_SQLITE_WRITES=DISABLED
>> "%LOG%" echo D1_WRITES=DISABLED
>> "%LOG%" echo SCORE_WRITES=DISABLED
>> "%LOG%" echo DEPLOYMENTS=DISABLED
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
set "READONLY=%TEMP%\ZGMINI_ASSET_R10_1Y_%RANDOM%_%RANDOM%"
if exist "%READONLY%\" (
 >> "%LOG%" echo ERROR=ISOLATED_CHECKOUT_EXISTS
 goto :failed
)
>> "%LOG%" echo STAGE=CLONE_ISOLATED_TOOLS_FROM_EXISTING_WORK_BRANCH
git clone --quiet --depth 1 --single-branch --branch codex/api-site-integration-r1-20261026 https://github.com/ansqhd5774-Choi/zgmini.git "%READONLY%" >> "%LOG%" 2>&1
if errorlevel 1 (
 >> "%LOG%" echo ERROR=EXISTING_WORK_BRANCH_CLONE_FAILED
 goto :failed
)
set "RUNNER=%READONLY%\scripts\pc-writer\ASSET_R10_1Y_HISTORY_READONLY_R1.mjs"
if not exist "%RUNNER%" (
 >> "%LOG%" echo ERROR=ONE_YEAR_RUNNER_NOT_FOUND
 goto :failed
)
for /f "delims=" %%H in ('git -C "%READONLY%" hash-object scripts/pc-writer/ASSET_R10_1Y_HISTORY_READONLY_R1.mjs') do set "RUNNER_HASH=%%H"
if /I not "%RUNNER_HASH%"=="c02af8c557baf9f41ff2f59d21f2ffb446334ec0" (
 >> "%LOG%" echo ERROR=ONE_YEAR_RUNNER_SHA_DRIFT
 goto :failed
)
for /f "delims=" %%H in ('git -C "%READONLY%" hash-object lib/diagnostic-layer/asset-bubble-r10-1y-history-readonly-r1.mjs') do set "HISTORY_HASH=%%H"
if /I not "%HISTORY_HASH%"=="f9835178e3d1da4a523ed600e8fce032e5d8351e" (
 >> "%LOG%" echo ERROR=ONE_YEAR_HISTORY_SHA_DRIFT
 goto :failed
)
for /f "delims=" %%H in ('git -C "%READONLY%" hash-object lib/diagnostic-layer/asset-bubble-r10-raw-evidence-r1.mjs') do set "APPROVED_HASH=%%H"
if /I not "%APPROVED_HASH%"=="29e5e793961a49fe9ab87f77de77e0eca6132da8" (
 >> "%LOG%" echo ERROR=APPROVED_TWO_POINT_EVIDENCE_SHA_DRIFT
 goto :failed
)
for /f "delims=" %%S in ('git -C "%READONLY%" rev-parse HEAD') do set "SOURCE_SHA=%%S"
>> "%LOG%" echo SOURCE_BRANCH=codex/api-site-integration-r1-20261026
>> "%LOG%" echo SOURCE_SHA=%SOURCE_SHA%
>> "%LOG%" echo STAGE=APPROVED_RAW_PARITY_AND_FIVE_QUARTER_COVERAGE
"%NODE_EXE%" "%RUNNER%" --dry-run >> "%LOG%" 2>&1
set "AUDIT_RC=%ERRORLEVEL%"
>> "%LOG%" echo AUDIT_EXIT_CODE=%AUDIT_RC%
if not "%AUDIT_RC%"=="0" (
 >> "%LOG%" echo ERROR=ASSET_R10_1Y_AUDIT_STOP
 goto :failed
)
>> "%LOG%" echo WRAPPER_RESULT=PASS_READONLY_AUDIT_EXECUTED
set "WRAPPER_RC=0"
goto :finish
:failed
>> "%LOG%" echo WRAPPER_RESULT=STOPPED_NO_RETRY
set "WRAPPER_RC=1"
:finish
echo.
echo LOG=%LOG%
type "%LOG%"
echo.
echo Send only the TXT evidence to the assistant. Do not send config or credentials.
pause
exit /b %WRAPPER_RC%
