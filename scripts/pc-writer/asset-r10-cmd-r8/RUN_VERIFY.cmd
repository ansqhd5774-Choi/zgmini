@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "PKG=%~dp0"
set "NODE=E:\ZGmini\runtime\node.exe"
if not exist "%NODE%" (
  >"%PKG%ASSET_R10_CMD_VERIFY_RESULT.txt" echo STATUS=STOP
  >>"%PKG%ASSET_R10_CMD_VERIFY_RESULT.txt" echo ERROR_CODE=STOP_PINNED_NODE_MISSING
  echo STOP_PINNED_NODE_MISSING
  exit /b 2
)
"%NODE%" "%PKG%r10-ops.mjs" verify
set "RC=%ERRORLEVEL%"
echo ExitCode=%RC%
exit /b %RC%
