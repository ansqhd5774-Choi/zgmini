@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "NODE=E:\ZGmini\runtime\node.exe"
set "DB=E:\ZGmini\data\iran-progress-r13\iran.sqlite"
set "LOG=%TEMP%\ZGMINI_IRAN_R4_14DAY_READONLY_AUDIT.txt"
if not exist "%NODE%" (
  >"%LOG%" echo AUTOMATION_BLOCKED: APPROVED_NODE_MISSING
  goto :fail
)
if not exist "%DB%" (
  >"%LOG%" echo AUTOMATION_BLOCKED: APPROVED_IRAN_DB_MISSING
  goto :fail
)
if not exist "%~dp0fourteen-day-local-audit-r4.mjs" (
  >"%LOG%" echo AUTOMATION_BLOCKED: AUDIT_SCRIPT_MISSING
  goto :fail
)
"%NODE%" "%~dp0fourteen-day-local-audit-r4.mjs" >"%LOG%" 2>&1
set "STATUS=%ERRORLEVEL%"
type "%LOG%"
echo.
echo LOG=%LOG%
exit /b %STATUS%
:fail
type "%LOG%"
echo.
echo LOG=%LOG%
exit /b 2
