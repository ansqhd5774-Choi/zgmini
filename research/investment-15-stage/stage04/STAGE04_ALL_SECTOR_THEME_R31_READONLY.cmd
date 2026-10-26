@echo off
setlocal
rem R31: ALL current public sectors and themes. Research only, no trading.
set "ZG_R31_SCRIPT=%~dp0keyword-growth-all-r31-readonly.mjs"
if exist "E:\ZGmini\runtime\node.exe" (
    "E:\ZGmini\runtime\node.exe" "%ZG_R31_SCRIPT%" "%~1"
) else (
    node "%ZG_R31_SCRIPT%" "%~1"
)
set "ZG_R31_EXIT=%ERRORLEVEL%"
echo RESULT_FILE=%~dp0R31_ALL_SECTOR_THEME_GROWTH_RESULT.txt
echo EXIT_CODE=%ZG_R31_EXIT%
pause
exit /b %ZG_R31_EXIT%
