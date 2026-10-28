@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "NODE_EXE=E:\ZGmini\runtime\node.exe"
if defined ZGMINI_NODE_EXE set "NODE_EXE=%ZGMINI_NODE_EXE%"
set "PC_ROOT=E:\ZGmini\data\pc-writer"
if defined ZGMINI_PC_HOME set "PC_ROOT=%ZGMINI_PC_HOME%"
set "RUNNER=%~dp0scripts\pc-writer\EARNINGS_BEA_MFG_PROFIT_R4_COMPRESSED_STORE_READONLY.mjs"
set "REPORT_DIR=%USERPROFILE%\Desktop"
if not exist "%REPORT_DIR%\" if exist "%USERPROFILE%\OneDrive\Desktop\" set "REPORT_DIR=%USERPROFILE%\OneDrive\Desktop"
if not exist "%REPORT_DIR%\" set "REPORT_DIR=%~dp0"
set "REPORT=%REPORT_DIR%\BEA_MFG_COMPRESSED_READONLY_%RANDOM%_%RANDOM%.txt"
> "%REPORT%" echo BEA_MFG_COMPRESSED_READONLY
>> "%REPORT%" echo MODE=READ_ONLY
>> "%REPORT%" echo PC_ROOT=%PC_ROOT%
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
"%NODE_EXE%" "%RUNNER%" --root "%PC_ROOT%" >> "%REPORT%" 2>&1
set "RUNNER_RC=%ERRORLEVEL%"
>> "%REPORT%" echo RUNNER_EXIT_CODE=%RUNNER_RC%
if not "%RUNNER_RC%"=="0" goto :failed
>> "%REPORT%" echo WRAPPER_RESULT=COMPLETED_READ_ONLY
goto :finish

:failed
>> "%REPORT%" echo WRAPPER_RESULT=FAILED_NO_DATA_MODIFICATION
set "RUNNER_RC=1"

:finish
echo.
echo REPORT=%REPORT%
type "%REPORT%"
echo.
echo Please upload the REPORT TXT in the chat.
pause
exit /b %RUNNER_RC%
