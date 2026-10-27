@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "ZG_NODE=E:\ZGmini\runtime\node.exe"
set "ZG_SCRIPT=%~dp0scripts\pc-writer\market-calendar-r9-source-preflight.mjs"
set "ZG_PARSER=%~dp0lib\release-calendar.mjs"
set "ZG_RESULT=%~dp0MARKET_CALENDAR_R9_SOURCE_PREFLIGHT_RESULT.txt"
if not exist "%ZG_NODE%" (
  >"%ZG_RESULT%" echo STATUS=NODE_NOT_FOUND
  exit /b 2
)
if not exist "%ZG_SCRIPT%" (
  >"%ZG_RESULT%" echo STATUS=R9_SCRIPT_NOT_FOUND
  exit /b 2
)
if not exist "%ZG_PARSER%" (
  >"%ZG_RESULT%" echo STATUS=PARSER_NOT_FOUND
  exit /b 2
)
"%ZG_NODE%" "%ZG_SCRIPT%" "%ZG_RESULT%"
if errorlevel 1 exit /b 1
echo Read-only source preflight complete: %ZG_RESULT%
exit /b 0
