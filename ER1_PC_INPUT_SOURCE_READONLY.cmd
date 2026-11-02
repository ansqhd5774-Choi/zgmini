@echo off
setlocal EnableExtensions
set "ER1_ROOT=%~dp0"
set "ER1_LOG=%ER1_ROOT%ER1_PC_INPUT_SOURCE_RESULT.txt"
set "ER1_NODE=E:\ZGmini\runtime\node.exe"
if not exist "%ER1_NODE%" set "ER1_NODE=node"
if not exist "%ER1_ROOT%scripts\pc-writer\market-calendar-er1-source-readonly.mjs" goto ERROR_SCRIPT
"%ER1_NODE%" "%ER1_ROOT%scripts\pc-writer\market-calendar-er1-source-readonly.mjs" "%ER1_LOG%"
if errorlevel 1 goto ERROR_RUN
echo.
echo ER1 read-only input inventory complete.
echo Please send ER1_PC_INPUT_SOURCE_RESULT.txt only.
pause
exit /b 0
:ERROR_SCRIPT
> "%ER1_LOG%" echo STATUS=SCRIPT_MISSING
goto ERROR_FINAL
:ERROR_RUN
if exist "%ER1_LOG%" goto ERROR_FINAL
> "%ER1_LOG%" echo STATUS=NODE_RUN_FAILED
:ERROR_FINAL
echo ER1 audit was blocked. Please send ER1_PC_INPUT_SOURCE_RESULT.txt.
pause
exit /b 1
