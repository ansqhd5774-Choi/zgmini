@echo off
setlocal EnableExtensions

set "ROOT=%~dp0"
set "RUNNER=%ROOT%scripts\pc-writer\quota-runner.mjs"
set "NO_PAUSE="
if /I "%~2"=="nopause" set "NO_PAUSE=1"

if not exist "%RUNNER%" (
  echo [BLOCKED] quota-runner.mjs not found.
  exit /b 2
)

if exist "%ProgramFiles%\nodejs\node.exe" (
  set "NODE=%ProgramFiles%\nodejs\node.exe"
) else if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" (
  set "NODE=%LOCALAPPDATA%\Programs\nodejs\node.exe"
) else (
  echo [BLOCKED] Supported Node.js was not found.
  echo Install or use the project Node.js runtime, then run this file again.
  exit /b 2
)

if /I "%~1"=="plan" goto plan
if /I "%~1"=="observe" goto observe
if /I "%~1"=="enforce" goto enforce
if /I "%~1"=="publish" goto publish
if /I "%~1"=="korea" goto korea
if /I "%~1"=="korea-publish" goto korea_publish
if not "%~1"=="" goto usage

echo.
echo ZGMINI quota-aware runner
echo 1. Show quota policy
echo 2. Observe core collection and local storage
echo 3. Enforce confirmed provider limits
echo 4. Observe core and publish public result
echo 5. Observe Korea collection
echo 6. Observe Korea and publish public result
echo.
choice /c 123456 /n /m "Select: "
if errorlevel 6 goto korea_publish
if errorlevel 5 goto korea
if errorlevel 4 goto publish
if errorlevel 3 goto enforce
if errorlevel 2 goto observe
if errorlevel 1 goto plan
goto :eof

:plan
call :run --plan
goto :eof

:observe
call :run
goto :eof

:enforce
call :run --enforce-quota
goto :eof

:publish
call :run --publish
goto :eof

:korea
call :run --korea
goto :eof

:korea_publish
call :run --korea --publish
goto :eof

:run
echo.
echo [RUN] %*
"%NODE%" "%RUNNER%" %*
set "RC=%ERRORLEVEL%"
echo [EXIT] %RC%
if not defined NO_PAUSE pause
exit /b %RC%

:usage
echo Usage:
echo   ZGMINI_QUOTA_RUNNER.cmd plan
echo   ZGMINI_QUOTA_RUNNER.cmd observe
echo   ZGMINI_QUOTA_RUNNER.cmd enforce
echo   ZGMINI_QUOTA_RUNNER.cmd publish
echo   ZGMINI_QUOTA_RUNNER.cmd korea
echo   ZGMINI_QUOTA_RUNNER.cmd korea-publish
exit /b 2
