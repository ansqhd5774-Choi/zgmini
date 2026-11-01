@echo off
setlocal EnableExtensions

set "ROOT=%~dp0"
set "RUNNER=%ROOT%scripts\pc-writer\earnings-r5-forward-r2-local-audit.mjs"
if defined ZGMINI_PC_HOME (
  set "BASE=%ZGMINI_PC_HOME%"
) else (
  set "BASE=%USERPROFILE%\.zgmini\pc-writer"
)
set "CFO_FILE=%BASE%\manual-input\e1-r5\cfo-survey-r1\releases.json"
set "REPORT=%BASE%\manual-input\e1-r5\reports\e1-r5-forward-r2-local-audit-last.txt"

if not exist "%RUNNER%" (
  echo [BLOCKED] earnings-r5-forward-r2-local-audit.mjs not found.
  exit /b 2
)

call "%~dp0scripts\resolve-local-node.cmd"
if errorlevel 1 exit /b 2

set "AS_OF_ARG="
if not "%~1"=="" set "AS_OF_ARG=--as-of=%~1"

echo.
echo [RUN] E1-R5 Forward R2 local read-only audit
if exist "%CFO_FILE%" (
  echo [INPUT] SEC R17 corpus + CFO Survey PIT releases
  "%NODE%" "%RUNNER%" "--base=%BASE%" "--cfo-file=%CFO_FILE%" %AS_OF_ARG%
) else (
  echo [INPUT] SEC R17 corpus only. CFO Survey PIT releases not found.
  "%NODE%" "%RUNNER%" "--base=%BASE%" %AS_OF_ARG%
)
set "RC=%ERRORLEVEL%"

echo [EXIT] %RC%
if exist "%REPORT%" (
  echo.
  echo ==================== AUDIT REPORT ====================
  type "%REPORT%"
  echo ======================================================
) else (
  echo [BLOCKED] Audit report was not created.
)

exit /b %RC%
