@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "ZG_SHA=%~1"
set "ZG_NODE=E:\ZGmini\runtime\node.exe"
set "ZG_PROJECT=E:\ZGmini\projects\zgmini-theme-optional"
set "ZG_BOOT=%ZG_PROJECT%\theme-optional-stage.mjs"
set "ZG_LOG=%~dp0THEME_OPTIONAL_REFRESH_RESULT.txt"
> "%ZG_LOG%" echo REPORT=ZGMINI_THEME_OPTIONAL_REFRESH_R2
>> "%ZG_LOG%" echo PUBLISH_ALLOWED=NO
>> "%ZG_LOG%" echo SCHEDULER_WRITES=0
>> "%ZG_LOG%" echo D1_WRITES_ALLOWED=0
>> "%ZG_LOG%" echo EXISTING_SEVEN_TASKS_MODIFIED=NO
>> "%ZG_LOG%" echo START_DATE=%DATE% %TIME%
if not defined ZG_SHA goto MissingSha
>> "%ZG_LOG%" echo REQUESTED_SOURCE_SHA=%ZG_SHA%
if not exist "%ZG_NODE%" goto MissingNode
if not exist "%ZG_PROJECT%" goto MissingProject
curl.exe --fail --location --silent --show-error --retry 2 "https://raw.githubusercontent.com/ansqhd5774-Choi/zgmini/%ZG_SHA%/scripts/pc-writer/theme-optional-stage.mjs" --output "%ZG_BOOT%" >> "%ZG_LOG%" 2>&1
if errorlevel 1 goto DownloadFailure
"%ZG_NODE%" "%ZG_BOOT%" --source-sha=%ZG_SHA% >> "%ZG_LOG%" 2>&1
if errorlevel 1 goto StageFailure
set "ZG_RUNNER=%ZG_PROJECT%\releases\%ZG_SHA%\scripts\pc-writer\theme-optional-cycle.cmd"
if not exist "%ZG_RUNNER%" goto MissingRunner
>> "%ZG_LOG%" echo THEME=ai-semiconductor
call "%ZG_RUNNER%" ai-semiconductor >> "%ZG_LOG%" 2>&1
set "ZG_AI_EXIT=%ERRORLEVEL%"
>> "%ZG_LOG%" echo AI_EXIT_CODE=%ZG_AI_EXIT%
>> "%ZG_LOG%" echo THEME=biotech
call "%ZG_RUNNER%" biotech >> "%ZG_LOG%" 2>&1
set "ZG_BIO_EXIT=%ERRORLEVEL%"
>> "%ZG_LOG%" echo BIOTECH_EXIT_CODE=%ZG_BIO_EXIT%
if not "%ZG_AI_EXIT%"=="0" goto CycleBlocked
if not "%ZG_BIO_EXIT%"=="0" goto CycleBlocked
>> "%ZG_LOG%" echo RESULT=PRIVATE_CHECKS_RETURNED_ZERO_NO_SCHEDULE_NO_PUBLICATION
goto Done
:CycleBlocked
>> "%ZG_LOG%" echo RESULT=PRIVATE_CHECKS_NEED_REVIEW_NO_SCHEDULE_NO_PUBLICATION
goto Done
:MissingSha
>> "%ZG_LOG%" echo RESULT=BLOCKED_EXPLICIT_GITHUB_SHA_REQUIRED
goto Done
:MissingNode
>> "%ZG_LOG%" echo RESULT=BLOCKED_APPROVED_NODE_MISSING
goto Done
:MissingProject
>> "%ZG_LOG%" echo RESULT=BLOCKED_APPROVED_PROJECT_MISSING
goto Done
:MissingRunner
>> "%ZG_LOG%" echo RESULT=BLOCKED_STAGED_RUNNER_MISSING
goto Done
:DownloadFailure
>> "%ZG_LOG%" echo RESULT=BLOCKED_PINNED_BOOTSTRAP_DOWNLOAD_FAILED
goto Done
:StageFailure
>> "%ZG_LOG%" echo RESULT=BLOCKED_PINNED_STAGE_FAILED
:Done
>> "%ZG_LOG%" echo END_DATE=%DATE% %TIME%
type "%ZG_LOG%"
echo.
echo LOG=%ZG_LOG%
pause
