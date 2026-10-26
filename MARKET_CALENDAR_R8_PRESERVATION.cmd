@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "ZG_NODE=E:\ZGmini\runtime\node.exe"
set "ZG_SCRIPT=%~dp0scripts\pc-writer\market-calendar-r8-preservation-audit.mjs"
set "ZG_PARSER=%~dp0lib\release-calendar.mjs"
set "ZG_RESULT=%~dp0MARKET_CALENDAR_R8_PRESERVATION_RESULT.txt"
if not exist "%ZG_NODE%" (
  >"%ZG_RESULT%" echo STATUS=NODE_NOT_FOUND
  exit /b 2
)
if not exist "%ZG_SCRIPT%" (
  >"%ZG_RESULT%" echo STATUS=AUDIT_SCRIPT_NOT_FOUND
  exit /b 2
)
if not exist "%ZG_PARSER%" (
  >"%ZG_RESULT%" echo STATUS=PARSER_FILE_NOT_FOUND
  exit /b 2
)
"%ZG_NODE%" "%ZG_SCRIPT%" "%ZG_RESULT%"
if errorlevel 1 exit /b 1
echo Read-only comparison complete: %ZG_RESULT%
exit /b 0
