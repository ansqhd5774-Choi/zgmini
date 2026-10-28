@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "NODE_EXE=E:\ZGmini\runtime\node.exe"
if not defined ZGMINI_PC_HOME set "ZGMINI_PC_HOME=E:\ZGmini\data\pc-writer"
set "LOG_DIR=%USERPROFILE%\Desktop"
if not exist "%LOG_DIR%\" if exist "%USERPROFILE%\OneDrive\Desktop\" set "LOG_DIR=%USERPROFILE%\OneDrive\Desktop"
if not exist "%LOG_DIR%\" set "LOG_DIR=%TEMP%"
set "LOG=%LOG_DIR%\ASSET_R10_RAW_PREFLIGHT_RESULT_%RANDOM%_%RANDOM%.txt"
> "%LOG%" echo ZGMINI_ASSET_R10_RAW_R1_READONLY
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
if not defined TEMP (
 >> "%LOG%" echo ERROR=TEMP_NOT_CONFIGURED
 goto :failed
)
set "READONLY=%TEMP%\ZGMINI_ASSET_R10_READONLY_%RANDOM%_%RANDOM%"
if exist "%READONLY%\" (
 >> "%LOG%" echo ERROR=READONLY_CHECKOUT_ALREADY_EXISTS
 goto :failed
)
>> "%LOG%" echo STAGE=CLONE_ISOLATED_READONLY_TOOL_FROM_EXISTING_WORK_BRANCH
git clone --quiet --depth 1 --single-branch --branch codex/api-site-integration-r1-20261026 https://github.com/ansqhd5774-Choi/zgmini.git "%READONLY%" >> "%LOG%" 2>&1
if errorlevel 1 (
 >> "%LOG%" echo ERROR=READONLY_WORK_BRANCH_CLONE_FAILED
 goto :failed
)
set "RUNNER=%READONLY%\scripts\pc-writer\ASSET_R10_RAW_PREFLIGHT_R1.mjs"
if not exist "%RUNNER%" (
 >> "%LOG%" echo ERROR=READONLY_RUNNER_NOT_FOUND
 goto :failed
)
for /f "delims=" %%H in ('git -C "%READONLY%" hash-object scripts/pc-writer/ASSET_R10_RAW_PREFLIGHT_R1.mjs') do set "RUNNER_HASH=%%H"
if /I not "%RUNNER_HASH%"=="66ae83d5b7989a92de73bdfa380f9cdd2b217353" (
 >> "%LOG%" echo ERROR=READONLY_RUNNER_SHA_DRIFT
 goto :failed
)
for /f "delims=" %%H in ('git -C "%READONLY%" hash-object lib/diagnostic-layer/asset-bubble-r10-raw-evidence-r1.mjs') do set "EVIDENCE_HASH=%%H"
if /I not "%EVIDENCE_HASH%"=="29e5e793961a49fe9ab87f77de77e0eca6132da8" (
 >> "%LOG%" echo ERROR=READONLY_EVIDENCE_SHA_DRIFT
 goto :failed
)
for /f "delims=" %%S in ('git -C "%READONLY%" rev-parse HEAD') do set "SOURCE_SHA=%%S"
>> "%LOG%" echo PREFLIGHT_BRANCH=codex/api-site-integration-r1-20261026
>> "%LOG%" echo PREFLIGHT_SOURCE_SHA=%SOURCE_SHA%
>> "%LOG%" echo STAGE=CHECK_STORED_R10_SOURCES_AND_SIX_SCORE_PARITY
"%NODE_EXE%" "%RUNNER%" --dry-run >> "%LOG%" 2>&1
set "READ_RC=%ERRORLEVEL%"
>> "%LOG%" echo PREFLIGHT_EXIT_CODE=%READ_RC%
if not "%READ_RC%"=="0" (
 >> "%LOG%" echo ERROR=ASSET_R10_RAW_PREFLIGHT_STOP
 goto :failed
)
>> "%LOG%" echo WRAPPER_RESULT=PASS_READONLY_NO_REMOTE_WRITES
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
echo Send only this TXT evidence to the assistant. Never send config.json or credentials.
pause
exit /b %WRAPPER_RC%
