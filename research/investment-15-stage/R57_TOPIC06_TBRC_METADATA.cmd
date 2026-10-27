@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
    echo [R57] ERROR: Node.js was not found. Use your existing Node.js CMD.
    pause
    exit /b 1
)
echo [R57] Recheck ONLY the TBRC Utilities 2026 public report.
echo [R57] 1 warmup + 3 measured live reads; one Ollama selection per run.
echo [R57] The 2035 metadata mismatch remains explicitly disclosed.
echo [R57] No BRI, search, other R56 sources, DB, deployment or scheduled jobs.
node "stage04\stage04-topic06-r57.test.mjs"
if errorlevel 1 (
    echo [R57] Local regression tests failed. Live research NOT started.
    pause
    exit /b 1
)
node "stage04\stage04-topic06-r57-utilities-recheck.mjs"
if errorlevel 1 (
    echo [R57] Research failed. Send the TXT file for diagnosis.
    pause
    exit /b 1
)
echo [R57] Finished. Send these three files to ChatGPT:
echo   R57_TOPIC06_TBRC_METADATA_RESULT.txt
echo   R57_TOPIC06_TBRC_METADATA_RESULT.json
echo   R57_TOPIC06_TBRC_METADATA_RESULT_HISTORY.ndjson
pause
endlocal
