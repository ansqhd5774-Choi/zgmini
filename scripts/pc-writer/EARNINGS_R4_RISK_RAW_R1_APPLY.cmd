@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "NODE_EXE=E:\ZGmini\runtime\node.exe"
if not defined ZGMINI_PC_HOME set "ZGMINI_PC_HOME=E:\ZGmini\data\pc-writer"
set "LOG_DIR=%USERPROFILE%\Desktop"
if not exist "%LOG_DIR%\" if exist "%USERPROFILE%\OneDrive\Desktop\" set "LOG_DIR=%USERPROFILE%\OneDrive\Desktop"
if not exist "%LOG_DIR%\" set "LOG_DIR=%TEMP%"
set "LOG=%LOG_DIR%\EARNINGS_R4_RAW_R1_RESULT_%RANDOM%_%RANDOM%.txt"
> "%LOG%" echo EARNINGS_R4_RAW_R1_APPROVED_ONE_SHOT
>> "%LOG%" echo PC_SQLITE_WRITES=DISABLED
>> "%LOG%" echo OTHER_D1_KEYS=UNMODIFIED
>> "%LOG%" echo SCORING_WRITES=DISABLED
>> "%LOG%" echo SCHEDULER_CHANGES=DISABLED
if not exist "%NODE_EXE%" (
  >> "%LOG%" echo ERROR=APPROVED_NODE_MISSING
  goto :failed
)
if not exist "%ZGMINI_PC_HOME%\config.json" (
  >> "%LOG%" echo ERROR=APPROVED_PC_CONFIG_MISSING
  goto :failed
)
if not exist "%ZGMINI_PC_HOME%\storage\core.sqlite" (
  >> "%LOG%" echo ERROR=PC_SQLITE_MISSING
  goto :failed
)
where git.exe >nul 2>&1
if errorlevel 1 (
  >> "%LOG%" echo ERROR=GIT_NOT_FOUND
  goto :failed
)
if not defined TEMP (
  >> "%LOG%" echo ERROR=TEMP_NOT_CONFIGURED
  goto :failed
)
set "LOOKUP=%TEMP%\ZGMINI_EARNINGS_R4_RAW_OPROOT_%RANDOM%_%RANDOM%.txt"
if exist "%LOOKUP%" (
  >> "%LOG%" echo ERROR=OPERATIONAL_ROOT_REPORT_ALREADY_EXISTS
  goto :failed
)
if not defined ZGMINI_EARNINGS_C_OPERATIONAL_ROOT (
  >> "%LOG%" echo STAGE=DISCOVER_APPROVED_OPERATIONAL_ROOT
  if not exist "%~dp0BEA_MFG_R6_FIND_OPERATIONAL.mjs" (
    >> "%LOG%" echo ERROR=DISCOVERY_HELPER_MISSING
    goto :failed
  )
  "%NODE_EXE%" "%~dp0BEA_MFG_R6_FIND_OPERATIONAL.mjs" > "%LOOKUP%" 2>> "%LOG%"
  if errorlevel 1 (
    >> "%LOG%" echo ERROR=APPROVED_OPERATIONAL_ROOT_DISCOVERY_FAILED
    goto :failed
  )
  set /p "ZGMINI_EARNINGS_C_OPERATIONAL_ROOT=" < "%LOOKUP%"
)
if not defined ZGMINI_EARNINGS_C_OPERATIONAL_ROOT (
  >> "%LOG%" echo ERROR=APPROVED_OPERATIONAL_ROOT_NOT_FOUND
  goto :failed
)
if not exist "%ZGMINI_EARNINGS_C_OPERATIONAL_ROOT%\" (
  >> "%LOG%" echo ERROR=APPROVED_OPERATIONAL_ROOT_NOT_FOUND
  goto :failed
)
>> "%LOG%" echo OPERATIONAL_ROOT_DISCOVERY=PASS
set "PUBLISHER=%TEMP%\ZGMINI_EARNINGS_R4_RAW_PUBLISHER_%RANDOM%_%RANDOM%"
>> "%LOG%" echo STAGE=CLONE_LATEST_MAIN_AS_ISOLATED_PUBLISHER
git clone --quiet --depth 1 --single-branch --branch main https://github.com/ansqhd5774-Choi/zgmini.git "%PUBLISHER%" >> "%LOG%" 2>&1
if errorlevel 1 (
  >> "%LOG%" echo ERROR=ISOLATED_MAIN_CLONE_FAILED
  goto :failed
)
set "RUNNER=%PUBLISHER%\scripts\pc-writer\EARNINGS_R4_RISK_RAW_R1_D1_ONE_SHOT.mjs"
if not exist "%RUNNER%" (
  >> "%LOG%" echo ERROR=R1_RUNNER_MISSING_FROM_MAIN
  goto :failed
)
for /f "delims=" %%S in ('git -C "%PUBLISHER%" rev-parse HEAD') do set "PUBLISHER_SHA=%%S"
>> "%LOG%" echo PUBLISHER_MAIN_SHA=%PUBLISHER_SHA%
>> "%LOG%" echo STAGE=READ_ONLY_PC_SEC_R4_REPLAY
"%NODE_EXE%" "%RUNNER%" --dry-run >> "%LOG%" 2>&1
set "READ_RC=%ERRORLEVEL%"
>> "%LOG%" echo PREFLIGHT_EXIT_CODE=%READ_RC%
if not "%READ_RC%"=="0" (
  >> "%LOG%" echo ERROR=R4_RAW_READONLY_PREFLIGHT_FAILED
  goto :failed
)
>> "%LOG%" echo STAGE=APPROVED_SINGLE_KEY_D1_APPLY
"%NODE_EXE%" "%RUNNER%" --apply --confirm-earnings-risk-four-raw-d1-write >> "%LOG%" 2>&1
set "APPLY_RC=%ERRORLEVEL%"
>> "%LOG%" echo APPLY_EXIT_CODE=%APPLY_RC%
if not "%APPLY_RC%"=="0" (
  >> "%LOG%" echo ERROR=R4_RAW_D1_READBACK_FAILED
  goto :failed
)
>> "%LOG%" echo WRAPPER_RESULT=D1_READBACK_VERIFIED_OR_ALREADY_STORED
set "WRAPPER_RC=0"
goto :finish

:failed
>> "%LOG%" echo WRAPPER_RESULT=STOPPED_NO_RETRY
set "WRAPPER_RC=1"

:finish
echo.
echo LOG=%LOG%
type "%LOG%"
echo.
echo Send this TXT report to the assistant. Never send config.json or credential files.
pause
exit /b %WRAPPER_RC%
