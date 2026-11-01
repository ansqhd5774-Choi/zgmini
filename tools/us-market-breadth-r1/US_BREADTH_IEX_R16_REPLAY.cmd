@echo off
setlocal
set "TOOL_DIR=%~dp0"
set "NODE_BIN=E:\ZGmini\runtime\node.exe"
if not exist "%NODE_BIN%" set "NODE_BIN=node"
"%NODE_BIN%" "%TOOL_DIR%iex-intraday-replay-r16.mjs"
if errorlevel 1 (
  echo R16_REPLAY_EXECUTION_FAILED
  exit /b 1
)
echo R16_REPLAY_FINISHED
endlocal
