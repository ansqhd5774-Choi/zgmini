@echo off
setlocal
set "TOOL_DIR=%~dp0"
set "NODE_BIN=E:\ZGmini\runtime\node.exe"
if not exist "%NODE_BIN%" set "NODE_BIN=node"
"%NODE_BIN%" "%TOOL_DIR%iex-provisional-intraday-pilot-r14.mjs"
if errorlevel 1 (
  echo R14_PILOT_EXECUTION_FAILED
  exit /b 1
)
echo R14_PILOT_FINISHED
endlocal
