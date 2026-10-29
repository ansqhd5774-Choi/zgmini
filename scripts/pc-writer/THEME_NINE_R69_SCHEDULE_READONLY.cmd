@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem R69 read-only existing schedule and sanitized log diagnosis. No task or DB writes.
set "R69_DIR=%~dp0"
set "R69_NODE=E:\ZGmini\runtime\node.exe"
if not exist "%R69_NODE%" set "R69_NODE=node"
set "R69_LOG=%R69_DIR%THEME_NINE_R69_SCHEDULE_READONLY_%RANDOM%_%RANDOM%.txt"
if exist "%R69_LOG%" exit /b 3
>"%R69_LOG%" echo REPORT=THEME_NINE_R69_SCHEDULE_AND_LOGS_READONLY
>>"%R69_LOG%" echo TASK_AND_DB_WRITES=0
"%R69_NODE%" "%R69_DIR%theme-nine-r69-schedule-readonly.mjs" >>"%R69_LOG%" 2>&1
set "R69_RC=%ERRORLEVEL%"
if "%R69_RC%"=="0" goto :complete
>>"%R69_LOG%" echo RESULT=STOP_R69_READONLY_DIAGNOSTIC
goto :done
:complete
>>"%R69_LOG%" echo RESULT=R69_READONLY_DIAGNOSTIC_COMPLETE
:done
type "%R69_LOG%"
echo RESULT_FILE=%R69_LOG%
exit /b %R69_RC%
