@echo off
setlocal
rem R27: official specialist report-store search, five independent keywords.
rem Read-only benchmark; no scores, orders, retries or source switching.
set "ZG_R27_SCRIPT=%~dp0keyword-growth-speed-r27-readonly.mjs"
if exist "E:\ZGmini\runtime\node.exe" (
    "E:\ZGmini\runtime\node.exe" "%ZG_R27_SCRIPT%" "%~1"
) else (
    node "%ZG_R27_SCRIPT%" "%~1"
)
set "ZG_R27_EXIT=%ERRORLEVEL%"
echo.
echo RESULT_FILE=%~dp0R27_KEYWORD_SEARCH_TIMINGS.txt
echo EXIT_CODE=%ZG_R27_EXIT%
pause
exit /b %ZG_R27_EXIT%
