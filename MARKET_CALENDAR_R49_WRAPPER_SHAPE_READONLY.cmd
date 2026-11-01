@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "R49_BUNDLE=%~dp0"
set "R49_NODE=E:\ZGmini\runtime\node.exe"
if defined ZGMINI_NODE_EXE set "R49_NODE=%ZGMINI_NODE_EXE%"
set "R49_RESULT=%R49_BUNDLE%MARKET_CALENDAR_R49_WRAPPER_SHAPE_RESULT.txt"
if exist "%R49_RESULT%" (
 echo Existing R49 result is preserved. Rename before another run.
 exit /b 2
)
if not exist "%R49_NODE%" (
 echo {"decision":"R49_NODE_NOT_FOUND_STOP","noSourceWrites":true} > "%R49_RESULT%"
 exit /b 3
)
"%R49_NODE%" "%R49_BUNDLE%market-calendar-r49-wrapper-shape.mjs" > "%R49_RESULT%" 2>&1
set "R49_EXIT=%ERRORLEVEL%"
echo Result: "%R49_RESULT%"
exit /b %R49_EXIT%
