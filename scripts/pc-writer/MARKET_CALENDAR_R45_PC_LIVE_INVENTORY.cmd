@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "R45_INV_DIR=%~dp0"
set "R45_INV_NODE=E:\ZGmini\runtime\node.exe"
if defined ZGMINI_NODE_EXE set "R45_INV_NODE=%ZGMINI_NODE_EXE%"
set "R45_INV_HOME=E:\ZGmini\data\pc-writer"
if defined ZGMINI_PC_HOME set "R45_INV_HOME=%ZGMINI_PC_HOME%"
set "R45_INV_RESULT=%R45_INV_DIR%MARKET_CALENDAR_R45_PC_LIVE_INVENTORY_RESULT.txt"
if not "%~1"=="" goto R45_INV_USAGE
if exist "%R45_INV_RESULT%" (
 echo Existing report is preserved. Extract to a NEW folder for another observation.
 exit /b 2
)
if not exist "%R45_INV_NODE%" (
 echo Approved Node runtime unavailable. Nothing was changed.
 exit /b 3
)
if not exist "%R45_INV_DIR%market-calendar-r45-pc-live-inventory.mjs" (
 echo Read-only inventory script missing. Nothing was changed.
 exit /b 3
)
"%R45_INV_NODE%" "%R45_INV_DIR%market-calendar-r45-pc-live-inventory.mjs" --base="%R45_INV_HOME%" > "%R45_INV_RESULT%" 2>&1
set "R45_INV_EXIT=%ERRORLEVEL%"
type "%R45_INV_RESULT%"
echo Result: "%R45_INV_RESULT%"
exit /b %R45_INV_EXIT%
:R45_INV_USAGE
echo Usage: MARKET_CALENDAR_R45_PC_LIVE_INVENTORY.cmd
echo READ-ONLY ONLY. No write mode exists.
exit /b 2
