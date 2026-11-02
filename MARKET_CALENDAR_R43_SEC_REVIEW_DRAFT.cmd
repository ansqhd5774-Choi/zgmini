@echo off
rem One-time annual SEC issuer CANDIDATE draft only; never an approved R43 roster.
rem No provider download, D1 write, Core execution or scheduled task changes.
setlocal EnableExtensions DisableDelayedExpansion
set "ZGM_R43_ROOT=%~dp0"
set "ZGM_R43_RESULT=%ZGM_R43_ROOT%R43_SEC_REVIEW_DRAFT_RESULT.txt"
if exist "%ZGM_R43_RESULT%" (
  echo R43_RESULT_ALREADY_EXISTS: "%ZGM_R43_RESULT%"
  echo Preserve old evidence before another attempt.
  exit /b 2
)
set "ZGM_R43_PC_HOME=E:\ZGmini\data\pc-writer"
if defined ZGMINI_PC_HOME set "ZGM_R43_PC_HOME=%ZGMINI_PC_HOME%"
if "%ZGM_R43_PC_HOME:~-1%"=="\" set "ZGM_R43_PC_HOME=%ZGM_R43_PC_HOME%."
if not exist "%ZGM_R43_ROOT%scripts\resolve-local-node.cmd" goto missing_resolver
if not exist "%ZGM_R43_ROOT%tools\market-calendar-r43\R43_SEC_ROSTER_CANDIDATES.mjs" goto missing_runner
call "%ZGM_R43_ROOT%scripts\resolve-local-node.cmd" > "%ZGM_R43_RESULT%" 2>&1
if errorlevel 1 goto node_unavailable
echo The SEC company_tickers_exchange.json file must ALREADY be stored privately.
echo Candidate rows stay PENDING and are NOT approved for R43 public grades.
"%NODE%" "%ZGM_R43_ROOT%tools\market-calendar-r43\R43_SEC_ROSTER_CANDIDATES.mjs" --preflight --pc-home "%ZGM_R43_PC_HOME%" >> "%ZGM_R43_RESULT%" 2>&1
if errorlevel 1 goto preflight_failed
findstr /c:"R43_SEC_REVIEW_DRAFT_PREFLIGHT_READY_NOT_WRITTEN" "%ZGM_R43_RESULT%" >nul
if errorlevel 1 goto preflight_failed
echo R43_SEC_DRAFT_PREFLIGHT_PASS. No file has been written.
echo Create one PRIVATE review draft? This is NOT an approved issuer roster.
choice /C YN /M "Approve annual SEC CANDIDATE draft creation"
if errorlevel 2 goto cancelled
if errorlevel 1 goto write_draft
goto cancelled
:write_draft
"%NODE%" "%ZGM_R43_ROOT%tools\market-calendar-r43\R43_SEC_ROSTER_CANDIDATES.mjs" --write-review-draft --confirm-r43-sec-draft --pc-home "%ZGM_R43_PC_HOME%" >> "%ZGM_R43_RESULT%" 2>&1
set "ZGM_R43_EXIT=%ERRORLEVEL%"
echo R43_SEC_DRAFT_EXIT_CODE=%ZGM_R43_EXIT% >> "%ZGM_R43_RESULT%"
echo R43_RESULT_FILE: "%ZGM_R43_RESULT%"
exit /b %ZGM_R43_EXIT%
:missing_resolver
echo R43_SEC_DRAFT_STOP: R43_NODE_RESOLVER_MISSING > "%ZGM_R43_RESULT%"
goto failure
:missing_runner
echo R43_SEC_DRAFT_STOP: R43_DRAFT_RUNNER_MISSING > "%ZGM_R43_RESULT%"
goto failure
:node_unavailable
echo R43_SEC_DRAFT_STOP: R43_NODE_UNAVAILABLE >> "%ZGM_R43_RESULT%"
goto failure
:preflight_failed
echo R43_SEC_DRAFT_STOP: R43_PREFLIGHT_NOT_READY >> "%ZGM_R43_RESULT%"
goto failure
:cancelled
echo R43_SEC_DRAFT_STOP: USER_DID_NOT_CONFIRM >> "%ZGM_R43_RESULT%"
:failure
echo R43_SEC_DRAFT_EXIT_CODE=2 >> "%ZGM_R43_RESULT%"
echo R43_RESULT_FILE: "%ZGM_R43_RESULT%"
exit /b 2
