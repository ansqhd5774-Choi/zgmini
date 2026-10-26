@echo off
setlocal
rem R30: 5 independent official TBRC report searches + local Ollama forecast rates.
rem Forecast years come only from the audited source table. Research-only.
set "ZG_R30_SCRIPT=%~dp0keyword-growth-speed-r30-readonly.mjs"
if exist "E:\ZGmini\runtime\node.exe" (
    "E:\ZGmini\runtime\node.exe" "%ZG_R30_SCRIPT%" "%~1"
) else (
    node "%ZG_R30_SCRIPT%" "%~1"
)
set "ZG_R30_EXIT=%ERRORLEVEL%"
echo.
echo RESULT_FILE=%~dp0R30_KEYWORD_SEARCH_TIMINGS.txt
echo EXIT_CODE=%ZG_R30_EXIT%
rem EXIT_CODE 2 means source figures disagree; remaining keywords were still tested.
pause
exit /b %ZG_R30_EXIT%
