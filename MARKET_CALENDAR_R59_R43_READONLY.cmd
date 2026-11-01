@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem R59 one-shot private read-only audit. Never call Core, APIs, or collectors.
set "PACKAGE_DIR=%~dp0"
rem Keep the single result TXT outside the operational E:\ZGmini tree.
if /I "%PACKAGE_DIR:~0,10%"=="E:\ZGmini\" (
  echo R59_PACKAGE_LOCATION_NOT_ALLOWED: Extract to Downloads or another folder.
  exit /b 2
)
set "RESULT_FILE=%PACKAGE_DIR%MARKET_CALENDAR_R59_READONLY_RESULT.txt"
set "NODE_EXE=E:\ZGmini\runtime\node.exe"
set "PC_DATA_ROOT=E:\ZGmini\data\pc-writer"
set "RUNNER=%PACKAGE_DIR%scripts\pc-writer\market-calendar-r59-r43-readonly-report.mjs"

if not exist "%NODE_EXE%" (
  > "%RESULT_FILE%" echo {"status":"BLOCKED","reason":"R59_APPROVED_NODE_RUNTIME_MISSING","pcDataWrites":0}
  type "%RESULT_FILE%"
  exit /b 2
)
if not exist "%PC_DATA_ROOT%\" (
  > "%RESULT_FILE%" echo {"status":"BLOCKED","reason":"R59_APPROVED_PC_DATA_ROOT_MISSING","pcDataWrites":0}
  type "%RESULT_FILE%"
  exit /b 2
)
if not exist "%RUNNER%" (
  > "%RESULT_FILE%" echo {"status":"BLOCKED","reason":"R59_PACKAGE_RUNNER_MISSING","pcDataWrites":0}
  type "%RESULT_FILE%"
  exit /b 2
)
if not exist "%PACKAGE_DIR%lib\market-calendar-r43-issuer-rank.mjs" (
  > "%RESULT_FILE%" echo {"status":"BLOCKED","reason":"R59_PACKAGE_SCORER_MISSING","pcDataWrites":0}
  type "%RESULT_FILE%"
  exit /b 2
)

"%NODE_EXE%" "%RUNNER%" "--base=%PC_DATA_ROOT%" > "%RESULT_FILE%"
set "RUN_EXIT=%ERRORLEVEL%"
echo Result: "%RESULT_FILE%"
type "%RESULT_FILE%"
exit /b %RUN_EXIT%
