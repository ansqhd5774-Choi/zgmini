@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
    echo [R56] ERROR: Node.js is not in PATH.
    echo [R56] Please run this CMD with an existing Node.js environment.
    pause
    exit /b 1
)
echo [R56] Research topics 05 Financials, 06 Utilities, 07 Health Care.
echo [R56] Three topic jobs in parallel; Ollama model requests serialized.
echo [R56] One warmup and three measurements; nine first-party report URLs.
echo [R56] BRI excluded. No search, DB writes, source edits or deployment.
node "stage04\stage04-topic05-07-r56-triple.mjs"
if errorlevel 1 (
    echo [R56] FAILED. Send R56_TOPICS05_06_07_TRIPLE_RESULT.txt for diagnostics.
    pause
    exit /b 1
)
echo [R56] Complete. Send the following three files:
echo   R56_TOPICS05_06_07_TRIPLE_RESULT.txt
echo   R56_TOPICS05_06_07_TRIPLE_RESULT.json
echo   R56_TOPICS05_06_07_TRIPLE_RESULT_HISTORY.ndjson
pause
endlocal
