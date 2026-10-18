@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "NODE=E:\ZGmini\runtime\node.exe"
set "DB=E:\ZGmini\data\iran-progress-r13\iran.sqlite"
set "LOG=%TEMP%\ZGMINI_IRAN_R4_SEVEN_DAY_SHADOW.txt"
set "MODE=%~1"
if "%MODE%"=="" set "MODE=--preflight"
if not "%MODE%"=="--preflight" if not "%MODE%"=="--sample" if not "%MODE%"=="--report" if not "%MODE%"=="--compare" (
  >"%LOG%" echo INVALID_SHADOW_MODE
  goto :fail
)
if not exist "%NODE%" (
  >"%LOG%" echo AUTOMATION_BLOCKED: NODE_NOT_FOUND
  goto :fail
)
if not exist "%~dp0seven-day-trial-r4.mjs" (
  >"%LOG%" echo AUTOMATION_BLOCKED: SHADOW_SCRIPT_NOT_FOUND
  goto :fail
)
if not "%MODE%"=="--report" if not "%MODE%"=="--compare" if not exist "%DB%" (
  >"%LOG%" echo AUTOMATION_BLOCKED: SQLITE_SOURCE_NOT_FOUND
  goto :fail
)
"%NODE%" "%~dp0seven-day-trial-r4.mjs" "%MODE%" >"%LOG%" 2>&1
set "STATUS=%ERRORLEVEL%"
type "%LOG%"
echo.
echo RESULT_LOG=%LOG%
exit /b %STATUS%
:fail
type "%LOG%"
echo.
echo RESULT_LOG=%LOG%
exit /b 2
