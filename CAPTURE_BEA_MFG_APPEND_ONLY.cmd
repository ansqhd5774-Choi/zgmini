@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "NODE_EXE=E:\ZGmini\runtime\node.exe"
if defined ZGMINI_NODE_EXE set "NODE_EXE=%ZGMINI_NODE_EXE%"
set "PC_ROOT=E:\ZGmini\data\pc-writer"
if defined ZGMINI_PC_HOME set "PC_ROOT=%ZGMINI_PC_HOME%"
set "RUNNER=%~dp0scripts\pc-writer\EARNINGS_BEA_MFG_PROFIT_R5_APPEND_ONLY_CAPTURE.mjs"
set "REPORT_DIR=%USERPROFILE%\Desktop"
if not exist "%REPORT_DIR%\" if exist "%USERPROFILE%\OneDrive\Desktop\" set "REPORT_DIR=%USERPROFILE%\OneDrive\Desktop"
if not exist "%REPORT_DIR%\" set "REPORT_DIR=%~dp0"
set "REPORT=%REPORT_DIR%\BEA_MFG_CAPTURE_%RANDOM%_%RANDOM%.txt"
> "%REPORT%" echo BEA_MFG_APPEND_ONLY_CAPTURE_R5
>> "%REPORT%" echo PC_ROOT=%PC_ROOT%
>> "%REPORT%" echo LEGACY_SQLITE_WRITES=DISABLED
>> "%REPORT%" echo D1_WRITES=DISABLED
if not exist "%NODE_EXE%" (
  >> "%REPORT%" echo ERROR=APPROVED_NODE_EXE_MISSING
  goto :failed
)
if not exist "%PC_ROOT%\" (
  >> "%REPORT%" echo ERROR=PC_ROOT_MISSING
  goto :failed
)
if not exist "%RUNNER%" (
  >> "%REPORT%" echo ERROR=PACKAGED_RUNNER_MISSING
  goto :failed
)
echo This will save only new SHA-named FRED CSV and metadata in the PC raw directory.
echo Existing SQLite and other raw sources will not be changed.
choice /C YN /N /M "Proceed with append-only new source archive? [Y/N] "
if errorlevel 2 (
  >> "%REPORT%" echo RESULT=USER_CANCELLED_NO_SOURCE_WRITES
  set "RUNNER_RC=0"
  goto :finish
)
"%NODE_EXE%" "%RUNNER%" --root "%PC_ROOT%" --execute >> "%REPORT%" 2>&1
set "RUNNER_RC=%ERRORLEVEL%"
>> "%REPORT%" echo RUNNER_EXIT_CODE=%RUNNER_RC%
if not "%RUNNER_RC%"=="0" goto :failed
>> "%REPORT%" echo WRAPPER_RESULT=CAPTURE_COMMAND_COMPLETED
goto :finish

:failed
>> "%REPORT%" echo WRAPPER_RESULT=FAILED_CHECK_REPORT_NO_AUTOMATIC_RETRY
set "RUNNER_RC=1"

:finish
echo.
echo REPORT=%REPORT%
type "%REPORT%"
echo.
echo Please upload the REPORT TXT in the chat.
pause
exit /b %RUNNER_RC%
