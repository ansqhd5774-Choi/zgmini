@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
echo [R49] TOPIC01 Information Technology - 3 active publishers
echo [R49] BRI excluded after prior HTTP 403. No retry or bypass.
where node >nul 2>nul
if errorlevel 1 goto NODE_MISSING
node "%~dp0stage04\stage04-topic01-r49-three-media.mjs"
set "R49_EXIT=%ERRORLEVEL%"
echo.
echo [R49] RESULT=%R49_EXIT%
echo [R49] SEND R49_TOPIC01_INFORMATION_TECHNOLOGY_RESULT.txt
pause
exit /b %R49_EXIT%
:NODE_MISSING
echo [R49] ERROR=NODE_NOT_FOUND
pause
exit /b 1
