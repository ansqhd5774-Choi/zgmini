@echo off
setlocal EnableExtensions
set "ER1_ROOT=%~dp0"
set "ER1_RESULT=%ER1_ROOT%ER1_RECENT_QUARTER_R4_RESULT.txt"
set "ER1_NODE=E:\ZGmini\runtime\node.exe"
if not exist "%ER1_NODE%" set "ER1_NODE=node"
if not exist "%ER1_ROOT%scripts\pc-writer\market-calendar-er1-minimal-capture.mjs" goto MISSING
if not exist "%ER1_ROOT%lib\market-calendar-er1-calendar-adapter.mjs" goto MISSING
"%ER1_NODE%" "%ER1_ROOT%scripts\pc-writer\market-calendar-er1-minimal-capture.mjs" "%ER1_RESULT%" --r4-bounded
if errorlevel 1 goto FAILED
echo ER1 R4 saved earnings coverage sample completed.
echo Please send ER1_RECENT_QUARTER_R4_RESULT.txt only.
pause
exit /b 0
:MISSING
> "%ER1_RESULT%" echo STATUS=ER1_PACKAGE_INCOMPLETE
goto FAILED
:FAILED
if not exist "%ER1_RESULT%" > "%ER1_RESULT%" echo STATUS=ER1_NODE_FAILED
echo ER1 R4 stopped safely. Please send ER1_RECENT_QUARTER_R4_RESULT.txt.
pause
exit /b 1
