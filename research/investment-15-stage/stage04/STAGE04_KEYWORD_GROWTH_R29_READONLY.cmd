@echo off
setlocal
rem R29: 5 independent official report searches + Ollama + source conflict audit.
rem Research-only. No scoring, orders, retries, source switching or publication.
set "ZG_R29_SCRIPT=%~dp0keyword-growth-speed-r29-readonly.mjs"
if exist "E:\ZGmini\runtime\node.exe" (
    "E:\ZGmini\runtime\node.exe" "%ZG_R29_SCRIPT%" "%~1"
) else (
    node "%ZG_R29_SCRIPT%" "%~1"
)
set "ZG_R29_EXIT=%ERRORLEVEL%"
echo.
echo RESULT_FILE=%~dp0R29_KEYWORD_SEARCH_TIMINGS.txt
echo EXIT_CODE=%ZG_R29_EXIT%
rem EXIT_CODE 2: source figures disagree; all five keyword runs may still finish.
pause
exit /b %ZG_R29_EXIT%
