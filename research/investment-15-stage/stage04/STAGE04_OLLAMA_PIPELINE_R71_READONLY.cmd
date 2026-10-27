@echo off
setlocal
rem R71 three live publisher calls: TBRC, SkyQuest, Precedence + local Ollama.
rem This file only runs the read-only research code; there are no trades or D1 writes.
set "ZG_R71_SCRIPT=%~dp0run-ollama-forecast-r71.mjs"
if exist "E:\ZGmini\runtime\node.exe" (
    "E:\ZGmini\runtime\node.exe" "%ZG_R71_SCRIPT%" %*
) else (
    node "%ZG_R71_SCRIPT%" %*
)
set "ZG_R71_EXIT=%ERRORLEVEL%"
echo.
echo RESULT_JSON=%~dp0R71_OLLAMA_FORECAST_PIPELINE_RESULT.json
echo RESULT_TXT=%~dp0R71_OLLAMA_FORECAST_PIPELINE_RESULT.txt
echo EXIT_CODE=%ZG_R71_EXIT%
pause
exit /b %ZG_R71_EXIT%
