@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
echo [R53] Stage04 Topics 03 and 04 - concurrent research
echo [R53] Concurrent topic workflows; Ollama uses a shared serial queue.
echo [R53] BRI=EXCLUDED_HTTP403, no requests
echo [R53] One warm-up and three measured passes
where node >nul 2>nul
if errorlevel 1 goto NODE_MISSING
node "%~dp0stage04\stage04-topic03-04-r53-parallel.mjs"
set "R53_EXIT=%ERRORLEVEL%"
echo.
echo [R53] RESULT=%R53_EXIT%
echo [R53] SEND=R53_TOPIC03_04_PARALLEL_RESULT.txt
echo [R53] HISTORY=R53_TOPIC03_04_PARALLEL_RESULT_HISTORY.ndjson
pause
exit /b %R53_EXIT%
:NODE_MISSING
echo [R53] ERROR=NODE_NOT_FOUND
pause
exit /b 1
