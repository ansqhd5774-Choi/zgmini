@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "RUN_DIR=%~dp0"
set "R63_FILE=%RUN_DIR%..\recovered-cagr-r63-r66\CAGR_R63_21_SOURCE_MATRIX_20261027.md"
set "R17_FILE=%RUN_DIR%..\STAGE04_INVESTMENT_BOT_R17_SENTIMENT_INDUSTRY_CONTRAST_20261025.md"
set "SCRIPT_FILE=%RUN_DIR%stage04-r69-reconcile-history.mjs"
set "LOG_FILE=%RUN_DIR%STAGE04_R69_PC_HISTORICAL_RESULT.txt"
set "JSON_FILE=%RUN_DIR%STAGE04_R69_PC_HISTORICAL_RESULT.json"
set "MD_FILE=%RUN_DIR%STAGE04_R69_PC_HISTORICAL_RESULT.md"
set "NODE_BIN=E:\ZGmini\runtime\node.exe"

if not exist "%R63_FILE%" (
  echo R69_R63_HISTORY_NOT_FOUND: "%R63_FILE%" >"%LOG_FILE%"
  type "%LOG_FILE%"
  exit /b 3
)
if not exist "%R17_FILE%" (
  echo R69_R17_HISTORY_NOT_FOUND: "%R17_FILE%" >"%LOG_FILE%"
  type "%LOG_FILE%"
  exit /b 3
)
if not exist "%SCRIPT_FILE%" (
  echo R69_SCRIPT_NOT_FOUND: "%SCRIPT_FILE%" >"%LOG_FILE%"
  type "%LOG_FILE%"
  exit /b 3
)
if not exist "%NODE_BIN%" (
  where node.exe >nul 2>&1
  if errorlevel 1 (
    echo R69_NODE_NOT_FOUND: E:\ZGmini\runtime\node.exe or PATH >"%LOG_FILE%"
    type "%LOG_FILE%"
    exit /b 3
  )
  set "NODE_BIN=node.exe"
)

"%NODE_BIN%" "%SCRIPT_FILE%" --r63 "%R63_FILE%" --r17 "%R17_FILE%" --json-output "%JSON_FILE%" --markdown-output "%MD_FILE%" >"%LOG_FILE%" 2>&1
set "RESULT_CODE=%ERRORLEVEL%"
type "%LOG_FILE%"
echo.
echo R69 historical JSON: "%JSON_FILE%"
echo R69 historical MD: "%MD_FILE%"
echo R69 log: "%LOG_FILE%"
echo NO HTTP GET, NO LIVE F, NO G/D/M SCORING, NO TRADES.
exit /b %RESULT_CODE%
