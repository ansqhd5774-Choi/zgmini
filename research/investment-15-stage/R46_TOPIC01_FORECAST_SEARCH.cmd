@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
echo R46 TOPIC 01/21 - INFORMATION TECHNOLOGY
echo Official catalogs + search diagnostics + forecast verification
echo 1 WARMUP + 3 MEASURED RUNS
echo Research only. No DB, score, deploy or orders.
where node >nul 2>nul
if errorlevel 1 goto NODE_MISSING
node "%~dp0stage04\stage04-topic01-r46-catalog-repeat.mjs"
set "R46_EXIT=%ERRORLEVEL%"
echo.
echo Result: "%~dp0R46_TOPIC01_INFORMATION_TECHNOLOGY_RESULT.txt"
echo JSON:   "%~dp0R46_TOPIC01_INFORMATION_TECHNOLOGY_RESULT.json"
echo Exit code: %R46_EXIT%
echo Please send the TXT file to ChatGPT.
pause
exit /b %R46_EXIT%
:NODE_MISSING
echo REPORT=STAGE04_R46_TOPIC_01>"%~dp0R46_TOPIC01_INFORMATION_TECHNOLOGY_RESULT.txt"
echo STATUS=FAILED>>"%~dp0R46_TOPIC01_INFORMATION_TECHNOLOGY_RESULT.txt"
echo ERROR=NODE_NOT_FOUND>>"%~dp0R46_TOPIC01_INFORMATION_TECHNOLOGY_RESULT.txt"
echo Node.js not found. No research started.
pause
exit /b 1
