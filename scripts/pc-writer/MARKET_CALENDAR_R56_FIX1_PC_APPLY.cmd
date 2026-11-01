@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "R56_FIX1_DIR=%~dp0"
set "R56_FIX1_NODE=E:\ZGmini\runtime\node.exe"
if defined ZGMINI_NODE_EXE set "R56_FIX1_NODE=%ZGMINI_NODE_EXE%"
set "R56_FIX1_HOME=E:\ZGmini\data\pc-writer"
if defined ZGMINI_PC_HOME set "R56_FIX1_HOME=%ZGMINI_PC_HOME%"
set "R56_FIX1_RESULT=%R56_FIX1_DIR%MARKET_CALENDAR_R56_FIX1_PC_APPLY_RESULT.txt"
if exist "%R56_FIX1_RESULT%" (
 echo Existing R56 FIX1 result is preserved. Review it before another attempt.
 exit /b 2
)
if not exist "%R56_FIX1_NODE%" (
 echo {"decision":"R56_APPROVED_NODE_NOT_FOUND_STOP","sourceWrites":0} > "%R56_FIX1_RESULT%"
 exit /b 3
)
"%R56_FIX1_NODE%" "%R56_FIX1_DIR%market-calendar-r56-pc-apply.mjs" --apply --base="%R56_FIX1_HOME%" > "%R56_FIX1_RESULT%" 2>&1
set "R56_FIX1_EXIT=%ERRORLEVEL%"
echo Result: "%R56_FIX1_RESULT%"
exit /b %R56_FIX1_EXIT%
