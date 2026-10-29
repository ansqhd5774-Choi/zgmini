@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem One click installs verified private R73 retry wrapper into the EXISTING task.
rem Then runs private R48 once. No D1 writes or other task changes.
set "R73_HOME=%~dp0"
set "R73_NODE=node"
if exist "E:\ZGmini\runtime\node.exe" set "R73_NODE=E:\ZGmini\runtime\node.exe"
set "R73_LOG=%R73_HOME%THEME_NINE_R73_INSTALL_RUN_%RANDOM%_%RANDOM%.txt"
if exist "%R73_LOG%" exit /b 2
>"%R73_LOG%" echo REPORT=THEME_NINE_R73_INSTALL_AND_RUN
"%R73_NODE%" "%R73_HOME%theme-nine-r73-install-private-auto.mjs" --install >>"%R73_LOG%" 2>&1
if errorlevel 1 goto :stop
>>"%R73_LOG%" echo INSTALL=VERIFIED
call "E:\ZGmini\data\pc-writer\theme-nine-r48\THEME_NINE_R73_AUTO_HTTP502_PRIVATE.cmd" >>"%R73_LOG%" 2>&1
if errorlevel 1 goto :stop
>>"%R73_LOG%" echo RESULT=R73_INSTALL_AND_PRIVATE_CYCLE_RETURNED_ZERO
set "R73_RESULT=0"
goto :done
:stop
>>"%R73_LOG%" echo RESULT=R73_STOP_REVIEW_LOG
set "R73_RESULT=2"
:done
type "%R73_LOG%"
echo RESULT_FILE=%R73_LOG%
exit /b %R73_RESULT%
