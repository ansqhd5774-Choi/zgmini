@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "ZG_NODE=E:\ZGmini\runtime\node.exe"
set "ZG_SCRIPT=%~dp0market-calendar-r6-readonly.mjs"
set "ZG_RESULT=%~dp0MARKET_CALENDAR_R6_PC_READONLY_RESULT.txt"
if not exist "%ZG_NODE%" (
  >"%ZG_RESULT%" echo STATUS=NODE_NOT_FOUND
  echo Node runtime not found. No operational change was made.
  exit /b 2
)
if not exist "%ZG_SCRIPT%" (
  >"%ZG_RESULT%" echo STATUS=AUDIT_SCRIPT_NOT_FOUND
  echo Audit script not found next to CMD. No operational change was made.
  exit /b 2
)
"%ZG_NODE%" "%ZG_SCRIPT%" "%ZG_RESULT%"
if errorlevel 1 (
  echo Read-only audit failed. Inspect the result TXT if present.
  exit /b 1
)
echo Read-only audit complete: %ZG_RESULT%
exit /b 0
