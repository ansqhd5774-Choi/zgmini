@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "NODE_EXE=E:\ZGmini\runtime\node.exe"
set "SCRIPT_NAME=EARNINGS_BEA_UNIT_PROFIT_R1_ONCE.mjs"
set "OUTPUT_DIR=%USERPROFILE%\Desktop"
if not exist "%OUTPUT_DIR%\" if exist "%USERPROFILE%\OneDrive\Desktop\" set "OUTPUT_DIR=%USERPROFILE%\OneDrive\Desktop"
if not exist "%OUTPUT_DIR%\" set "OUTPUT_DIR=%~dp0"
set "LOG=%OUTPUT_DIR%\EARNINGS_BEA_UNIT_PROFIT_R1_DIAG_RESULT_%RANDOM%_%RANDOM%.txt"
> "%LOG%" echo EARNINGS_BEA_UNIT_PROFIT_R1_PREFLIGHT_DIAG
if errorlevel 1 goto :temp_log
goto :log_ready

:temp_log
set "LOG=%TEMP%\EARNINGS_BEA_UNIT_PROFIT_R1_DIAG_RESULT_%RANDOM%_%RANDOM%.txt"
> "%LOG%" echo EARNINGS_BEA_UNIT_PROFIT_R1_PREFLIGHT_DIAG

:log_ready
if not exist "%LOG%" (
  echo ERROR=DIAGNOSTIC_LOG_PATH_UNWRITABLE
  pause
  exit /b 1
)
>> "%LOG%" echo MODE=READ_ONLY_PREFLIGHT
>> "%LOG%" echo LAUNCHER=%~f0
>> "%LOG%" echo NODE_RUNTIME=%NODE_EXE%

if not exist "%NODE_EXE%" (
  >> "%LOG%" echo ERROR=APPROVED_NODE_RUNTIME_MISSING
  goto :failed
)

set "RUNNER="
if defined ZGMINI_EARNINGS_REPO_ROOT call :consider "%ZGMINI_EARNINGS_REPO_ROOT%\scripts\pc-writer\%SCRIPT_NAME%"
call :consider "%~dp0%SCRIPT_NAME%"
call :consider "%~dp0scripts\pc-writer\%SCRIPT_NAME%"
call :consider "%~dp0..\..\scripts\pc-writer\%SCRIPT_NAME%"
if not defined RUNNER if exist "E:\ZGmini\projects\" (
  for /d %%D in ("E:\ZGmini\projects\*") do call :consider "%%~fD\scripts\pc-writer\%SCRIPT_NAME%"
)
if not defined RUNNER (
  >> "%LOG%" echo LOCAL_RUNNER=NOT_FOUND
  >> "%LOG%" echo ACTION=FETCH_PINNED_SOURCE_IN_TEMP_FOR_READ_ONLY_PREFLIGHT
  call :prepare_portable
)
if not defined RUNNER goto :failed

>> "%LOG%" echo RUNNER=%RUNNER%
>> "%LOG%" echo STAGE=BEGIN_SOURCE_PREFLIGHT
"%NODE_EXE%" "%RUNNER%" --dry-run >> "%LOG%" 2>&1
set "RUNNER_RC=%ERRORLEVEL%"
>> "%LOG%" echo RUNNER_EXIT_CODE=%RUNNER_RC%
if not "%RUNNER_RC%"=="0" goto :failed
>> "%LOG%" echo WRAPPER_RESULT=PASS_PREFLIGHT
goto :finish

:consider
if not defined RUNNER if exist "%~1" set "RUNNER=%~1"
exit /b 0

:prepare_portable
if not defined TEMP (
  >> "%LOG%" echo ERROR=TEMP_DIRECTORY_UNDEFINED
  exit /b 1
)
if not exist "%TEMP%\" (
  >> "%LOG%" echo ERROR=TEMP_DIRECTORY_UNAVAILABLE
  exit /b 1
)
set "PIN_SHA=11fbe02473fa11c530a008344d622c52763270a8"
set "TEMP_ROOT=%TEMP%\ZGMINI_BEA_UNIT_PREFLIGHT_%RANDOM%_%RANDOM%"
>> "%LOG%" echo GITHUB_PINNED_COMMIT=%PIN_SHA%
mkdir "%TEMP_ROOT%\scripts\pc-writer" >> "%LOG%" 2>&1
if errorlevel 1 goto :portable_failed
mkdir "%TEMP_ROOT%\lib\market-score" >> "%LOG%" 2>&1
if errorlevel 1 goto :portable_failed
mkdir "%TEMP_ROOT%\worker" >> "%LOG%" 2>&1
if errorlevel 1 goto :portable_failed
call :fetch_source "scripts/pc-writer/EARNINGS_BEA_UNIT_PROFIT_R1_ONCE.mjs" "%TEMP_ROOT%\scripts\pc-writer\EARNINGS_BEA_UNIT_PROFIT_R1_ONCE.mjs"
if errorlevel 1 goto :portable_failed
call :fetch_source "scripts/pc-writer/EARNINGS_R4_C_D1_DUAL_SOURCE_GATES.mjs" "%TEMP_ROOT%\scripts\pc-writer\EARNINGS_R4_C_D1_DUAL_SOURCE_GATES.mjs"
if errorlevel 1 goto :portable_failed
call :fetch_source "lib/market-score/earnings-bea-unit-profit-source-r1.mjs" "%TEMP_ROOT%\lib\market-score\earnings-bea-unit-profit-source-r1.mjs"
if errorlevel 1 goto :portable_failed
call :fetch_source "worker/earnings-bea-unit-profit-r1.mjs" "%TEMP_ROOT%\worker\earnings-bea-unit-profit-r1.mjs"
if errorlevel 1 goto :portable_failed
set "RUNNER=%TEMP_ROOT%\scripts\pc-writer\EARNINGS_BEA_UNIT_PROFIT_R1_ONCE.mjs"
>> "%LOG%" echo PINNED_SOURCE_DOWNLOAD=PASS
exit /b 0

:fetch_source
curl.exe --fail --location --silent --show-error --max-time 35 "https://raw.githubusercontent.com/ansqhd5774-Choi/zgmini/%PIN_SHA%/%~1" --output "%~2" >> "%LOG%" 2>&1
if errorlevel 1 exit /b 1
if not exist "%~2" exit /b 1
exit /b 0

:portable_failed
>> "%LOG%" echo ERROR=PINNED_SOURCE_DOWNLOAD_FAILED
exit /b 1

:failed
>> "%LOG%" echo WRAPPER_RESULT=FAILED
set "RUNNER_RC=1"

:finish
if defined TEMP_ROOT if exist "%TEMP_ROOT%\" rmdir /s /q "%TEMP_ROOT%" >> "%LOG%" 2>&1
echo.
echo LOG=%LOG%
type "%LOG%"
echo.
echo Please send the DIAG_RESULT log file to the assistant.
pause
exit /b %RUNNER_RC%
