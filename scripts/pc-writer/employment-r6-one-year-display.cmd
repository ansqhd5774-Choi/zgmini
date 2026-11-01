@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem R6 display: default STAGE (read only). PUBLISH is explicitly opt-in.
rem Result TXT and JSON are always written beside this CMD after staging.
call "%~dp0..\resolve-local-node.cmd"
if errorlevel 1 (
  >"%~dp0EMPLOYMENT_R6_ONE_YEAR_BLOCKED.txt" echo STATUS: AUTOMATION_BLOCKED
  >>"%~dp0EMPLOYMENT_R6_ONE_YEAR_BLOCKED.txt" echo ERROR: NODE_24_UNAVAILABLE
  echo [BLOCKED] RESULT_TXT: "%~dp0EMPLOYMENT_R6_ONE_YEAR_BLOCKED.txt"
  exit /b 2
)

if defined ZGMINI_PC_HOME (
  set "EMP_R6_CORE=%ZGMINI_PC_HOME%\storage\core.sqlite"
) else (
  set "EMP_R6_CORE=%USERPROFILE%\.zgmini\pc-writer\storage\core.sqlite"
)

if "%~1"=="" goto stage
if /i "%~1"=="STAGE" goto stage
if /i "%~1"=="PUBLISH" goto publish
echo [BLOCKED] Usage: employment-r6-one-year-display.cmd [STAGE^|PUBLISH]
exit /b 2

:stage
echo [R6] STAGE: no PC source DB or remote D1 writes.
"%NODE%" "%~dp0employment-r6-one-year-stage.mjs" --db "%EMP_R6_CORE%" --output-dir "%~dp0."
exit /b %errorlevel%

:publish
echo [R6] PUBLISH: only the approved PC public display output is sent to D1.
"%NODE%" "%~dp0employment-r6-one-year-stage.mjs" --db "%EMP_R6_CORE%" --output-dir "%~dp0." --publish
exit /b %errorlevel%
