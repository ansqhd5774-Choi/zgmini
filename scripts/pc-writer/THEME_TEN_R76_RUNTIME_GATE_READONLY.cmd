@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem R76: no task, data, formula, publication or source mutations.
set "R76_NODE=E:\ZGmini\runtime\node.exe"
set "R76_SCRIPT=%~dp0theme-ten-r76-runtime-gate.mjs"
set "R76_RESULT=%~dp0THEME_TEN_R76_RUNTIME_GATE_RESULT_%RANDOM%_%RANDOM%.txt"
if exist "%R76_RESULT%" exit /b 3
>"%R76_RESULT%" echo REPORT=R76_APPROVED_TEN_THEME_READ_ONLY_TASK_CHECK
if not exist "%R76_NODE%" goto :missing_node
if not exist "%R76_SCRIPT%" goto :missing_script
"%R76_NODE%" "%R76_SCRIPT%" --read-only >>"%R76_RESULT%" 2>&1
set "R76_EXIT=%ERRORLEVEL%"
>>"%R76_RESULT%" echo NODE_EXIT=%R76_EXIT%
goto :done
:missing_node
>>"%R76_RESULT%" echo BLOCKED=APPROVED_NODE_MISSING
set "R76_EXIT=4"
goto :done
:missing_script
>>"%R76_RESULT%" echo BLOCKED=PACKAGE_SCRIPT_MISSING
set "R76_EXIT=5"
:done
echo RESULT_FILE=%R76_RESULT%
type "%R76_RESULT%"
pause
exit /b %R76_EXIT%
