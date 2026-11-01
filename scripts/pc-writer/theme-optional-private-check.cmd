@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "ZG_APPROVED_SHA=60e7883bfbe0e6bda53579c7a7a1b78c72f70873"
set "ZG_NODE=E:\ZGmini\runtime\node.exe"
set "ZG_RUNNER=E:\ZGmini\projects\zgmini-theme-optional\releases\%ZG_APPROVED_SHA%\scripts\pc-writer\theme-optional-cycle.cmd"
set "ZG_LOG=%~dp0THEME_OPTIONAL_PRIVATE_CHECK_RESULT.txt"
> "%ZG_LOG%" echo REPORT=ZGMINI_THEME_OPTIONAL_PRIVATE_CHECK_R1
>> "%ZG_LOG%" echo SOURCE_SHA=%ZG_APPROVED_SHA%
>> "%ZG_LOG%" echo PUBLISH_ALLOWED=NO
>> "%ZG_LOG%" echo EXISTING_SEVEN_TASKS_MODIFIED=NO
>> "%ZG_LOG%" echo START_DATE=%DATE% %TIME%
if not exist "%ZG_NODE%" goto MissingNode
if not exist "%ZG_RUNNER%" goto MissingRunner
>> "%ZG_LOG%" echo THEME=ai-semiconductor
call "%ZG_RUNNER%" ai-semiconductor >> "%ZG_LOG%" 2>&1
set "ZG_AI_EXIT=%ERRORLEVEL%"
>> "%ZG_LOG%" echo AI_EXIT_CODE=%ZG_AI_EXIT%
>> "%ZG_LOG%" echo THEME=biotech
call "%ZG_RUNNER%" biotech >> "%ZG_LOG%" 2>&1
set "ZG_BIO_EXIT=%ERRORLEVEL%"
>> "%ZG_LOG%" echo BIOTECH_EXIT_CODE=%ZG_BIO_EXIT%
if not "%ZG_AI_EXIT%"=="0" goto Partial
if not "%ZG_BIO_EXIT%"=="0" goto Partial
>> "%ZG_LOG%" echo RESULT=PRIVATE_CYCLES_RETURNED_ZERO_SCHEDULER_NOT_INSTALLED
goto Done
:Partial
>> "%ZG_LOG%" echo RESULT=PRIVATE_CYCLES_NEED_REVIEW_SCHEDULER_NOT_INSTALLED
goto Done
:MissingNode
>> "%ZG_LOG%" echo RESULT=BLOCKED_APPROVED_NODE_MISSING
goto Done
:MissingRunner
>> "%ZG_LOG%" echo RESULT=BLOCKED_STAGE_RELEASE_MISSING
:Done
>> "%ZG_LOG%" echo END_DATE=%DATE% %TIME%
type "%ZG_LOG%"
echo.
echo LOG=%ZG_LOG%
pause
