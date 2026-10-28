@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem R50: repair ONLY the separate R48 private scheduled task after R49.
rem Uses schtasks native DAILY creation, with no XML template and no overwrite.
rem No provider collection; no D1 writes; no public publication.
set "R50_TASK=ZGMINI-PC-Theme-Nine-R47-Private"
set "R50_DIR=E:\ZGmini\data\pc-writer\theme-nine-r48"
set "R50_ACTION=%R50_DIR%\THEME_NINE_R48_PRIVATE_CYCLE.cmd"
set "R50_STAGE=%R50_DIR%\theme-nine-r48-stage-current.mjs"
set "R50_NODE=E:\ZGmini\runtime\node.exe"
set "R50_LOG=%~dp0THEME_NINE_R50_REPAIR_TASK_RESULT_%RANDOM%_%RANDOM%.txt"
if exist "%R50_LOG%" goto :collision
>"%R50_LOG%" echo REPORT=THEME_NINE_R50_REPAIR_PRIVATE_TASK
>>"%R50_LOG%" echo PREVIOUS_R49=FILES_INSTALLED_TASK_CREATION_FAILED
>>"%R50_LOG%" echo TASK_NAME=%R50_TASK%
>>"%R50_LOG%" echo D1_WRITES=0
>>"%R50_LOG%" echo PUBLICATION_WRITES=0
>>"%R50_LOG%" echo EXISTING_TASKS_OVERWRITTEN=0
>>"%R50_LOG%" echo PROVIDER_GETS=0
if not exist "%R50_ACTION%" goto :missing
if not exist "%R50_STAGE%" goto :missing
if not exist "%R50_NODE%" goto :missing
set "R50_TZ="
for /f "delims=" %%T in ('tzutil /g') do set "R50_TZ=%%T"
>>"%R50_LOG%" echo PC_TIMEZONE=%R50_TZ%
if /I not "%R50_TZ%"=="Korea Standard Time" goto :timezone
schtasks /Query /TN "%R50_TASK%" /XML >nul 2>&1
if not errorlevel 1 goto :exists
>>"%R50_LOG%" echo TASK_CREATE_METHOD=SCHTASKS_DAILY_NATIVE_NO_XML
schtasks /Create /SC DAILY /ST 11:30 /TN "%R50_TASK%" /TR "%R50_ACTION%" /RL LIMITED /IT >>"%R50_LOG%" 2>&1
if errorlevel 1 goto :create_failed
>>"%R50_LOG%" echo TASK_CREATE_COMMAND=SUCCESS
schtasks /Query /TN "%R50_TASK%" /XML >>"%R50_LOG%" 2>&1
if errorlevel 1 goto :verify_failed
schtasks /Query /TN "%R50_TASK%" /XML 2>nul | findstr /I /C:"THEME_NINE_R48_PRIVATE_CYCLE.cmd" >nul
if errorlevel 1 goto :verify_failed
schtasks /Query /TN "%R50_TASK%" /XML 2>nul | findstr /C:"11:30:00" >nul
if errorlevel 1 goto :verify_failed
>>"%R50_LOG%" echo TASK_READBACK=SUCCESS_CHECK_XML_ABOVE
set "ZGMINI_R48_CONFIG_DIR=%R50_DIR%"
"%R50_NODE%" "%R50_STAGE%" --stage-private >>"%R50_LOG%" 2>&1
if errorlevel 1 goto :stage_pending
>>"%R50_LOG%" echo STAGE_EXISTING=SUCCESS_PRIVATE_CANDIDATE
>>"%R50_LOG%" echo STATUS=TASK_CREATED_AND_PRIVATE_STAGE_SUCCESS
set "R50_EXIT=0"
goto :done
:stage_pending
>>"%R50_LOG%" echo STAGE_EXISTING=PENDING_REVIEW
>>"%R50_LOG%" echo STATUS=TASK_CREATED_PRIVATE_STAGE_PENDING
set "R50_EXIT=0"
goto :done
:exists
>>"%R50_LOG%" echo STATUS=STOP_TASK_ALREADY_EXISTS_PRESERVED
schtasks /Query /TN "%R50_TASK%" /XML >>"%R50_LOG%" 2>&1
set "R50_EXIT=2"
goto :done
:missing
>>"%R50_LOG%" echo STATUS=STOP_R49_INSTALL_FILES_OR_NODE_MISSING
set "R50_EXIT=2"
goto :done
:timezone
>>"%R50_LOG%" echo STATUS=STOP_PC_TIMEZONE_NOT_KOREA_STANDARD_TIME
set "R50_EXIT=2"
goto :done
:create_failed
>>"%R50_LOG%" echo STATUS=STOP_TASK_CREATE_FAILED_WINDOWS_MESSAGE_ABOVE
set "R50_EXIT=3"
goto :done
:verify_failed
>>"%R50_LOG%" echo STATUS=STOP_TASK_CREATE_SUCCEEDED_READBACK_FAILED
set "R50_EXIT=4"
goto :done
:collision
echo STATUS=STOP_REPORT_FILENAME_COLLISION_RETRY
exit /b 2
:done
type "%R50_LOG%"
echo RESULT_FILE=%R50_LOG%
exit /b %R50_EXIT%
