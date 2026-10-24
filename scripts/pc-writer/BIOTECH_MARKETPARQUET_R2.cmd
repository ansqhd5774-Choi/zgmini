@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "RUN_DIR=%~dp0"
set "NODE_EXE=E:\ZGmini\runtime\node.exe"
set "DATA_ROOT=E:\ZGmini\data"
set "OUT_FILE=%RUN_DIR%BIOTECH_MARKETPARQUET_R2_LOG.txt"
if not exist "%NODE_EXE%" (
  > "%OUT_FILE%" echo ERROR=NODE_RUNTIME_MISSING
  echo %NODE_EXE% not found. See %OUT_FILE%
  exit /b 3
)
if not exist "%RUN_DIR%theme-biotech-marketparquet-r2.mjs" (
  > "%OUT_FILE%" echo ERROR=DIAGNOSTIC_SOURCE_MISSING
  echo Source not found. See %OUT_FILE%
  exit /b 4
)
> "%OUT_FILE%" echo REPORT=BIOTECH_MARKETPARQUET_R2
>> "%OUT_FILE%" echo CMD_STARTED_DATE=%DATE%
>> "%OUT_FILE%" echo CMD_STARTED_TIME=%TIME%
if "%~1"=="" (
  "%NODE_EXE%" "%RUN_DIR%theme-biotech-marketparquet-r2.mjs" --data-root "%DATA_ROOT%" >> "%OUT_FILE%" 2>&1
) else (
  "%NODE_EXE%" "%RUN_DIR%theme-biotech-marketparquet-r2.mjs" --data-root "%DATA_ROOT%" --parquet-path "%~1" >> "%OUT_FILE%" 2>&1
)
set "RUN_RC=%ERRORLEVEL%"
>> "%OUT_FILE%" echo CMD_EXIT_CODE=%RUN_RC%
echo Finished. See %OUT_FILE%
exit /b %RUN_RC%
