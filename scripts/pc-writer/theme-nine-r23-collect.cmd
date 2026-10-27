@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem R23 approved 63-ETF private collection. Never changes published data or scheduler.
set "TASK_SCRIPT=%~dp0theme-nine-r23-collect.mjs"
set "TASK_RESULT=%~dp0THEME_NINE_R23_COLLECTION_RESULT.txt"
set "TASK_NODE=node"
if exist "E:\ZGmini\runtime\node.exe" set "TASK_NODE=E:\ZGmini\runtime\node.exe"
if not exist "%TASK_SCRIPT%" (
  >"%TASK_RESULT%" echo ERROR=R23_MJS_MUST_BE_BESIDE_CMD
  type "%TASK_RESULT%"
  exit /b 2
)
set "TASK_MODE=%~1"
if "%TASK_MODE%"=="" set "TASK_MODE=--inspect"
if not "%TASK_MODE%"=="--inspect" if not "%TASK_MODE%"=="--collect" (
  >"%TASK_RESULT%" echo ERROR=USE_INSPECT_OR_COLLECT
  type "%TASK_RESULT%"
  exit /b 2
)
"%TASK_NODE%" "%TASK_SCRIPT%" "%TASK_MODE%" "%~2" "%~3" >"%TASK_RESULT%" 2>&1
set "TASK_EXIT=%ERRORLEVEL%"
type "%TASK_RESULT%"
exit /b %TASK_EXIT%
