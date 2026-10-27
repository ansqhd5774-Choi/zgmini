@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
    echo [R58] ERROR: Node.js is not available in PATH.
    pause
    exit /b 1
)
echo [R58] Only the TBRC Utilities public report. Nothing else is re-fetched.
echo [R58] Separate publisher-calculated CAGR and Ollama topic judgment.
echo [R58] 1 warmup plus 3 measurements. Existing local gemma3:4b.
echo [R58] No BRI, search, subscription bypass, score, DB or deployment.
node "stage04\stage04-topic06-r58.test.mjs"
if errorlevel 1 (
    echo [R58] Local tests failed. Public research will NOT run.
    pause
    exit /b 1
)
node "stage04\stage04-topic06-r58-scope-diagnostic.mjs"
if errorlevel 1 (
    echo [R58] Failed. Send TXT for diagnosis.
    pause
    exit /b 1
)
echo [R58] Completed. Send these 3 files:
echo   R58_TOPIC06_SCOPE_DIAG_RESULT.txt
echo   R58_TOPIC06_SCOPE_DIAG_RESULT.json
echo   R58_TOPIC06_SCOPE_DIAG_RESULT_HISTORY.ndjson
pause
endlocal
