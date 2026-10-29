@echo off
setlocal EnableExtensions DisableDelayedExpansion
chcp 65001 >nul
title ZGMINI Stage04 R86 Numeric Join - No Ollama Rerun

set "BASE=%~dp0"
set "REPO=%BASE%..\..\.."
set "RUNNER=%BASE%stage04-r86-numeric-bridge.mjs"
set "INPUT=%~1"

if not exist "%RUNNER%" (
  echo R86_ERROR=RUNNER_NOT_INSTALLED
  goto :failed
)
where node >nul 2>&1
if errorlevel 1 (
  echo R86_ERROR=NODE_NOT_FOUND
  goto :failed
)

if not defined INPUT (
  if exist "%BASE%R72_OLLAMA_FORECAST_PIPELINE_RESULT.json" (
    set "INPUT=%BASE%R72_OLLAMA_FORECAST_PIPELINE_RESULT.json"
  )
)
if not defined INPUT (
  echo R86_ERROR=R82_RESULT_JSON_NOT_PROVIDED
  echo Drag the existing R72_OLLAMA_FORECAST_PIPELINE_RESULT.json onto this CMD.
  echo Or copy that JSON into the same folder as this CMD.
  goto :failed
)
if not exist "%INPUT%" (
  echo R86_ERROR=R82_RESULT_JSON_FILE_NOT_FOUND
  echo INPUT=%INPUT%
  goto :failed
)

set "OUT=%BASE%STAGE04_R86_NUMERIC_%RANDOM%_%RANDOM%"
echo R86_MODE=READ_ONLY_EXISTING_R82_PLUS_LIVE_PUBLIC_FEEDS
echo R86_NO_OLLAMA_RERUN=TRUE
echo R86_INPUT=%INPUT%
node "%RUNNER%" --r82 "%INPUT%" --json "%OUT%.json" --md "%OUT%.md"
if errorlevel 1 goto :failed

echo R86_STATUS=COMPLETED_WITH_APPROVAL_GATES
echo SEND_R86_JSON=%OUT%.json
echo SEND_R86_MD=%OUT%.md
echo R86_FINAL_M4_NOT_AUTOMATICALLY_ASSIGNED=TRUE
pause
exit /b 0

:failed
echo R86_STATUS=FAILED_NOT_COMPLETED
pause
exit /b 1
