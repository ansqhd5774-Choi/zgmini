@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
echo R45 TOPIC 01/21 - INFORMATION TECHNOLOGY
echo 4 PUBLISHERS - 1 WARMUP + 3 MEASURED RUNS
echo Research only. No DB, score, deploy or orders.
where node >nul 2>nul
if errorlevel 1 goto NODE_MISSING
node "%~dp0stage04\stage04-topic01-r45-readonly.mjs"
set "R45_EXIT=%ERRORLEVEL%"
echo.
echo Result: "%~dp0R45_TOPIC01_INFORMATION_TECHNOLOGY_RESULT.txt"
echo JSON:   "%~dp0R45_TOPIC01_INFORMATION_TECHNOLOGY_RESULT.json"
echo Exit code: %R45_EXIT%
echo Please send the TXT file to ChatGPT.
pause
exit /b %R45_EXIT%
:NODE_MISSING
echo REPORT=STAGE04_R45_TOPIC_01>"%~dp0R45_TOPIC01_INFORMATION_TECHNOLOGY_RESULT.txt"
echo STATUS=FAILED>>"%~dp0R45_TOPIC01_INFORMATION_TECHNOLOGY_RESULT.txt"
echo ERROR=NODE_NOT_FOUND>>"%~dp0R45_TOPIC01_INFORMATION_TECHNOLOGY_RESULT.txt"
echo Node.js not found. No research started.
pause
exit /b 1
