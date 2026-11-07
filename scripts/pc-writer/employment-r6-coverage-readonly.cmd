@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem PC R6 coverage inventory only. No collection, install, database writes, or publish.
call "%~dp0..\resolve-local-node.cmd"
if errorlevel 1 (
  >"%~dp0EMPLOYMENT_R6_STARTUP_BLOCKED_RESULT.txt" echo STATUS=AUTOMATION_BLOCKED
  >>"%~dp0EMPLOYMENT_R6_STARTUP_BLOCKED_RESULT.txt" echo REASON=NODE_24_UNAVAILABLE
  echo [BLOCKED] See EMPLOYMENT_R6_STARTUP_BLOCKED_RESULT.txt
  exit /b 2
)

if defined ZGMINI_PC_HOME (
  set "EMP_R6_DB=%ZGMINI_PC_HOME%\storage\core.sqlite"
) else (
  rem Documented junction-compatible home; never create it if absent.
  set "EMP_R6_DB=%USERPROFILE%\.zgmini\pc-writer\storage\core.sqlite"
)
if not "%~1"=="" set "EMP_R6_DB=%~1"

if not "%~2"=="" (
  "%NODE%" "%~dp0employment-r6-coverage-readonly.mjs" --db "%EMP_R6_DB%" --as-of "%~2" --output-dir "%~dp0."
) else (
  "%NODE%" "%~dp0employment-r6-coverage-readonly.mjs" --db "%EMP_R6_DB%" --output-dir "%~dp0."
)
exit /b %errorlevel%
