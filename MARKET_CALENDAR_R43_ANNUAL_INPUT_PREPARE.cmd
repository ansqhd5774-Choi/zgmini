@echo off
rem R43 private annual input only. Never contacts a provider or D1; never runs Core.
rem Place at approved repository root. The evidence file stays next to this CMD.
setlocal EnableExtensions DisableDelayedExpansion
set "ZGM_R43_ROOT=%~dp0"
set "ZGM_R43_RESULT=%ZGM_R43_ROOT%R43_ANNUAL_INPUT_PREPARE_RESULT.txt"
if exist "%ZGM_R43_RESULT%" (
  echo R43_RESULT_ALREADY_EXISTS: "%ZGM_R43_RESULT%"
  echo Preserve old evidence before another annual attempt.
  exit /b 2
)
set "ZGM_R43_PC_HOME=E:\ZGmini\data\pc-writer"
if defined ZGMINI_PC_HOME set "ZGM_R43_PC_HOME=%ZGMINI_PC_HOME%"
rem Keep terminal backslashes from escaping a Node argv closing quote.
if "%ZGM_R43_PC_HOME:~-1%"=="\" set "ZGM_R43_PC_HOME=%ZGM_R43_PC_HOME%."
if not exist "%ZGM_R43_ROOT%scripts\resolve-local-node.cmd" goto missing_resolver
if not exist "%ZGM_R43_ROOT%tools\market-calendar-r43\R43_ANNUAL_INPUT_PREPARE.mjs" goto missing_runner
call "%ZGM_R43_ROOT%scripts\resolve-local-node.cmd" > "%ZGM_R43_RESULT%" 2>&1
if errorlevel 1 goto node_unavailable
echo Choose the already-stored ANNUAL source. No new downloads are started.
echo [S] Private stored R45 daily JSON files
echo [P] Manually reviewed local Parquet files and manifest
choice /C SP /M "R43 annual source"
if errorlevel 3 goto cancelled
if errorlevel 2 set "ZGM_R43_SOURCE=manual-parquet"
if errorlevel 1 if not defined ZGM_R43_SOURCE set "ZGM_R43_SOURCE=stored-r45"
if not defined ZGM_R43_SOURCE goto cancelled
echo R43_SOURCE=%ZGM_R43_SOURCE% >> "%ZGM_R43_RESULT%"
"%NODE%" "%ZGM_R43_ROOT%tools\market-calendar-r43\R43_ANNUAL_INPUT_PREPARE.mjs" --preflight --source "%ZGM_R43_SOURCE%" --pc-home "%ZGM_R43_PC_HOME%" >> "%ZGM_R43_RESULT%" 2>&1
if errorlevel 1 goto preflight_failed
findstr /c:"R43_ANNUAL_INPUT_PREFLIGHT_READY_NOT_WRITTEN" "%ZGM_R43_RESULT%" >nul
if errorlevel 1 goto preflight_failed
echo R43_LOCAL_INPUT_READY. No file has been written yet.
echo Create one PC-private input JSON from the approved stored files?
choice /C YN /M "Explicitly approve the annual local input write"
if errorlevel 2 goto cancelled
if errorlevel 1 goto write_input
goto cancelled
:write_input
"%NODE%" "%ZGM_R43_ROOT%tools\market-calendar-r43\R43_ANNUAL_INPUT_PREPARE.mjs" --write-input --confirm-r43-annual-write --source "%ZGM_R43_SOURCE%" --pc-home "%ZGM_R43_PC_HOME%" >> "%ZGM_R43_RESULT%" 2>&1
set "ZGM_R43_EXIT=%ERRORLEVEL%"
echo R43_ANNUAL_INPUT_EXIT_CODE=%ZGM_R43_EXIT% >> "%ZGM_R43_RESULT%"
echo R43_RESULT_FILE: "%ZGM_R43_RESULT%"
exit /b %ZGM_R43_EXIT%
:missing_resolver
echo R43_ANNUAL_INPUT_STOP: R43_NODE_RESOLVER_MISSING > "%ZGM_R43_RESULT%"
goto failure
:missing_runner
echo R43_ANNUAL_INPUT_STOP: R43_INPUT_PREPARER_MISSING > "%ZGM_R43_RESULT%"
goto failure
:node_unavailable
echo R43_ANNUAL_INPUT_STOP: R43_NODE_UNAVAILABLE >> "%ZGM_R43_RESULT%"
goto failure
:preflight_failed
echo R43_ANNUAL_INPUT_STOP: R43_PREFLIGHT_NOT_READY >> "%ZGM_R43_RESULT%"
goto failure
:cancelled
echo R43_ANNUAL_INPUT_STOP: USER_DID_NOT_CONFIRM >> "%ZGM_R43_RESULT%"
:failure
echo R43_ANNUAL_INPUT_EXIT_CODE=2 >> "%ZGM_R43_RESULT%"
echo R43_RESULT_FILE: "%ZGM_R43_RESULT%"
exit /b 2
