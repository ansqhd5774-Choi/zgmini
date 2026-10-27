@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
echo [R50] Stage04 Topic02 Communication Services - research only
echo [R50] Active=TBRC,SkyQuest,Precedence; BRI=HTTP403 excluded
echo [R50] One warm-up plus three measured passes.
where node >nul 2>nul
if errorlevel 1 goto NODE_MISSING
node "%~dp0stage04\stage04-topic02-r50-three-media.mjs"
set "R50_EXIT=%ERRORLEVEL%"
echo.
echo [R50] RESULT=%R50_EXIT%
echo [R50] SEND R50_TOPIC02_COMMUNICATION_RESULT.txt
echo [R50] HISTORY R50_TOPIC02_COMMUNICATION_RESULT_HISTORY.ndjson
pause
exit /b %R50_EXIT%
:NODE_MISSING
echo [R50] ERROR=NODE_NOT_FOUND
pause
exit /b 1
