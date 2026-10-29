@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem R73: one-click private recovery with max 2 automatic HTTP502 retries.
rem Read-only provider GETs; private checkpoints only; no D1 or task edits.
set "R73_HOME=%~dp0"
set "R73_NODE=node"
if exist "E:\ZGmini\runtime\node.exe" set "R73_NODE=E:\ZGmini\runtime\node.exe"
set "R73_LOG=%R73_HOME%THEME_NINE_R73_AUTO_HTTP502_%RANDOM%_%RANDOM%.txt"
if exist "%R73_LOG%" exit /b 2
>"%R73_LOG%" echo REPORT=THEME_NINE_R73_AUTO_HTTP502_PRIVATE
"%R73_NODE%" "%R73_HOME%theme-nine-r73-auto-http502-private-retry.mjs" --run-private >>"%R73_LOG%" 2>&1
set "R73_RESULT=%ERRORLEVEL%"
if "%R73_RESULT%"=="0" (>>"%R73_LOG%" echo RESULT=PRIVATE_COMMAND_RETURNED_ZERO) else (>>"%R73_LOG%" echo RESULT=STOP_REVIEW_LOG)
type "%R73_LOG%"
echo RESULT_FILE=%R73_LOG%
exit /b %R73_RESULT%
