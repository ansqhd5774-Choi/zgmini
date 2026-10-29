@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem R4: archive-verified 2026-10-28 genuine history; only history D1 key may be written.
rem The publisher MUST run from a clean latest main, while discovery uses existing working branch.
set "REPO_URL=https://github.com/ansqhd5774-Choi/zgmini.git"
set "ZGMINI_ASSET_R10_ARCHIVED_AUDIT=%~dp0ASSET_R10_1Y_HISTORY_READONLY_RESULT_29981_21772.txt"
set "NODE_EXE=E:\ZGmini\runtime\node.exe"
if not defined ZGMINI_PC_HOME set "ZGMINI_PC_HOME=E:\ZGmini\data\pc-writer"
set "LOG_DIR=%USERPROFILE%\Desktop"
if not exist "%LOG_DIR%\" if exist "%USERPROFILE%\OneDrive\Desktop\" set "LOG_DIR=%USERPROFILE%\OneDrive\Desktop"
if not exist "%LOG_DIR%\" set "LOG_DIR=%TEMP%"
set "LOG=%LOG_DIR%\ASSET_R10_1Y_HISTORY_D1_R4_RESULT_%RANDOM%_%RANDOM%.txt"
> "%LOG%" echo ZGMINI_ASSET_R10_1Y_HISTORY_D1_R4_ARCHIVED
>> "%LOG%" echo ALLOWED_D1_KEY=detail:asset-bubble-history:r1
>> "%LOG%" echo PC_SQLITE_WRITES=DISABLED
>> "%LOG%" echo SCORE_WRITES=DISABLED
>> "%LOG%" echo SCHEDULER_CHANGES=DISABLED
>> "%LOG%" echo DEPLOYMENTS=DISABLED
>> "%LOG%" echo NO_AUTOMATIC_WRITE_RETRY=TRUE
if not exist "%ZGMINI_ASSET_R10_ARCHIVED_AUDIT%" (
 >> "%LOG%" echo ERROR=APPROVED_ARCHIVED_AUDIT_FILE_MISSING
 goto :failed
)
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
set "PUBLISHER=%TEMP%\ZGMINI_ASSET_R10_HISTORY_MAIN_%RANDOM%_%RANDOM%"
set "DISCOVERY_ROOT=%TEMP%\ZGMINI_ASSET_R10_DISCOVER_%RANDOM%_%RANDOM%"
if exist "%PUBLISHER%\" (
 >> "%LOG%" echo ERROR=PUBLISHER_ISOLATION_EXISTS
 goto :failed
)
if exist "%DISCOVERY_ROOT%\" (
 >> "%LOG%" echo ERROR=DISCOVERY_ISOLATION_EXISTS
 goto :failed
)
>> "%LOG%" echo STAGE=CLONE_LATEST_MAIN_APPROVED_ARCHIVE_PUBLISHER
git clone --quiet --depth 1 --single-branch --branch main "%REPO_URL%" "%PUBLISHER%" >> "%LOG%" 2>&1
if errorlevel 1 (
 >> "%LOG%" echo ERROR=MAIN_PUBLISHER_CLONE_FAILED
 goto :failed
)
for /f "delims=" %%S in ('git -C "%PUBLISHER%" rev-parse HEAD') do set "PUBLISHER_SHA=%%S"
for /f "delims=" %%B in ('git -C "%PUBLISHER%" branch --show-current') do set "PUBLISHER_BRANCH=%%B"
if /I not "%PUBLISHER_BRANCH%"=="main" (
 >> "%LOG%" echo ERROR=PUBLISHER_NOT_MAIN
 goto :failed
)
>> "%LOG%" echo PUBLISHER_BRANCH=main
>> "%LOG%" echo PUBLISHER_SHA=%PUBLISHER_SHA%
set "RUNNER=%PUBLISHER%\scripts\pc-writer\ASSET_R10_1Y_HISTORY_ARCHIVED_D1_ONE_SHOT_R4.mjs"
if not exist "%RUNNER%" (
 >> "%LOG%" echo ERROR=MAIN_HISTORY_ONE_SHOT_MISSING
 goto :failed
)
for /f "delims=" %%H in ('git -C "%PUBLISHER%" hash-object scripts/pc-writer/ASSET_R10_1Y_HISTORY_D1_ONE_SHOT_R1.mjs') do set "RUNNER_HASH=%%H"
if /I not "%RUNNER_HASH%"=="413bd96d27887a3620794a81da0f5899c4fe7c1a" (
 >> "%LOG%" echo ERROR=HISTORY_ONE_SHOT_SHA_DRIFT
 goto :failed
)
for /f "delims=" %%H in ('git -C "%PUBLISHER%" hash-object lib/diagnostic-layer/asset-bubble-r10-history-archive-r4.mjs') do set "ARCHIVE_HASH=%%H"
if /I not "%ARCHIVE_HASH%"=="4755dd211b21d202d64c4a1916aae2013b5c05a7" (
 >> "%LOG%" echo ERROR=ARCHIVE_SOURCE_SHA_DRIFT
 goto :failed
)
for /f "delims=" %%H in ('git -C "%PUBLISHER%" hash-object worker/asset-bubble-r10-history-r1.mjs') do set "WRITER_HASH=%%H"
if /I not "%WRITER_HASH%"=="6749a1f6a767a3a5f5cda3258870f46658cb8640" (
 >> "%LOG%" echo ERROR=HISTORY_D1_WRITER_SHA_DRIFT
 goto :failed
)
for /f "delims=" %%H in ('git -C "%PUBLISHER%" hash-object scripts/pc-writer/ASSET_R10_1Y_HISTORY_READONLY_R1.mjs') do set "AUDIT_HASH=%%H"
if /I not "%AUDIT_HASH%"=="c02af8c557baf9f41ff2f59d21f2ffb446334ec0" (
 >> "%LOG%" echo ERROR=HISTORY_READONLY_AUDIT_SHA_DRIFT
 goto :failed
)
>> "%LOG%" echo STAGE=READONLY_ARCHIVED_20261028_PARITY_AND_CURRENT_PC_DRY_RUN
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
 >> "%LOG%" echo STAGE=CLONE_EXISTING_BRANCH_DISCOVERY_ONLY
 git clone --quiet --depth 1 --single-branch --branch codex/api-site-integration-r1-20261026 "%REPO_URL%" "%DISCOVERY_ROOT%" >> "%LOG%" 2>&1
 if errorlevel 1 (
  >> "%LOG%" echo ERROR=DISCOVERY_SOURCE_CLONE_FAILED
  goto :failed
 )
)
if not defined ZGMINI_ASSET_R10_OPERATIONAL_ROOT (
 for /f "delims=" %%H in ('git -C "%DISCOVERY_ROOT%" hash-object scripts/pc-writer/BEA_MFG_R6_FIND_OPERATIONAL.mjs') do set "DISCOVERY_HASH=%%H"
)
if not defined ZGMINI_ASSET_R10_OPERATIONAL_ROOT (
 if /I not "%DISCOVERY_HASH%"=="9324ce39555e7123623fb58bf63edc54f957d4d4" (
  >> "%LOG%" echo ERROR=DISCOVERY_HELPER_SHA_DRIFT
  goto :failed
 )
)
if not defined ZGMINI_ASSET_R10_OPERATIONAL_ROOT (
 >> "%LOG%" echo STAGE=DISCOVER_APPROVED_OPERATIONAL_ROOT_READONLY
 set "DISCOVERY_RESULT=%TEMP%\ZGMINI_ASSET_R10_HISTORY_ROOT_%RANDOM%_%RANDOM%.txt"
)
if not defined ZGMINI_ASSET_R10_OPERATIONAL_ROOT (
 "%NODE_EXE%" "%DISCOVERY_ROOT%\scripts\pc-writer\BEA_MFG_R6_FIND_OPERATIONAL.mjs" > "%DISCOVERY_RESULT%" 2>&1
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
>> "%LOG%" echo STAGE=CHECK_LATEST_MAIN_SHA_BEFORE_APPLY
set "REMOTE_MAIN_SHA="
for /f "tokens=1" %%S in ('git -C "%PUBLISHER%" ls-remote origin refs/heads/main') do set "REMOTE_MAIN_SHA=%%S"
if not defined REMOTE_MAIN_SHA (
 >> "%LOG%" echo ERROR=REMOTE_MAIN_VERIFY_FAILED
 goto :failed
)
if /I not "%REMOTE_MAIN_SHA%"=="%PUBLISHER_SHA%" (
 >> "%LOG%" echo ERROR=MAIN_CHANGED_SINCE_PUBLISHER_CLONE
 goto :failed
)
>> "%LOG%" echo STAGE=ARCHIVED_HISTORY_D1_EXACT_28_OCT_RAW_LINEAGE_AND_SINGLE_KEY_APPLY
"%NODE_EXE%" "%RUNNER%" --apply --confirm-asset-r10-history-d1-write >> "%LOG%" 2>&1
set "APPLY_RC=%ERRORLEVEL%"
>> "%LOG%" echo APPLY_EXIT_CODE=%APPLY_RC%
if not "%APPLY_RC%"=="0" (
 >> "%LOG%" echo ERROR=ASSET_R10_HISTORY_D1_APPLY_STOP_NO_RETRY
 goto :failed
)
>> "%LOG%" echo WRAPPER_RESULT=PASS_D1_READBACK_OR_ALREADY_STORED
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
echo Send only R4 TXT; do not repeat on failure. Never send config, database, credentials.
pause
exit /b %EXIT_RC%
