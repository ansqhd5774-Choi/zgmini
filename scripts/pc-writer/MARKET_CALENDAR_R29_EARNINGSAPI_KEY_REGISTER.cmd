@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "R29_NODE=E:\ZGmini\runtime\node.exe"
set "R29_SCRIPT=%~dp0market-calendar-r29-key-register.mjs"
if not exist "%R29_NODE%" goto NODE_MISSING
if not exist "%R29_SCRIPT%" goto SCRIPT_MISSING
"%R29_NODE%" "%R29_SCRIPT%"
set "R29_EXIT=%ERRORLEVEL%"
if not "%R29_EXIT%"=="0" goto FAILED
echo R29 EARNINGS API KEY REGISTRATION: PASS
echo No scheduled collection, database publication or deployment was triggered.
pause
endlocal & exit /b 0
:NODE_MISSING
echo STOP: Approved Node runtime was not found. Nothing changed.
pause
endlocal & exit /b 2
:SCRIPT_MISSING
echo STOP: Companion key registration file was not found. Nothing changed.
pause
endlocal & exit /b 2
:FAILED
echo STOP: Key registration failed. Existing provider secrets were not printed.
pause
endlocal & exit /b %R29_EXIT%
