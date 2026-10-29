@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem Show native schtasks failure, then independently run the installed private R73.
rem Consent: run as Administrator; never creates/deletes tasks or publishes D1.
set "R73_HOME=%~dp0"
set "R73_NODE=node"
if exist "E:\ZGmini\runtime\node.exe" set "R73_NODE=E:\ZGmini\runtime\node.exe"
set "R73_LOG=%R73_HOME%THEME_NINE_R73_NATIVE_TASK_%RANDOM%_%RANDOM%.txt"
if exist "%R73_LOG%" exit /b 2
>"%R73_LOG%" echo REPORT=THEME_NINE_R73_NATIVE_TASK_AND_PRIVATE
"%R73_NODE%" "%R73_HOME%theme-nine-r73-native-error-and-apply.mjs" --apply >>"%R73_LOG%" 2>&1
set "R73_TASK_EXIT=%ERRORLEVEL%"
>>"%R73_LOG%" echo TASK_ACTION_EXIT=%R73_TASK_EXIT%
call "E:\ZGmini\data\pc-writer\theme-nine-r48\THEME_NINE_R73_AUTO_HTTP502_PRIVATE.cmd" >>"%R73_LOG%" 2>&1
set "R73_PRIVATE_EXIT=%ERRORLEVEL%"
>>"%R73_LOG%" echo PRIVATE_COLLECTION_EXIT=%R73_PRIVATE_EXIT%
if "%R73_TASK_EXIT%"=="0" if "%R73_PRIVATE_EXIT%"=="0" goto :success
>>"%R73_LOG%" echo RESULT=REVIEW_TASK_AND_PRIVATE_SEPARATELY
set "R73_RESULT=2"
goto :done
:success
>>"%R73_LOG%" echo RESULT=TASK_VERIFIED_AND_PRIVATE_COMMAND_ZERO
set "R73_RESULT=0"
:done
type "%R73_LOG%"
echo RESULT_FILE=%R73_LOG%
exit /b %R73_RESULT%
