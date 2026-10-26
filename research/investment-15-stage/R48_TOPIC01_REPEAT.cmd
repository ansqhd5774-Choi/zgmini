@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
echo R48 TOPIC 01/21 - INFORMATION TECHNOLOGY
echo Constrained model candidate ID and independent search engines
echo 1 WARMUP + 3 MEASURED RUNS
echo Research only. No DB, formula, publish or orders.
where node >nul 2>nul
if errorlevel 1 goto NODE_MISSING
node "%~dp0stage04\stage04-topic01-r48-repeat.mjs"
set "R48_EXIT=%ERRORLEVEL%"
echo.
echo Result: "%~dp0R48_TOPIC01_INFORMATION_TECHNOLOGY_RESULT.txt"
echo JSON:   "%~dp0R48_TOPIC01_INFORMATION_TECHNOLOGY_RESULT.json"
echo Exit code: %R48_EXIT%
echo Please send the TXT file to ChatGPT.
pause
exit /b %R48_EXIT%
:NODE_MISSING
echo REPORT=STAGE04_R48_TOPIC_01>"%~dp0R48_TOPIC01_INFORMATION_TECHNOLOGY_RESULT.txt"
echo STATUS=FAILED>>"%~dp0R48_TOPIC01_INFORMATION_TECHNOLOGY_RESULT.txt"
echo ERROR=NODE_NOT_FOUND>>"%~dp0R48_TOPIC01_INFORMATION_TECHNOLOGY_RESULT.txt"
echo Node.js not found. No research started.
pause
exit /b 1
