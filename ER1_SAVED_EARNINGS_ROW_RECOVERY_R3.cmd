@echo off
setlocal EnableExtensions
set "ER1_ROOT=%~dp0"
set "ER1_RESULT=%ER1_ROOT%ER1_SAVED_EARNINGS_R3_RESULT.txt"
set "ER1_NODE=E:\ZGmini\runtime\node.exe"
if not exist "%ER1_NODE%" set "ER1_NODE=node"
if not exist "%ER1_ROOT%scripts\pc-writer\market-calendar-er1-minimal-capture.mjs" goto MISSING
if not exist "%ER1_ROOT%lib\market-calendar-er1-calendar-adapter.mjs" goto MISSING
"%ER1_NODE%" "%ER1_ROOT%scripts\pc-writer\market-calendar-er1-minimal-capture.mjs" "%ER1_RESULT%" --r3-readonly
if errorlevel 1 goto FAILED
echo ER1 R3 saved input diagnostic completed. No provider requests or PC data writes.
echo Please send ER1_SAVED_EARNINGS_R3_RESULT.txt only.
pause
exit /b 0
:MISSING
> "%ER1_RESULT%" echo STATUS=ER1_PACKAGE_INCOMPLETE
goto FAILED
:FAILED
if not exist "%ER1_RESULT%" > "%ER1_RESULT%" echo STATUS=ER1_NODE_FAILED
echo ER1 R3 read-only diagnostic stopped safely. Please send ER1_SAVED_EARNINGS_R3_RESULT.txt.
pause
exit /b 1
