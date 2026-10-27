@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "RUN_DIR=%~dp0"
set "MATRIX_FILE=%RUN_DIR%..\recovered-cagr-r63-r66\CAGR_R63_21_SOURCE_MATRIX_20261027.md"
set "SCRIPT_FILE=%RUN_DIR%stage04-r68-matrix.mjs"
set "LOG_FILE=%RUN_DIR%STAGE04_R68_PC_RESULT.txt"
set "RESULT_FILE=%RUN_DIR%STAGE04_R68_PC_RESULT.json"
set "NODE_BIN=E:\ZGmini\runtime\node.exe"

if not exist "%MATRIX_FILE%" (
  echo R68_INPUT_NOT_FOUND: %MATRIX_FILE%
  exit /b 3
)
if not exist "%SCRIPT_FILE%" (
  echo R68_SCRIPT_NOT_FOUND: %SCRIPT_FILE%
  exit /b 3
)
if not exist "%NODE_BIN%" (
  where node.exe >nul 2>&1
  if errorlevel 1 (
    echo R68_NODE_NOT_FOUND: E:\ZGmini\runtime\node.exe or PATH
    exit /b 3
  )
  set "NODE_BIN=node.exe"
)

"%NODE_BIN%" "%SCRIPT_FILE%" --matrix "%MATRIX_FILE%" --live-f --output "%RESULT_FILE%" >"%LOG_FILE%" 2>&1
set "RESULT_CODE=%ERRORLEVEL%"
type "%LOG_FILE%"
echo.
echo R68 result JSON: "%RESULT_FILE%"
echo R68 log: "%LOG_FILE%"
if not "%RESULT_CODE%"=="0" echo R68 PARTIAL OR FAILED, exit code=%RESULT_CODE%
exit /b %RESULT_CODE%
