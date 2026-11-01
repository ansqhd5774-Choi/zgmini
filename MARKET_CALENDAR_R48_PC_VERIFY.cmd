@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "R48_BUNDLE=%~dp0"
set "R48_NODE=E:\ZGmini\runtime\node.exe"
if defined ZGMINI_NODE_EXE set "R48_NODE=%ZGMINI_NODE_EXE%"
set "R48_PC_HOME=E:\ZGmini\data\pc-writer"
if defined ZGMINI_PC_HOME set "R48_PC_HOME=%ZGMINI_PC_HOME%"
set "R48_RESULT=%R48_BUNDLE%MARKET_CALENDAR_R48_PC_VERIFY_RESULT.txt"
if exist "%R48_RESULT%" (
 echo Existing R48 verify result is preserved. Rename it before another run.
 exit /b 2
)
if not exist "%R48_NODE%" (
 echo {"status":"R48_APPROVED_NODE_NOT_FOUND_STOP","sourceWrites":0} > "%R48_RESULT%"
 exit /b 3
)
"%R48_NODE%" "%R48_BUNDLE%market-calendar-r46-pc-verify.mjs" --base="%R48_PC_HOME%" > "%R48_RESULT%" 2>&1
set "R48_EXIT=%ERRORLEVEL%"
echo Result: "%R48_RESULT%"
exit /b %R48_EXIT%
