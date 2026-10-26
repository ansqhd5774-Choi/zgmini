@echo off
setlocal
rem R32: Direct subject title match, live sectors/themes, research ONLY.
set "ZG_R32_SCRIPT=%~dp0keyword-growth-all-r32-readonly.mjs"
if exist "E:\ZGmini\runtime\node.exe" (
    "E:\ZGmini\runtime\node.exe" "%ZG_R32_SCRIPT%" "%~1"
) else (
    node "%ZG_R32_SCRIPT%" "%~1"
)
set "ZG_R32_EXIT=%ERRORLEVEL%"
echo RESULT_FILE=%~dp0R32_ALL_SECTOR_THEME_GROWTH_RESULT.txt
echo EXIT_CODE=%ZG_R32_EXIT%
pause
exit /b %ZG_R32_EXIT%
