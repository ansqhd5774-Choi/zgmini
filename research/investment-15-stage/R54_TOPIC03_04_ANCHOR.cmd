@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
    echo [R54] ERROR: Node.js not found in PATH.
    pause
    exit /b 1
)
echo [R54] Topics 03 and 04 concurrently. Official first-party report URLs only.
echo [R54] Model requests queued one-at-a-time. BRI excluded.
node "stage04\stage04-topic03-04-r54-first-party-anchors.mjs"
if errorlevel 1 (
    echo [R54] ERROR. Please send R54_TOPIC03_04_ANCHOR_RESULT.txt
    pause
    exit /b 1
)
echo [R54] Complete. Please send R54_TOPIC03_04_ANCHOR_RESULT.txt and .json.
pause
endlocal
