@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "NODE_EXE=E:\ZGmini\runtime\node.exe"
if not defined ZGMINI_PC_HOME set "ZGMINI_PC_HOME=E:\ZGmini\data\pc-writer"
if not defined ZGMINI_ASSET_R10_OPERATIONAL_ROOT if defined ZGMINI_EARNINGS_C_OPERATIONAL_ROOT set "ZGMINI_ASSET_R10_OPERATIONAL_ROOT=%ZGMINI_EARNINGS_C_OPERATIONAL_ROOT%"
set "LOG_DIR=%USERPROFILE%\Desktop"
if not exist "%LOG_DIR%\" if exist "%USERPROFILE%\OneDrive\Desktop\" set "LOG_DIR=%USERPROFILE%\OneDrive\Desktop"
if not exist "%LOG_DIR%\" set "LOG_DIR=%TEMP%"
set "LOG=%LOG_DIR%\ASSET_R10_RAW_D1_RESULT_%RANDOM%_%RANDOM%.txt"
> "%LOG%" echo ZGMINI_ASSET_R10_RAW_R2_D1_SINGLE_KEY
>> "%LOG%" echo ALLOWED_D1_KEY=detail:asset-bubble-raw:r1
>> "%LOG%" echo PC_SQLITE_WRITES=DISABLED
>> "%LOG%" echo SCORE_WRITES=DISABLED
>> "%LOG%" echo DEPLOYMENTS=DISABLED
>> "%LOG%" echo NO_AUTOMATIC_WRITE_RETRY=TRUE
if not exist "%NODE_EXE%" (
 >> "%LOG%" echo ERROR=APPROVED_NODE_MISSING
 goto :failed
)
if not exist "%ZGMINI_PC_HOME%\storage\core.sqlite" (
 >> "%LOG%" echo ERROR=APPROVED_PC_SQLITE_MISSING
 goto :failed
)
if not defined ZGMINI_ASSET_R10_OPERATIONAL_ROOT (
 >> "%LOG%" echo ERROR=APPROVED_OPERATIONAL_ROOT_NOT_CONFIGURED
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
set "PUBLISHER=%TEMP%\ZGMINI_ASSET_R10_D1_R2_%RANDOM%_%RANDOM%"
if exist "%PUBLISHER%\" (
 >> "%LOG%" echo ERROR=ISOLATED_PUBLISHER_ALREADY_EXISTS
 goto :failed
)
>> "%LOG%" echo STAGE=CLONE_CURRENT_MAIN_ISOLATED_PUBLISHER
git clone --quiet --depth 1 --single-branch --branch main https://github.com/ansqhd5774-Choi/zgmini.git "%PUBLISHER%" >> "%LOG%" 2>&1
if errorlevel 1 (
 >> "%LOG%" echo ERROR=MAIN_CLONE_FAILED
 goto :failed
)
for /f "delims=" %%H in ('git -C "%PUBLISHER%" hash-object scripts/pc-writer/ASSET_R10_RAW_D1_ONE_SHOT_R2.mjs') do set "WRITER_HASH=%%H"
if /I not "%WRITER_HASH%"=="a790e9acfa63ea91f7110ab9f839d710f533b003" (
 >> "%LOG%" echo ERROR=APPROVED_WRITER_SHA_DRIFT
 goto :failed
)
for /f "delims=" %%H in ('git -C "%PUBLISHER%" hash-object worker/asset-bubble-r10-raw-r1.mjs') do set "READER_HASH=%%H"
if /I not "%READER_HASH%"=="4f5d38c36f71443e0f644f7c4c48637de40dd81a" (
 >> "%LOG%" echo ERROR=APPROVED_RAW_CONTRACT_SHA_DRIFT
 goto :failed
)
for /f "delims=" %%H in ('git -C "%PUBLISHER%" hash-object scripts/pc-writer/ASSET_R10_RAW_PREFLIGHT_R1.mjs') do set "PREFLIGHT_HASH=%%H"
if /I not "%PREFLIGHT_HASH%"=="66ae83d5b7989a92de73bdfa380f9cdd2b217353" (
 >> "%LOG%" echo ERROR=APPROVED_PREFLIGHT_SHA_DRIFT
 goto :failed
)
for /f "delims=" %%H in ('git -C "%PUBLISHER%" hash-object lib/diagnostic-layer/asset-bubble-r10-raw-evidence-r1.mjs') do set "EVIDENCE_HASH=%%H"
if /I not "%EVIDENCE_HASH%"=="29e5e793961a49fe9ab87f77de77e0eca6132da8" (
 >> "%LOG%" echo ERROR=APPROVED_RECONSTRUCTION_SHA_DRIFT
 goto :failed
)
for /f "delims=" %%S in ('git -C "%PUBLISHER%" rev-parse HEAD') do set "SOURCE_SHA=%%S"
>> "%LOG%" echo PUBLISHER_BRANCH=main
>> "%LOG%" echo PUBLISHER_SHA=%SOURCE_SHA%
>> "%LOG%" echo STAGE=VALIDATE_STORED_PC_AND_D1_READBACK_ONCE
"%NODE_EXE%" "%PUBLISHER%\scripts\pc-writer\ASSET_R10_RAW_D1_ONE_SHOT_R2.mjs" --apply --confirm-asset-r10-raw-d1-write >> "%LOG%" 2>&1
set "RUN_RC=%ERRORLEVEL%"
>> "%LOG%" echo RUN_EXIT_CODE=%RUN_RC%
if not "%RUN_RC%"=="0" (
 >> "%LOG%" echo ERROR=ASSET_R10_RAW_D1_STOP_NO_RETRY
 goto :failed
)
>> "%LOG%" echo WRAPPER_RESULT=PASS_D1_READBACK_OR_ALREADY_STORED
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
echo Send only this TXT evidence. Never send config.json or credentials.
pause
exit /b %WRAPPER_RC%
