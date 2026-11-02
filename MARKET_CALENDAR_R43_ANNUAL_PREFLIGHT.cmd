@echo off
rem R43 annual manual preflight only: no providers, D1 writes, Core or Task changes.
rem Launch from the approved repository checkout; results stay beside this CMD.
setlocal EnableExtensions DisableDelayedExpansion
set "ZGM_R43_ROOT=%~dp0"
rem Append a dot to avoid a trailing backslash escaping the final quote in Node argv.
set "ZGM_R43_REPO_ROOT=%~dp0."
set "ZGM_R43_RESULT=%ZGM_R43_ROOT%R43_MANUAL_PREFLIGHT_RESULT.txt"
if exist "%ZGM_R43_RESULT%" (
  echo R43_RESULT_ALREADY_EXISTS: "%ZGM_R43_RESULT%"
  echo Preserve the old evidence before running again.
  exit /b 2
)
set "ZGM_R43_PC_HOME=E:\ZGmini\data\pc-writer"
if defined ZGMINI_PC_HOME set "ZGM_R43_PC_HOME=%ZGMINI_PC_HOME%"
if not exist "%ZGM_R43_ROOT%scripts\resolve-local-node.cmd" goto missing_resolver
if not exist "%ZGM_R43_ROOT%tools\market-calendar-r43\R43_MANUAL_RUN.mjs" goto missing_runner
call "%ZGM_R43_ROOT%scripts\resolve-local-node.cmd" > "%ZGM_R43_RESULT%" 2>&1
if errorlevel 1 goto node_unavailable
"%NODE%" "%ZGM_R43_ROOT%tools\market-calendar-r43\R43_MANUAL_RUN.mjs" --preflight --pc-home "%ZGM_R43_PC_HOME%" --repo-root "%ZGM_R43_REPO_ROOT%" >> "%ZGM_R43_RESULT%" 2>&1
set "ZGM_R43_EXIT=%ERRORLEVEL%"
echo R43_PREFLIGHT_EXIT_CODE=%ZGM_R43_EXIT% >> "%ZGM_R43_RESULT%"
echo R43_RESULT_FILE: "%ZGM_R43_RESULT%"
exit /b %ZGM_R43_EXIT%
:missing_resolver
echo R43_PREFLIGHT_STOP: R43_NODE_RESOLVER_MISSING > "%ZGM_R43_RESULT%"
goto failure
:missing_runner
echo R43_PREFLIGHT_STOP: R43_MANUAL_RUNNER_MISSING > "%ZGM_R43_RESULT%"
goto failure
:node_unavailable
echo R43_PREFLIGHT_STOP: R43_NODE_UNAVAILABLE >> "%ZGM_R43_RESULT%"
:failure
echo R43_PREFLIGHT_EXIT_CODE=2 >> "%ZGM_R43_RESULT%"
echo R43_RESULT_FILE: "%ZGM_R43_RESULT%"
exit /b 2
