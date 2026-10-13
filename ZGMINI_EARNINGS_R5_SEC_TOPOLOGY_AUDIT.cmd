@echo off
setlocal EnableExtensions

set "ROOT=%~dp0"
set "RUNNER=%ROOT%scripts\pc-writer\earnings-r5-sec-corpus-topology-audit.mjs"
if defined ZGMINI_PC_HOME (
  set "BASE=%ZGMINI_PC_HOME%"
) else (
  set "BASE=%USERPROFILE%\.zgmini\pc-writer"
)
set "REPORT=%BASE%\manual-input\e1-r5\reports\e1-r5-sec-corpus-topology-last.txt"

if not exist "%RUNNER%" (
  echo [BLOCKED] earnings-r5-sec-corpus-topology-audit.mjs not found.
  exit /b 2
)

if exist "%ProgramFiles%\nodejs\node.exe" (
  set "NODE=%ProgramFiles%\nodejs\node.exe"
) else if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" (
  set "NODE=%LOCALAPPDATA%\Programs\nodejs\node.exe"
) else (
  echo [BLOCKED] Supported Node.js was not found.
  exit /b 2
)

echo.
echo [RUN] E1-R5 SEC corpus topology audit
echo [MODE] LOCAL READ-ONLY CORPUS / REPORT WRITE ONLY / NETWORK 0 / DB WRITE 0 / PRODUCTION OFF
"%NODE%" "%RUNNER%" "--base=%BASE%"
set "RC=%ERRORLEVEL%"

echo [EXIT] %RC%
if exist "%REPORT%" (
  echo.
  echo ==================== TOPOLOGY REPORT ====================
  type "%REPORT%"
  echo =========================================================
) else (
  echo [BLOCKED] Topology report was not created.
)

exit /b %RC%
