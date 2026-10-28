@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem R48: existing R47 hourly collection then private R37 candidate stage.
rem Does not publish, write D1, or alter any scheduled tasks.
set "R48_R47=%~dp0THEME_NINE_R47_RECURRING_PRIVATE_UPDATE.cmd"
set "R48_STAGE=%~dp0theme-nine-r48-stage-current.mjs"
set "R48_BRIDGE=%~dp0theme-nine-r48-r47-bridge.mjs"
set "ZGMINI_R48_CONFIG_DIR=%~dp0"
set "R48_NODE=node"
if exist "E:\ZGmini\runtime\node.exe" set "R48_NODE=E:\ZGmini\runtime\node.exe"
set "R48_LOG=%~dp0THEME_NINE_R48_PRIVATE_CYCLE_%RANDOM%_%RANDOM%.txt"
if not exist "%R48_R47%" goto :missing
if not exist "%R48_STAGE%" goto :missing
if not exist "%R48_BRIDGE%" goto :missing
if exist "%R48_LOG%" goto :collision
>"%R48_LOG%" echo STATUS=START_R48_PRIVATE_CYCLE
call "%R48_R47%" >>"%R48_LOG%" 2>&1
if errorlevel 1 goto :r47_error
"%R48_NODE%" "%R48_STAGE%" --stage-private >>"%R48_LOG%" 2>&1
if errorlevel 1 goto :r48_error
>>"%R48_LOG%" echo STATUS=R48_PRIVATE_CYCLE_COMPLETE_NO_PUBLICATION
exit /b 0
:missing
echo STATUS=STOP_R48_REQUIRED_LOCAL_FILES_MISSING
exit /b 2
:collision
echo STATUS=STOP_R48_RESULT_FILE_COLLISION
exit /b 2
:r47_error
>>"%R48_LOG%" echo STATUS=STOP_R48_R47_PRIVATE_SOURCE_FAILED
exit /b 3
:r48_error
>>"%R48_LOG%" echo STATUS=STOP_R48_PRIVATE_CANDIDATE_STAGE_FAILED
exit /b 4
