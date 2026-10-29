@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem R70: only read two existing Scheduled Tasks and approved local log files.
set "R70_HERE=%~dp0"
set "R70_NODE=node"
if exist "E:\ZGmini\runtime\node.exe" set "R70_NODE=E:\ZGmini\runtime\node.exe"
set "R70_OUT=%R70_HERE%THEME_NINE_R70_CYCLE_READONLY_%RANDOM%_%RANDOM%.txt"
if exist "%R70_OUT%" exit /b 2
>"%R70_OUT%" echo REPORT=THEME_NINE_R70_SCHEDULE_CYCLE_CORRELATION_READONLY
"%R70_NODE%" "%R70_HERE%theme-nine-r70-cycle-correlation-readonly.mjs" >>"%R70_OUT%" 2>&1
set "R70_EXIT=%ERRORLEVEL%"
if not "%R70_EXIT%"=="0" >>"%R70_OUT%" echo RESULT=STOP_READONLY_DIAGNOSIS
if "%R70_EXIT%"=="0" >>"%R70_OUT%" echo RESULT=R70_READONLY_COMPLETE
type "%R70_OUT%"
echo RESULT_FILE=%R70_OUT%
exit /b %R70_EXIT%
