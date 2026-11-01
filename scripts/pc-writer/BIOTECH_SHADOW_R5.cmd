@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "RUN_DIR=%~dp0"
set "NODE_EXE=E:\ZGmini\runtime\node.exe"
set "ZGMINI_DATA_ROOT=E:\ZGmini\data"
set "OUT_FILE=%RUN_DIR%BIOTECH_SHADOW_R5_LOG.txt"
if not exist "%NODE_EXE%" (
  > "%OUT_FILE%" echo ERROR=NODE_RUNTIME_MISSING
  exit /b 3
)
if not exist "%RUN_DIR%theme-biotech-shadow-r5.mjs" (
  > "%OUT_FILE%" echo ERROR=SOURCE_NOT_INSTALLED
  exit /b 4
)
> "%OUT_FILE%" echo REPORT=BIOTECH_SHADOW_R5
"%NODE_EXE%" "%RUN_DIR%theme-biotech-shadow-r5.mjs" --save-shadow >> "%OUT_FILE%" 2>&1
set "RUN_RC=%ERRORLEVEL%"
>> "%OUT_FILE%" echo CMD_EXIT_CODE=%RUN_RC%
exit /b %RUN_RC%
