@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem One-shot isolated history-key D1 publication. Never edits PC SQLite.
rem Run only AFTER the optional Cloudflare history reader is deployed.
set "NODE_EXE=E:\ZGmini\runtime\node.exe"
if not defined ZGMINI_PC_HOME set "ZGMINI_PC_HOME=E:\ZGmini\data\pc-writer"
set "LOG_DIR=%USERPROFILE%\Desktop"
if not exist "%LOG_DIR%\" if exist "%USERPROFILE%\OneDrive\Desktop\" set "LOG_DIR=%USERPROFILE%\OneDrive\Desktop"
if not exist "%LOG_DIR%\" set "LOG_DIR=%TEMP%"
set "LOG=%LOG_DIR%\ASSET_R10_1Y_HISTORY_D1_RESULT_%RANDOM%_%RANDOM%.txt"
> "%LOG%" echo ZGMINI_ASSET_R10_1Y_HISTORY_D1_R1
>> "%LOG%" echo ALLOWED_D1_KEY=detail:asset-bubble-history:r1
>> "%LOG%" echo PC_SQLITE_WRITES=DISABLED
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
set "ISOLATED=%TEMP%\ZGMINI_ASSET_R10_1Y_D1_%RANDOM%_%RANDOM%"
if exist "%ISOLATED%\" (
 >> "%LOG%" echo ERROR=ISOLATED_CHECKOUT_ALREADY_EXISTS
 goto :failed
)
>> "%LOG%" echo STAGE=CLONE_APPROVED_EXISTING_WORK_BRANCH
git clone --quiet --depth 1 --single-branch --branch codex/api-site-integration-r1-20261026 https://github.com/ansqhd5774-Choi/zgmini.git "%ISOLATED%" >> "%LOG%" 2>&1
if errorlevel 1 (
 >> "%LOG%" echo ERROR=APPROVED_BRANCH_CLONE_FAILED
 goto :failed
)
set "RUNNER=%ISOLATED%\scripts\pc-writer\ASSET_R10_1Y_HISTORY_D1_ONE_SHOT_R1.mjs"
if not exist "%RUNNER%" (
 >> "%LOG%" echo ERROR=HISTORY_ONE_SHOT_MISSING
 goto :failed
)
for /f "delims=" %%H in ('git -C "%ISOLATED%" hash-object scripts/pc-writer/ASSET_R10_1Y_HISTORY_D1_ONE_SHOT_R1.mjs') do set "RUNNER_HASH=%%H"
if /I not "%RUNNER_HASH%"=="4a1db8ae89db884617aac48026d38b8f274fd278" (
 >> "%LOG%" echo ERROR=HISTORY_ONE_SHOT_SHA_DRIFT
 goto :failed
)
for /f "delims=" %%H in ('git -C "%ISOLATED%" hash-object worker/asset-bubble-r10-history-r1.mjs') do set "WRITER_HASH=%%H"
if /I not "%WRITER_HASH%"=="6749a1f6a767a3a5f5cda3258870f46658cb8640" (
 >> "%LOG%" echo ERROR=HISTORY_D1_WRITER_SHA_DRIFT
 goto :failed
)
for /f "delims=" %%H in ('git -C "%ISOLATED%" hash-object scripts/pc-writer/ASSET_R10_1Y_HISTORY_READONLY_R1.mjs') do set "AUDIT_HASH=%%H"
if /I not "%AUDIT_HASH%"=="c02af8c557baf9f41ff2f59d21f2ffb446334ec0" (
 >> "%LOG%" echo ERROR=HISTORY_READONLY_AUDIT_SHA_DRIFT
 goto :failed
)
for /f "delims=" %%S in ('git -C "%ISOLATED%" rev-parse HEAD') do set "SOURCE_SHA=%%S"
>> "%LOG%" echo SOURCE_BRANCH=codex/api-site-integration-r1-20261026
>> "%LOG%" echo SOURCE_SHA=%SOURCE_SHA%
>> "%LOG%" echo STAGE=READONLY_APPROVED_SCORE_AND_HISTORY_DRY_RUN
"%NODE_EXE%" "%RUNNER%" --dry-run >> "%LOG%" 2>&1
if errorlevel 1 (
 >> "%LOG%" echo ERROR=HISTORY_D1_DRY_RUN_FAILED
 goto :failed
)
if not defined ZGMINI_ASSET_R10_OPERATIONAL_ROOT (
 if defined ZGMINI_EARNINGS_C_OPERATIONAL_ROOT (
  set "ZGMINI_ASSET_R10_OPERATIONAL_ROOT=%ZGMINI_EARNINGS_C_OPERATIONAL_ROOT%"
 )
)
if not defined ZGMINI_ASSET_R10_OPERATIONAL_ROOT (
 >> "%LOG%" echo STAGE=DISCOVER_APPROVED_OPERATIONAL_ROOT_READONLY
)
set "DISCOVERY=%ISOLATED%\scripts\pc-writer\BEA_MFG_R6_FIND_OPERATIONAL.mjs"
set "DISCOVERY_RESULT=%TEMP%\ZGMINI_ASSET_R10_HISTORY_ROOT_%RANDOM%_%RANDOM%.txt"
if not defined ZGMINI_ASSET_R10_OPERATIONAL_ROOT (
 "%NODE_EXE%" "%DISCOVERY%" > "%DISCOVERY_RESULT%" 2>&1
 if errorlevel 1 (
  >> "%LOG%" echo ERROR=APPROVED_OPERATIONAL_ROOT_DISCOVERY_FAILED
  goto :failed
 )
)
if not defined ZGMINI_ASSET_R10_OPERATIONAL_ROOT (
 set /p "ZGMINI_ASSET_R10_OPERATIONAL_ROOT="<"%DISCOVERY_RESULT%"
)
if not defined ZGMINI_ASSET_R10_OPERATIONAL_ROOT (
 >> "%LOG%" echo ERROR=APPROVED_OPERATIONAL_ROOT_EMPTY
 goto :failed
)
if not exist "%ZGMINI_ASSET_R10_OPERATIONAL_ROOT%\.git" (
 >> "%LOG%" echo ERROR=APPROVED_OPERATIONAL_ROOT_INVALID
 goto :failed
)
>> "%LOG%" echo STAGE=NEW_HISTORY_D1_KEY_APPLY_AFTER_OLD_RAW_LINEAGE_GATE
"%NODE_EXE%" "%RUNNER%" --apply --confirm-asset-r10-history-d1-write >> "%LOG%" 2>&1
set "APPLY_RC=%ERRORLEVEL%"
>> "%LOG%" echo APPLY_EXIT_CODE=%APPLY_RC%
if not "%APPLY_RC%"=="0" (
 >> "%LOG%" echo ERROR=ASSET_R10_HISTORY_D1_APPLY_STOP_NO_RETRY
 goto :failed
)
>> "%LOG%" echo WRAPPER_RESULT=PASS_D1_READBACK_VERIFIED
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
echo Send only this TXT. Never send config, database, or credentials.
pause
exit /b %EXIT_RC%
