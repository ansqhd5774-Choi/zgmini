@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem Stages R6 recent missing source data into a separate candidate DB ONLY.
rem Does not change the approved core.sqlite, scheduled tasks, or D1.
call "%~dp0..\resolve-local-node.cmd"
if errorlevel 1 (
  >"%~dp0EMPLOYMENT_R6_RECENT_STAGE_RESULT.txt" echo STATUS: AUTOMATION_BLOCKED
  >>"%~dp0EMPLOYMENT_R6_RECENT_STAGE_RESULT.txt" echo ERROR: NODE_24_UNAVAILABLE
  echo [BLOCKED] See EMPLOYMENT_R6_RECENT_STAGE_RESULT.txt
  exit /b 2
)

if defined ZGMINI_PC_HOME (
  set "EMP_R6_CORE=%ZGMINI_PC_HOME%\storage\core.sqlite"
) else (
  set "EMP_R6_CORE=%USERPROFILE%\.zgmini\pc-writer\storage\core.sqlite"
)
if not "%~1"=="" set "EMP_R6_CORE=%~1"

"%NODE%" "%~dp0employment-r6-recent-stage.mjs" --db "%EMP_R6_CORE%" --output-dir "%~dp0."
exit /b %errorlevel%
