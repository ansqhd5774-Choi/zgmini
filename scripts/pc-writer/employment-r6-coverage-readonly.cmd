@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem PC R6 coverage inventory only. No collection, install, database writes, or publish.
call "%~dp0..\resolve-local-node.cmd"
if errorlevel 1 exit /b 2

if defined ZGMINI_PC_HOME (
  set "EMP_R6_DB=%ZGMINI_PC_HOME%\storage\core.sqlite"
) else (
  rem Documented junction-compatible home; never create it if absent.
  set "EMP_R6_DB=%USERPROFILE%\.zgmini\pc-writer\storage\core.sqlite"
)
if not "%~1"=="" set "EMP_R6_DB=%~1"
if not exist "%EMP_R6_DB%" (
  echo [AUTOMATION_BLOCKED] Existing PC core.sqlite not found. Confirm approved PC home and E: junction. 1>&2
  exit /b 2
)

if not "%~2"=="" (
  "%NODE%" "%~dp0employment-r6-coverage-readonly.mjs" --db "%EMP_R6_DB%" --as-of "%~2"
) else (
  "%NODE%" "%~dp0employment-r6-coverage-readonly.mjs" --db "%EMP_R6_DB%"
)
exit /b %errorlevel%
