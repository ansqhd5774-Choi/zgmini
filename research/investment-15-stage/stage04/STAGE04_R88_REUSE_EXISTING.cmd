@echo off
setlocal EnableExtensions DisableDelayedExpansion
cd /d "%~dp0"
set "NODE_BIN=E:\ZGmini\runtime\node.exe"
if not exist "%NODE_BIN%" set "NODE_BIN=node"
set "INPUT=%~1"
if "%INPUT%"=="" set "INPUT=%~dp0STAGE04_R86_LIVE_NUMERIC_RESULT_20261029.json"
if not exist "%INPUT%" (
  echo R88_INPUT_NOT_FOUND=%INPUT%
  echo Place the existing R86 result JSON next to this CMD or drag it onto this CMD.
  pause
  exit /b 2
)
set "RUN_ID=%RANDOM%_%RANDOM%"
set "OUT_JSON=%~dp0STAGE04_R88_EXISTING_%RUN_ID%.json"
set "OUT_MD=%~dp0STAGE04_R88_EXISTING_%RUN_ID%.md"
rem Do not pass a quoted argument ending with backslash to Windows Node argv.
rem The trailing dot keeps the folder path valid without quote escaping.
set "ARCHIVE_DIR=%~dp0."
echo R88_REUSE_EXISTING_INPUT=%INPUT%
echo R88_SAVED_OFFICIAL_REPORTS=2026-10-25_ARCHIVE
echo R88_API_OLLAMA_RECOLLECTION=NONE
"%NODE_BIN%" "%~dp0stage04-r88-existing-results-bridge.mjs" --r86 "%INPUT%" --archive-dir "%ARCHIVE_DIR%" --json "%OUT_JSON%" --md "%OUT_MD%"
if errorlevel 1 (
  echo R88_FAILED
  pause
  exit /b 1
)
echo R88_JSON=%OUT_JSON%
echo R88_MD=%OUT_MD%
echo R88_SUCCESS=OFFLINE_EXISTING_RESULT_JOIN_ONLY
pause
endlocal
