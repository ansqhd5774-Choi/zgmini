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
  >> "%LOG%" echo ERROR=APPROVED_PC_RUNNER_NOT_FOUND
  >> "%LOG%" echo HINT=UPDATE_APPROVED_LOCAL_SOURCE_OR_SET_ZGMINI_EARNINGS_REPO_ROOT
  goto :failed
)

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

:failed
>> "%LOG%" echo WRAPPER_RESULT=FAILED
set "RUNNER_RC=1"

:finish
echo.
echo LOG=%LOG%
type "%LOG%"
echo.
echo Please send the DIAG_RESULT log file to the assistant.
pause
exit /b %RUNNER_RC%
