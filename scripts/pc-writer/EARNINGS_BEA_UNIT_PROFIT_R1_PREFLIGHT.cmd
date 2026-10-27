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
"%NODE_EXE%" "%RUNNER%" --dry-run
exit /b %ERRORLEVEL%
