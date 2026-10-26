@echo off
setlocal
rem R26: individual keyword search with visible RSS matching diagnostics.
rem Same growth specialist only; no retry, source switching or trading.
set "ZG_R26_SCRIPT=%~dp0keyword-growth-speed-r26-readonly.mjs"
if exist "E:\ZGmini\runtime\node.exe" (
    "E:\ZGmini\runtime\node.exe" "%ZG_R26_SCRIPT%" "%~1"
) else (
    node "%ZG_R26_SCRIPT%" "%~1"
)
set "ZG_R26_EXIT=%ERRORLEVEL%"
echo.
echo RESULT_FILE=%~dp0R26_KEYWORD_SEARCH_TIMINGS.txt
echo EXIT_CODE=%ZG_R26_EXIT%
pause
exit /b %ZG_R26_EXIT%
