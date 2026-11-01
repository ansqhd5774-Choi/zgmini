@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "ROOT=%~dp0..\.."
set "NODE=E:\ZGmini\runtime\node.exe"
set "DB=E:\ZGmini\data\iran-progress-r13\iran.sqlite"
set "LOG=%TEMP%\ZGMINI_IRAN_R4_READONLY_AUDIT.txt"
if not exist "%NODE%" (
  >"%LOG%" echo AUTOMATION_BLOCKED: NODE_RUNTIME_NOT_FOUND
  goto :show_failure
)
if not exist "%DB%" (
  >"%LOG%" echo AUTOMATION_BLOCKED: APPROVED_SQLITE_NOT_FOUND
  goto :show_failure
)
if not exist "%~dp0reality-audit-r4.mjs" (
  >"%LOG%" echo AUTOMATION_BLOCKED: R4_AUDIT_SCRIPT_NOT_FOUND
  goto :show_failure
)
set "ZGMINI_IRAN_DB=%DB%"
pushd "%ROOT%"
if errorlevel 1 (
  >"%LOG%" echo AUTOMATION_BLOCKED: REPO_WORKTREE_UNAVAILABLE
  goto :show_failure
)
"%NODE%" "%~dp0reality-audit-r4.mjs" >"%LOG%" 2>&1
set "EXITCODE=%ERRORLEVEL%"
popd
type "%LOG%"
echo.
echo AUDIT_LOG=%LOG%
exit /b %EXITCODE%
:show_failure
type "%LOG%"
echo.
echo AUDIT_LOG=%LOG%
exit /b 2
