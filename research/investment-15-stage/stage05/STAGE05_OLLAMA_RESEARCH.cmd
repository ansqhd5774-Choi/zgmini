@echo off
setlocal
set "SCRIPT_DIR=%~dp0"
if "%~1"=="" goto :usage
if "%~2"=="" goto :usage
where node >nul 2>nul
if errorlevel 1 (
  echo STAGE05_BLOCKED: node executable not found.
  exit /b 2
)
node "%SCRIPT_DIR%stage05-ollama-research-cli.mjs" --input "%~1" --model "%~2"
exit /b %ERRORLEVEL%
:usage
echo Usage: STAGE05_OLLAMA_RESEARCH.cmd STAGE05_HANDOFF.json OLLAMA_MODEL
echo Only launches Stage05 research on explicitly supplied completed scoring results.
exit /b 2
