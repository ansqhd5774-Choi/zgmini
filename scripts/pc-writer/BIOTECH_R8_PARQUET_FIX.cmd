@echo off
setlocal DisableDelayedExpansion
cd /d "%~dp0"
set "OUT=%~dp0BIOTECH_R8_PARQUET_FIX_LOG.txt"
set "NODE=E:\ZGmini\runtime\node.exe"
> "%OUT%" echo REPORT=BIOTECH_R8_PARQUET_READER_FIX
if not exist "%NODE%" (
  >> "%OUT%" echo ERROR=APPROVED_NODE_MISSING
  exit /b 1
)
"%NODE%" "%~dp0theme-biotech-r8-parquet-fix-apply.mjs" --apply >> "%OUT%" 2>&1
set "EXIT_CODE=%ERRORLEVEL%"
>> "%OUT%" echo CMD_EXIT_CODE=%EXIT_CODE%
exit /b %EXIT_CODE%
