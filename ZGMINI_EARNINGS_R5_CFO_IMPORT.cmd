@echo off
setlocal EnableExtensions

set "ROOT=%~dp0"
set "IMPORTER=%ROOT%scripts\pc-writer\earnings-r5-cfo-survey-local-import.mjs"
set "AUDIT=%ROOT%ZGMINI_EARNINGS_R5_FORWARD_AUDIT.cmd"
if defined ZGMINI_PC_HOME (
  set "BASE=%ZGMINI_PC_HOME%"
) else (
  set "BASE=%USERPROFILE%\.zgmini\pc-writer"
)
set "OUTPUT=%BASE%\manual-input\e1-r5\cfo-survey-r1\releases.json"

if "%~1"=="" goto :usage
if "%~2"=="" goto :usage
if "%~3"=="" goto :usage
if "%~4"=="" goto :usage
if "%~5"=="" goto :usage

set "SOURCE_FILE=%~f1"
set "SOURCE_URL=%~2"
set "SURVEY_YEAR=%~3"
set "SURVEY_QUARTER=%~4"
set "RELEASE_AT=%~5"
set "REVISION_ARG="
if not "%~6"=="" set "REVISION_ARG=--revision-id=%~6"

if not exist "%IMPORTER%" (
  echo [BLOCKED] earnings-r5-cfo-survey-local-import.mjs not found.
  exit /b 2
)
if not exist "%SOURCE_FILE%" (
  echo [BLOCKED] CFO Survey source HTML file not found.
  exit /b 2
)

if exist "%ProgramFiles%\nodejs\node.exe" (
  set "NODE=%ProgramFiles%\nodejs\node.exe"
) else if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" (
  set "NODE=%LOCALAPPDATA%\Programs\nodejs\node.exe"
) else (
  echo [BLOCKED] Supported Node.js was not found.
  exit /b 2
)

echo.
echo [RUN] E1-R5 CFO Survey local PIT import
echo [MODE] LOCAL SOURCE ONLY / NETWORK 0 / DB WRITE 0 / PRODUCTION OFF
"%NODE%" "%IMPORTER%" "--base=%BASE%" "--file=%SOURCE_FILE%" "--source-url=%SOURCE_URL%" "--survey-year=%SURVEY_YEAR%" "--survey-quarter=%SURVEY_QUARTER%" "--release-at=%RELEASE_AT%" %REVISION_ARG%
set "RC=%ERRORLEVEL%"
if not "%RC%"=="0" (
  echo [FAILED] CFO Survey local import exit=%RC%
  exit /b %RC%
)

if not exist "%OUTPUT%" (
  echo [BLOCKED] CFO Survey releases.json was not created.
  exit /b 3
)

echo [PASS] CFO Survey PIT release stored or confirmed NOOP.
echo [OUTPUT] %OUTPUT%

if exist "%AUDIT%" (
  echo.
  echo [RUN] E1-R5 Forward R2 local audit after import
  call "%AUDIT%"
  set "AUDIT_RC=%ERRORLEVEL%"
  if not "%AUDIT_RC%"=="0" (
    echo [AUDIT] Import succeeded, but Forward R2 audit exit=%AUDIT_RC%
    exit /b %AUDIT_RC%
  )
  echo [PASS] CFO import and Forward R2 local audit completed.
) else (
  echo [INFO] Forward R2 audit wrapper not found; import itself completed.
)

exit /b 0

:usage
echo Usage:
echo   %~nx0 ^<source.html^> ^<official-richmondfed-url^> ^<survey-year^> ^<survey-quarter^> ^<release-at-iso^> [revision-id]
echo.
echo Example:
echo   %~nx0 "C:\Temp\cfo-q3-2026.html" "https://www.richmondfed.org/research/national_economy/cfo_survey/data_and_results/2026/20260923_data_and_results" 2026 3 "2026-09-23T11:30:00Z"
echo.
echo The source HTML must already exist locally. This command does not download provider data.
exit /b 2
