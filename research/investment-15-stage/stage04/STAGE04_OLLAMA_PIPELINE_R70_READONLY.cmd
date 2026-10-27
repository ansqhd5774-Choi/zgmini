@echo off
setlocal
rem R70 first executable pipeline: official TBRC source -> R30 Ollama -> strict gate.
rem Two independent publishers are required for any research mean. No score/trade.
set "ZG_R70_SCRIPT=%~dp0run-ollama-forecast-r70.mjs"
if exist "E:\ZGmini\runtime\node.exe" (
    "E:\ZGmini\runtime\node.exe" "%ZG_R70_SCRIPT%" %*
) else (
    node "%ZG_R70_SCRIPT%" %*
)
set "ZG_R70_EXIT=%ERRORLEVEL%"
echo.
echo RESULT_JSON=%~dp0R70_OLLAMA_FORECAST_PIPELINE_RESULT.json
echo RESULT_TXT=%~dp0R70_OLLAMA_FORECAST_PIPELINE_RESULT.txt
echo EXIT_CODE=%ZG_R70_EXIT%
pause
exit /b %ZG_R70_EXIT%
