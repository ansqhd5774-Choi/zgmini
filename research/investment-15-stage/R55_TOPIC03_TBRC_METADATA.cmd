@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
    echo [R55] ERROR: Node.js not found in PATH.
    pause
    exit /b 1
)
echo [R55] Targeted TBRC passenger-car forecast audit.
echo [R55] Official public report only. 1 warm-up + 3 repeat measurements.
echo [R55] No other publishers, no search engines, no BRI requests.
node "stage04\stage04-topic03-r55-historic-mislabel-recheck.mjs"
if errorlevel 1 (
    echo [R55] ERROR. Send R55_TOPIC03_TBRC_METADATA_RESULT.txt.
    pause
    exit /b 1
)
echo [R55] Complete. Send R55_TOPIC03_TBRC_METADATA_RESULT.txt and .json.
pause
endlocal
