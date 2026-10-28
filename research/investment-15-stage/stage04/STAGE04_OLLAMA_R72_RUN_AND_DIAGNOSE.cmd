@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem R72 self-contained ZIP: unzip ALL files together before running.
rem Always leave diagnostic, JSON and TXT in this same directory.
set "ZG_R72_DIR=%~dp0"
set "ZG_R72_SCRIPT=%ZG_R72_DIR%run-ollama-forecast-r72-safe.mjs"
set "ZG_R72_DIAG=%ZG_R72_DIR%R72_EXECUTION_DIAGNOSTIC.txt"
set "ZG_R72_JSON=%ZG_R72_DIR%R72_OLLAMA_FORECAST_PIPELINE_RESULT.json"
set "ZG_R72_TXT=%ZG_R72_DIR%R72_OLLAMA_FORECAST_PIPELINE_RESULT.txt"
>"%ZG_R72_DIAG%" echo R72_CMD_STARTED
>"%ZG_R72_JSON%" echo {"report":"STAGE04_OLLAMA_FORECAST_PIPELINE_R72","run_state":"CMD_BOOTING","fatal_error":"NODE_NOT_STARTED"}
>"%ZG_R72_TXT%" echo RUN_STATE=CMD_BOOTING
if not exist "%ZG_R72_SCRIPT%" goto missing_script
if exist "E:\ZGmini\runtime\node.exe" (
    set "ZG_R72_NODE=E:\ZGmini\runtime\node.exe"
) else (
    where node >nul 2>nul
    if errorlevel 1 goto missing_node
    set "ZG_R72_NODE=node"
)
echo NODE=%ZG_R72_NODE%>>"%ZG_R72_DIAG%"
echo Running official publishers and local Ollama. Please wait.
"%ZG_R72_NODE%" "%ZG_R72_SCRIPT%" %* >>"%ZG_R72_DIAG%" 2>&1
set "ZG_R72_EXIT=%ERRORLEVEL%"
echo NODE_EXIT_CODE=%ZG_R72_EXIT%>>"%ZG_R72_DIAG%"
goto complete
:missing_script
>"%ZG_R72_JSON%" echo {"report":"STAGE04_OLLAMA_FORECAST_PIPELINE_R72","run_state":"BOOT_FAILED","fatal_error":"RUNNER_MODULE_MISSING"}
>"%ZG_R72_TXT%" echo RUN_STATE=BOOT_FAILED RUNNER_MODULE_MISSING
echo ERROR=RUNNER_MODULE_MISSING>>"%ZG_R72_DIAG%"
set "ZG_R72_EXIT=1"
goto complete
:missing_node
>"%ZG_R72_JSON%" echo {"report":"STAGE04_OLLAMA_FORECAST_PIPELINE_R72","run_state":"BOOT_FAILED","fatal_error":"NODE_NOT_FOUND"}
>"%ZG_R72_TXT%" echo RUN_STATE=BOOT_FAILED NODE_NOT_FOUND
echo ERROR=NODE_NOT_FOUND>>"%ZG_R72_DIAG%"
set "ZG_R72_EXIT=1"
:complete
echo.
type "%ZG_R72_DIAG%"
echo.
echo RESULT_JSON=%ZG_R72_JSON%
echo RESULT_TXT=%ZG_R72_TXT%
echo DIAGNOSTIC=%ZG_R72_DIAG%
echo EXIT_CODE=%ZG_R72_EXIT%
pause
exit /b %ZG_R72_EXIT%
