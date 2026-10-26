@echo off
setlocal
rem One selected publisher, one short excerpt, one Ollama call.
rem Optional: pass locally installed model name as first argument.
set "ZG_R23_SCRIPT=%~dp0market-growth-ollama-r23-readonly.mjs"
if exist "E:\ZGmini\runtime\node.exe" (
    "E:\ZGmini\runtime\node.exe" "%ZG_R23_SCRIPT%" "%~1"
) else (
    node "%ZG_R23_SCRIPT%" "%~1"
)
set "ZG_R23_EXIT=%ERRORLEVEL%"
echo.
echo RESULT_FILE=%~dp0R23_OLLAMA_GROWTH_RESULT.txt
echo EXIT_CODE=%ZG_R23_EXIT%
pause
exit /b %ZG_R23_EXIT%
