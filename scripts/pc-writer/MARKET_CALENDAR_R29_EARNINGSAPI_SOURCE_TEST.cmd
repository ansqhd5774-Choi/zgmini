@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "R29_NODE=E:\ZGmini\runtime\node.exe"
set "R29_SCRIPT=%~dp0market-calendar-r29-earningsapi-source-test.mjs"
if not exist "%R29_NODE%" goto STOP
if not exist "%R29_SCRIPT%" goto STOP
"%R29_NODE%" "%R29_SCRIPT%"
set "R29_EXIT=%ERRORLEVEL%"
if not "%R29_EXIT%"=="0" echo R29 source check did not pass. See result TXT if created.
pause
endlocal & exit /b %R29_EXIT%
:STOP
echo STOP: Approved Node runtime or source-test script not found. Nothing changed.
pause
endlocal & exit /b 2
