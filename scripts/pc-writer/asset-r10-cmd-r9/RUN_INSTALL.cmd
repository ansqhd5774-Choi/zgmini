@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "PKG=%~dp0"
set "NODE=E:\ZGmini\runtime\node.exe"
if not exist "%NODE%" (
  >"%PKG%ASSET_R10_CMD_INSTALL_RESULT.txt" echo STATUS=STOP
  >>"%PKG%ASSET_R10_CMD_INSTALL_RESULT.txt" echo ERROR_CODE=STOP_PINNED_NODE_MISSING
  echo STOP_PINNED_NODE_MISSING
  exit /b 2
)
"%NODE%" "%PKG%r10-ops.mjs" install
set "RC=%ERRORLEVEL%"
echo ExitCode=%RC%
exit /b %RC%
