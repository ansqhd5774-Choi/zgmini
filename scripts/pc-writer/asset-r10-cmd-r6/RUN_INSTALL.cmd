@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "PKG=%~dp0"
set "NODE=E:\ZGmini\runtime\node.exe"
if not exist "%NODE%" (
  where node.exe >nul 2>&1
  if errorlevel 1 (
    echo STOP_NODE_RUNTIME_MISSING
    exit /b 2
  )
  set "NODE=node.exe"
)
"%NODE%" "%PKG%r10-ops.mjs" install
set "RC=%ERRORLEVEL%"
echo ExitCode=%RC%
exit /b %RC%
