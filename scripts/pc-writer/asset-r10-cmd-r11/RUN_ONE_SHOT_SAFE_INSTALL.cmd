@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "PKG=%~dp0"
set "PREF=%PKG%ASSET_R10_CMD_PREFLIGHT_RESULT.txt"
set "INST=%PKG%ASSET_R10_CMD_INSTALL_RESULT.txt"
set "REPORT=%PKG%ASSET_R10_ONE_SHOT_RESULT.txt"
>"%REPORT%" echo STATUS=NOT_STARTED
>>"%REPORT%" echo RUN_POLICY=ONE_PREFLIGHT_WITH_EXISTING_BOUND_WAIT_THEN_AT_MOST_ONE_INSTALL
>>"%REPORT%" echo SCHEDULER_CHANGES=NONE
>>"%REPORT%" echo LOCK_CHANGES=NONE
if not exist "%PKG%RUN_PREFLIGHT.cmd" goto MISSING
if not exist "%PKG%RUN_INSTALL.cmd" goto MISSING
echo [1/2] Running the original R11 guarded preflight.
call "%PKG%RUN_PREFLIGHT.cmd"
if errorlevel 1 goto PREFLIGHT_FAILED
if not exist "%PREF%" goto PREFLIGHT_FAILED
findstr /X /L /C:"STATUS=READY_FOR_INSTALL" "%PREF%" >nul
if errorlevel 1 goto NOT_READY
findstr /X /L /C:"LOCK_STATUS=CLEAR" "%PREF%" >nul
if errorlevel 1 goto NOT_READY
findstr /X /L /C:"PROCESS_STATUS=CLEAR" "%PREF%" >nul
if errorlevel 1 goto NOT_READY
findstr /X /L /C:"CORE_TASK_STATE=Ready" "%PREF%" >nul
if errorlevel 1 goto NOT_READY
findstr /X /L /C:"KOREA_TASK_STATE=Ready" "%PREF%" >nul
if errorlevel 1 goto NOT_READY
findstr /X /L /C:"MANIFEST_STATUS=HASH_VERIFIED" "%PREF%" >nul
if errorlevel 1 goto NOT_READY
echo [2/2] Preflight READY. Launching the original R11 installer once.
>"%REPORT%" echo STATUS=INSTALL_ATTEMPTED_ONCE
>>"%REPORT%" echo RUN_POLICY=ONE_PREFLIGHT_WITH_EXISTING_BOUND_WAIT_THEN_AT_MOST_ONE_INSTALL
>>"%REPORT%" echo SCHEDULER_CHANGES=NONE
>>"%REPORT%" echo LOCK_CHANGES=NONE
call "%PKG%RUN_INSTALL.cmd"
set "INSTALL_RC=%ERRORLEVEL%"
if not exist "%INST%" goto NO_INSTALL_RESULT
findstr /X /L /C:"STATUS=PC_SOURCE_INSTALLED_AWAIT_NORMAL_CYCLE" "%INST%" >nul
if errorlevel 1 goto INSTALL_NOT_SUCCESS
if not "%INSTALL_RC%"=="0" goto INSTALL_NOT_SUCCESS
>"%REPORT%" echo STATUS=INSTALL_SUCCEEDED_AWAIT_NORMAL_CYCLE
>>"%REPORT%" echo INSTALL_ATTEMPTS=1
>>"%REPORT%" echo ORIGINAL_INSTALL_REPORT=ASSET_R10_CMD_INSTALL_RESULT.txt
echo Install reported success. Submit INSTALL_RESULT and ONE_SHOT_RESULT.
exit /b 0
:INSTALL_NOT_SUCCESS
>"%REPORT%" echo STATUS=INSTALL_STOPPED_NO_RETRY
>>"%REPORT%" echo INSTALL_ATTEMPTS=1
>>"%REPORT%" echo ORIGINAL_INSTALL_REPORT=ASSET_R10_CMD_INSTALL_RESULT.txt
echo Install did not report success. STOP. Do not rerun.
exit /b 2
:NO_INSTALL_RESULT
>"%REPORT%" echo STATUS=INSTALL_RESULT_UNAVAILABLE_STOP
>>"%REPORT%" echo INSTALL_ATTEMPTS=1
echo Install result missing. STOP. Do not rerun.
exit /b 2
:NOT_READY
>"%REPORT%" echo STATUS=PREFLIGHT_NOT_READY_NO_INSTALL
>>"%REPORT%" echo INSTALL_ATTEMPTS=0
echo Preflight did not satisfy all safety conditions. No install attempt.
exit /b 2
:PREFLIGHT_FAILED
>"%REPORT%" echo STATUS=PREFLIGHT_FAILED_NO_INSTALL
>>"%REPORT%" echo INSTALL_ATTEMPTS=0
echo Preflight failed. No install attempt.
exit /b 2
:MISSING
>"%REPORT%" echo STATUS=STOP_ORIGINAL_R11_FILES_MISSING
>>"%REPORT%" echo INSTALL_ATTEMPTS=0
echo Original R11 files are missing. STOP.
exit /b 2
