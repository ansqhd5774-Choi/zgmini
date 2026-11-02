@echo off
rem Explicit annual R43 manual publish only; never called by Core or a Task.
rem Output remains beside this CMD. Existing evidence is never overwritten.
setlocal EnableExtensions DisableDelayedExpansion
set "ZGM_R43_ROOT=%~dp0"
set "ZGM_R43_REPO_ROOT=%~dp0."
set "ZGM_R43_RESULT=%ZGM_R43_ROOT%R43_MANUAL_PUBLISH_RESULT.txt"
if exist "%ZGM_R43_RESULT%" (
  echo R43_RESULT_ALREADY_EXISTS: "%ZGM_R43_RESULT%"
  echo Preserve the old result before a new annual attempt.
  exit /b 2
)
set "ZGM_R43_PC_HOME=E:\ZGmini\data\pc-writer"
if defined ZGMINI_PC_HOME set "ZGM_R43_PC_HOME=%ZGMINI_PC_HOME%"
rem Optional: identify the existing approved PC checkout, separate from this R43 helper.
rem The Node runner still requires its git HEAD to equal PC config.source.
if defined ZGMINI_R43_APPROVED_REPO_ROOT set "ZGM_R43_REPO_ROOT=%ZGMINI_R43_APPROVED_REPO_ROOT%"
if "%ZGM_R43_REPO_ROOT:~-1%"=="\" set "ZGM_R43_REPO_ROOT=%ZGM_R43_REPO_ROOT%."
rem Trailing backslash in argv quotes can affect Node on Windows.
if "%ZGM_R43_PC_HOME:~-1%"=="\" set "ZGM_R43_PC_HOME=%ZGM_R43_PC_HOME%."
if not exist "%ZGM_R43_ROOT%scripts\resolve-local-node.cmd" goto missing_resolver
if not exist "%ZGM_R43_ROOT%tools\market-calendar-r43\R43_MANUAL_RUN.mjs" goto missing_runner
call "%ZGM_R43_ROOT%scripts\resolve-local-node.cmd" > "%ZGM_R43_RESULT%" 2>&1
if errorlevel 1 goto node_unavailable
rem Local-only preflight must pass before any D1 network activity.
"%NODE%" "%ZGM_R43_ROOT%tools\market-calendar-r43\R43_MANUAL_RUN.mjs" --preflight --pc-home "%ZGM_R43_PC_HOME%" --repo-root "%ZGM_R43_REPO_ROOT%" >> "%ZGM_R43_RESULT%" 2>&1
if errorlevel 1 goto preflight_failed
findstr /c:"R43_LOCAL_PREFLIGHT_READY_NOT_PUBLISHED" "%ZGM_R43_RESULT%" >nul
if errorlevel 1 goto preflight_failed
echo R43_PREFLIGHT_PASS. Public D1 output is NOT yet changed.
echo Publish R43 derived top 5 percent once to D1 and verify read-back?
choice /C YN /M "Explicitly approve R43 annual D1 publish"
if errorlevel 2 goto cancelled
if errorlevel 1 goto publish
goto cancelled
:publish
"%NODE%" "%ZGM_R43_ROOT%tools\market-calendar-r43\R43_MANUAL_RUN.mjs" --publish --confirm-r43-once --pc-home "%ZGM_R43_PC_HOME%" --repo-root "%ZGM_R43_REPO_ROOT%" >> "%ZGM_R43_RESULT%" 2>&1
set "ZGM_R43_EXIT=%ERRORLEVEL%"
echo R43_PUBLISH_EXIT_CODE=%ZGM_R43_EXIT% >> "%ZGM_R43_RESULT%"
echo R43_RESULT_FILE: "%ZGM_R43_RESULT%"
exit /b %ZGM_R43_EXIT%
:missing_resolver
echo R43_PUBLISH_STOP: R43_NODE_RESOLVER_MISSING > "%ZGM_R43_RESULT%"
goto failure
:missing_runner
echo R43_PUBLISH_STOP: R43_MANUAL_RUNNER_MISSING > "%ZGM_R43_RESULT%"
goto failure
:node_unavailable
echo R43_PUBLISH_STOP: R43_NODE_UNAVAILABLE >> "%ZGM_R43_RESULT%"
goto failure
:preflight_failed
echo R43_PUBLISH_STOP: R43_PREFLIGHT_NOT_READY >> "%ZGM_R43_RESULT%"
goto failure
:cancelled
echo R43_PUBLISH_STOP: USER_DID_NOT_CONFIRM >> "%ZGM_R43_RESULT%"
:failure
echo R43_PUBLISH_EXIT_CODE=2 >> "%ZGM_R43_RESULT%"
echo R43_RESULT_FILE: "%ZGM_R43_RESULT%"
exit /b 2
