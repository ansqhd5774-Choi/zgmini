@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
echo R47 - ONE TBRC REPORT + ONE OLLAMA SCHEMA TEST
echo No 21-topic crawl, no Google/Bing search, no DB or score change.
where node >nul 2>nul
if errorlevel 1 goto NODE_MISSING
node "%~dp0stage04\stage04-topic01-r47-ollama-diagnostic.mjs"
set "R47_EXIT=%ERRORLEVEL%"
echo.
echo Result: "%~dp0R47_TOPIC01_OLLAMA_DIAG_RESULT.txt"
echo Exit code: %R47_EXIT%
echo Send the TXT file to ChatGPT.
pause
exit /b %R47_EXIT%
:NODE_MISSING
echo REPORT=STAGE04_R47_OLLAMA_DIAG>"%~dp0R47_TOPIC01_OLLAMA_DIAG_RESULT.txt"
echo STATUS=DIAGNOSTIC_FAILED>>"%~dp0R47_TOPIC01_OLLAMA_DIAG_RESULT.txt"
echo ERROR=NODE_NOT_FOUND>>"%~dp0R47_TOPIC01_OLLAMA_DIAG_RESULT.txt"
echo Node.js not found.
pause
exit /b 1
