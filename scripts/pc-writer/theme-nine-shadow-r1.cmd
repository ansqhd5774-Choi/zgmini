@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "TASK_RESULT=%~dp0THEME_NINE_SHADOW_R1_RESULT.txt"
set "TASK_RUNNER=%~dp0theme-nine-shadow-r1.mjs"
set "TASK_NODE=node"
if exist "E:\ZGmini\runtime\node.exe" set "TASK_NODE=E:\ZGmini\runtime\node.exe"
if "%~1"=="" (
  >"%TASK_RESULT%" echo ERROR=INPUT_JSON_PATH_REQUIRED
  type "%TASK_RESULT%"
  exit /b 2
)
"%TASK_NODE%" "%TASK_RUNNER%" --input "%~1" >"%TASK_RESULT%" 2>&1
set "TASK_EXIT=%ERRORLEVEL%"
type "%TASK_RESULT%"
exit /b %TASK_EXIT%
