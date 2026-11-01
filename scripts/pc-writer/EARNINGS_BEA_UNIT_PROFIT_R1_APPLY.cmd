@echo off
setlocal
set "NODE_EXE=E:\ZGmini\runtime\node.exe"
set "RUNNER=%~dp0EARNINGS_BEA_UNIT_PROFIT_R1_ONCE.mjs"
if not exist "%NODE_EXE%" (
  echo ERROR=APPROVED_NODE_RUNTIME_MISSING
  exit /b 1
)
if not exist "%RUNNER%" (
  echo ERROR=PLACE_LAUNCHER_NEXT_TO_APPROVED_PC_RUNNER
  exit /b 1
)
if not defined ZGMINI_EARNINGS_C_OPERATIONAL_ROOT (
  echo ERROR=APPROVED_OPERATIONAL_SOURCE_ROOT_NOT_CONFIGURED
  exit /b 1
)
"%NODE_EXE%" "%RUNNER%" --apply --confirm-bea-unit-d1-write
exit /b %ERRORLEVEL%
