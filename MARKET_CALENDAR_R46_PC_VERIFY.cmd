@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "R46_PACKAGE=%~dp0"
set "R46_NODE=E:\ZGmini\runtime\node.exe"
if defined ZGMINI_NODE_EXE set "R46_NODE=%ZGMINI_NODE_EXE%"
set "R46_PC_HOME=E:\ZGmini\data\pc-writer"
if defined ZGMINI_PC_HOME set "R46_PC_HOME=%ZGMINI_PC_HOME%"
set "R46_RESULT=%R46_PACKAGE%MARKET_CALENDAR_R46_PC_VERIFY_RESULT.txt"
if exist "%R46_RESULT%" (
 echo Existing result is preserved. Rename it before another attempt.
 echo "%R46_RESULT%"
 exit /b 2
)
if not exist "%R46_NODE%" (
 echo {"status":"R46_APPROVED_NODE_NOT_FOUND_STOP","noSourceWrites":true} > "%R46_RESULT%"
 echo Result: "%R46_RESULT%"
 exit /b 3
)
"%R46_NODE%" "%R46_PACKAGE%market-calendar-r46-pc-verify.mjs" --base="%R46_PC_HOME%" > "%R46_RESULT%" 2>&1
set "R46_EXIT=%ERRORLEVEL%"
echo Result: "%R46_RESULT%"
exit /b %R46_EXIT%
