@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem One-time guarded R74 private bundle installation and existing R48 cycle.
rem No task change, new theme, formula change, raw fallback, or D1 write here.
set "R75_HOME=%~dp0"
set "R75_NODE=node"
if exist "E:\ZGmini\runtime\node.exe" set "R75_NODE=E:\ZGmini\runtime\node.exe"
set "R75_REPORT=%R75_HOME%THEME_TEN_R75_RECOVERY_RESULT_%RANDOM%_%RANDOM%.txt"
set "R75_R48=E:\ZGmini\data\pc-writer\theme-nine-r48\THEME_NINE_R48_PRIVATE_CYCLE.cmd"
if exist "%R75_REPORT%" exit /b 3
>"%R75_REPORT%" echo REPORT=R75_EXISTING_TEN_THEME_RECOVERY_ONCE
>>"%R75_REPORT%" echo NEW_THEMES=0 FORMULA_CHANGES=0 TASK_CHANGES=0
>>"%R75_REPORT%" echo D1_WRITES_FROM_THIS_CMD=0
echo R75: existing 10 themes only. Existing R47 file will be SHA checked and backed up.
echo The currently approved 11:30 and 13:30 tasks will not be modified.
set "R75_CONFIRM="
set /p "R75_CONFIRM=Type RUN to perform a one-time guarded private update: "
if /I not "%R75_CONFIRM%"=="RUN" goto :not_confirmed
if not exist "%R75_HOME%THEME_NINE_R47_RECURRING_PRIVATE_UPDATE.cmd" goto :package_missing
if not exist "%R75_HOME%theme-ten-r75-install-r74.mjs" goto :package_missing
if not exist "%R75_HOME%theme-ten-r75-audit.mjs" goto :package_missing
if not exist "%R75_R48%" goto :missing_r48
"%R75_NODE%" "%R75_HOME%theme-ten-r75-install-r74.mjs" --install-once >>"%R75_REPORT%" 2>&1
set "R75_INSTALL_RC=%ERRORLEVEL%"
>>"%R75_REPORT%" echo INSTALL_EXIT=%R75_INSTALL_RC%
if not "%R75_INSTALL_RC%"=="0" goto :install_stop
if exist "E:\ZGmini\data\themes\legacy-nine-r35-delta\state\delta.lock" goto :lock
>>"%R75_REPORT%" echo PRIVATE_CYCLE=START_EXISTING_R48_ONCE
call "%R75_R48%" >>"%R75_REPORT%" 2>&1
set "R75_PRIVATE_RC=%ERRORLEVEL%"
>>"%R75_REPORT%" echo PRIVATE_CYCLE_EXIT=%R75_PRIVATE_RC%
>>"%R75_REPORT%" echo PRIVATE_EXIT_ZERO_IS_NOT_DATA_OR_D1_PROOF
"%R75_NODE%" "%R75_HOME%theme-ten-r75-audit.mjs" --audit >>"%R75_REPORT%" 2>&1
set "R75_AUDIT_RC=%ERRORLEVEL%"
>>"%R75_REPORT%" echo AUDIT_EXIT=%R75_AUDIT_RC%
if not "%R75_PRIVATE_RC%"=="0" goto :private_stop
if not "%R75_AUDIT_RC%"=="0" goto :audit_stop
>>"%R75_REPORT%" echo RESULT=PC_PRIVATE_RUN_AUDITED_PUBLICATION_AND_NEXT_SCHEDULE_PENDING
set "R75_RC=0"
goto :done
:not_confirmed
>>"%R75_REPORT%" echo RESULT=STOP_USER_DID_NOT_CONFIRM
set "R75_RC=2"
goto :done
:package_missing
>>"%R75_REPORT%" echo RESULT=STOP_R75_PACKAGE_FILE_MISSING
set "R75_RC=3"
goto :done
:missing_r48
>>"%R75_REPORT%" echo RESULT=STOP_EXISTING_R48_MISSING
set "R75_RC=4"
goto :done
:install_stop
>>"%R75_REPORT%" echo RESULT=STOP_INSTALL_CHECK_REPORT
set "R75_RC=5"
goto :done
:lock
>>"%R75_REPORT%" echo RESULT=STOP_PRIVATE_COLLECTION_LOCK_ACTIVE
set "R75_RC=6"
goto :done
:private_stop
>>"%R75_REPORT%" echo RESULT=STOP_PRIVATE_CYCLE_CHECK_REPORT
set "R75_RC=7"
goto :done
:audit_stop
>>"%R75_REPORT%" echo RESULT=STOP_READ_ONLY_AUDIT_CHECK_REPORT
set "R75_RC=8"
goto :done
:done
echo RESULT_FILE=%R75_REPORT%
type "%R75_REPORT%"
pause
exit /b %R75_RC%
