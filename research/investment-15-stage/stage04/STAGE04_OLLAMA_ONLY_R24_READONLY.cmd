@echo off
setlocal
rem R24 model-only speed measurement. No external publisher requests.
rem Pass an installed model name as optional first argument.
set "ZG_R24_SCRIPT=%~dp0market-growth-ollama-r23-readonly.mjs"
if exist "E:\ZGmini\runtime\node.exe" (
    "E:\ZGmini\runtime\node.exe" "%ZG_R24_SCRIPT%" --ollama-only "%~1"
) else (
    node "%ZG_R24_SCRIPT%" --ollama-only "%~1"
)
set "ZG_R24_EXIT=%ERRORLEVEL%"
echo.
echo RESULT_FILE=%~dp0R24_OLLAMA_ONLY_RESULT.txt
echo EXIT_CODE=%ZG_R24_EXIT%
pause
exit /b %ZG_R24_EXIT%
