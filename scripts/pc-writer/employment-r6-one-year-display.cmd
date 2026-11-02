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

if "%~1"=="" (
  if not "%~2"=="" goto usage
  goto stage
)
if /i "%~1"=="STAGE" goto stage
if /i "%~1"=="PUBLISH" goto publish
:usage
echo [BLOCKED] Usage: employment-r6-one-year-display.cmd [STAGE [absolute-candidate-file]^|PUBLISH]
exit /b 2

:stage
echo [R6] STAGE: no PC source DB or remote D1 writes.
if not "%~3"=="" goto usage
if defined EMP_R6_EXTERNAL_CANDIDATE (
  if not "%~2"=="" goto usage
  rem The package runner can pass the drag-dropped path through environment.
  rem This avoids a second CALL expansion of special characters in the path.
  "%NODE%" "%~dp0employment-r6-one-year-stage.mjs" --db "%EMP_R6_CORE%" --candidate-db-external "%EMP_R6_EXTERNAL_CANDIDATE%" --output-dir "%~dp0."
  exit /b %errorlevel%
)
if not "%~2"=="" (
  rem Explicit isolated research candidate from an earlier CMD run.
  rem The Node stage validates its file identity and opens it read-only.
  "%NODE%" "%~dp0employment-r6-one-year-stage.mjs" --db "%EMP_R6_CORE%" --candidate-db-external "%~2" --output-dir "%~dp0."
  exit /b %errorlevel%
)
if exist "%~dp0EMPLOYMENT_R6_CANDIDATE.sqlite" (
  "%NODE%" "%~dp0employment-r6-one-year-stage.mjs" --db "%EMP_R6_CORE%" --candidate-db "%~dp0EMPLOYMENT_R6_CANDIDATE.sqlite" --output-dir "%~dp0."
  exit /b %errorlevel%
)
"%NODE%" "%~dp0employment-r6-one-year-stage.mjs" --db "%EMP_R6_CORE%" --output-dir "%~dp0." --discover-approved-candidate
exit /b %errorlevel%

:publish
if defined EMP_R6_EXTERNAL_CANDIDATE (
  echo [BLOCKED] CANDIDATE_PUBLICATION_NOT_APPROVED
  exit /b 2
)
if not "%~2"=="" (
  echo [BLOCKED] CANDIDATE_PUBLICATION_NOT_APPROVED
  exit /b 2
)
echo [R6] PUBLISH: only the approved PC public display output is sent to D1.
if exist "%~dp0EMPLOYMENT_R6_CANDIDATE.sqlite" (
  echo [BLOCKED] CANDIDATE_PUBLICATION_NOT_APPROVED: isolated research DB requires separate lineage approval.
  exit /b 2
)
"%NODE%" "%~dp0employment-r6-one-year-stage.mjs" --db "%EMP_R6_CORE%" --output-dir "%~dp0." --publish
exit /b %errorlevel%
