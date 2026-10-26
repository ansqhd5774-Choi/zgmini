@echo off
setlocal
rem R28: five independent official TBRC keyword searches plus local Ollama JSON-schema verification.
rem Read-only speed benchmark. No retries, scores, orders, source switching, or publication.
set "ZG_R28_SCRIPT=%~dp0keyword-growth-speed-r28-readonly.mjs"
if exist "E:\ZGmini\runtime\node.exe" (
    "E:\ZGmini\runtime\node.exe" "%ZG_R28_SCRIPT%" "%~1"
) else (
    node "%ZG_R28_SCRIPT%" "%~1"
)
set "ZG_R28_EXIT=%ERRORLEVEL%"
echo.
echo RESULT_FILE=%~dp0R28_KEYWORD_SEARCH_TIMINGS.txt
echo EXIT_CODE=%ZG_R28_EXIT%
pause
exit /b %ZG_R28_EXIT%
