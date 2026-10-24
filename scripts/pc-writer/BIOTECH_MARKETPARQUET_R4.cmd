@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "RUN_DIR=%~dp0"
set "NODE_EXE=E:\ZGmini\runtime\node.exe"
set "DATA_ROOT=E:\ZGmini\data"
set "OUT_FILE=%RUN_DIR%BIOTECH_MARKETPARQUET_R4_LOG.txt"
if not exist "%NODE_EXE%" (
  > "%OUT_FILE%" echo ERROR=NODE_RUNTIME_MISSING
  exit /b 3
)
if not exist "%RUN_DIR%theme-biotech-marketparquet-r4.mjs" (
  > "%OUT_FILE%" echo ERROR=DIAGNOSTIC_SOURCE_MISSING
  exit /b 4
)
> "%OUT_FILE%" echo REPORT=BIOTECH_MARKETPARQUET_R4
>> "%OUT_FILE%" echo CMD_STARTED_DATE=%DATE%
>> "%OUT_FILE%" echo CMD_STARTED_TIME=%TIME%
"%NODE_EXE%" "%RUN_DIR%theme-biotech-marketparquet-r4.mjs" --data-root "%DATA_ROOT%" >> "%OUT_FILE%" 2>&1
set "RUN_RC=%ERRORLEVEL%"
>> "%OUT_FILE%" echo CMD_EXIT_CODE=%RUN_RC%
echo Finished. See %OUT_FILE%
exit /b %RUN_RC%
