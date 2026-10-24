@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "RUN_DIR=%~dp0"
set "NODE_EXE=E:\ZGmini\runtime\node.exe"
set "ZGMINI_DATA_ROOT=E:\ZGmini\data"
set "OUT_FILE=%RUN_DIR%BIOTECH_CONTINUATION_R6_LOG.txt"
if not exist "%NODE_EXE%" (
  > "%OUT_FILE%" echo ERROR=NODE_RUNTIME_MISSING
  exit /b 3
)
if not exist "%RUN_DIR%theme-biotech-continuation-r6-pc.mjs" (
  > "%OUT_FILE%" echo ERROR=SOURCE_NOT_INSTALLED
  exit /b 4
)
> "%OUT_FILE%" echo REPORT=BIOTECH_CONTINUATION_R6
"%NODE_EXE%" "%RUN_DIR%theme-biotech-continuation-r6-pc.mjs" --save-candidate >> "%OUT_FILE%" 2>&1
set "RUN_RC=%ERRORLEVEL%"
>> "%OUT_FILE%" echo CMD_EXIT_CODE=%RUN_RC%
exit /b %RUN_RC%
