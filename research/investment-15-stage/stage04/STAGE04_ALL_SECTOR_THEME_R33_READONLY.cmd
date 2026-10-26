@echo off
setlocal
cd /d "%~dp0"
echo REPORT=STAGE04_ALL_SECTOR_THEME_R33_FOUR_SOURCE_FAST_FALLBACK_READONLY
echo SOURCES=TBRC,GVR,MORDOR,FORTUNE
echo QUERY_PER_SOURCE=1
echo REPORT_PER_SOURCE=1
echo OLLAMA_PER_SOURCE=1
echo MAX_MS_PER_SOURCE=5000
echo MAX_MS_PER_KEYWORD=20000
set "ZG_R33_SCRIPT=%~dp0keyword-growth-all-r33-readonly.mjs"
if exist "E:\ZGmini\runtime\node.exe" (
  "E:\ZGmini\runtime\node.exe" "%ZG_R33_SCRIPT%" gemma3:4b
) else (
  node "%ZG_R33_SCRIPT%" gemma3:4b
)
set "ZG_R33_EXIT=%ERRORLEVEL%"
echo RESULT_FILE=%~dp0R33_ALL_SECTOR_THEME_GROWTH_RESULT.txt
echo EXIT_CODE=%ZG_R33_EXIT%
pause
exit /b %ZG_R33_EXIT%
