@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "R47_BUNDLE=%~dp0"
set "R47_NODE=E:\ZGmini\runtime\node.exe"
if defined ZGMINI_NODE_EXE set "R47_NODE=%ZGMINI_NODE_EXE%"
set "R47_RESULT=%R47_BUNDLE%MARKET_CALENDAR_R47_CORE_ORIGIN_DIAGNOSE_RESULT.txt"
if exist "%R47_RESULT%" (
 echo Existing R47 result is preserved. Rename it before another run.
 exit /b 2
)
if not exist "%R47_NODE%" (
 echo {"decision":"R47_APPROVED_NODE_NOT_FOUND","noSourceWrites":true} > "%R47_RESULT%"
 exit /b 3
)
"%R47_NODE%" "%R47_BUNDLE%market-calendar-r47-core-origin-diagnose.mjs" > "%R47_RESULT%" 2>&1
set "R47_CODE=%ERRORLEVEL%"
echo Result: "%R47_RESULT%"
exit /b %R47_CODE%
