@echo off
setlocal
rem R25: five separate keyword searches; 20 seconds per keyword.
rem One specialized publisher, one search result and one Ollama call per keyword.
set "ZG_R25_SCRIPT=%~dp0keyword-growth-speed-r25-readonly.mjs"
if exist "E:\ZGmini\runtime\node.exe" (
    "E:\ZGmini\runtime\node.exe" "%ZG_R25_SCRIPT%" "%~1"
) else (
    node "%ZG_R25_SCRIPT%" "%~1"
)
set "ZG_R25_EXIT=%ERRORLEVEL%"
echo.
echo RESULT_FILE=%~dp0R25_KEYWORD_SEARCH_TIMINGS.txt
echo EXIT_CODE=%ZG_R25_EXIT%
pause
exit /b %ZG_R25_EXIT%
