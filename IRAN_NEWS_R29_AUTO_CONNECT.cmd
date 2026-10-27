@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem R29: install existing R15 runner extension only. Extract full offline ZIP first.
rem No downloads, new schedule, D1 writes, SQLite edits, or manual collection.
set "ZG_R29_LOG=%~dp0IRAN_NEWS_R29_AUTO_CONNECT_RESULT.txt"
set "ZG_R29_INSTALLER=%~dp0scripts\iran-progress\news-display-install-hook-r29.mjs"
> "%ZG_R29_LOG%" echo ZGMINI IRAN NEWS R29 - PRIVATE NEWS AUTO CONNECT
>> "%ZG_R29_LOG%" echo MODE=R15_EXISTING_R13_AFTER_HOOK_ONLY
>> "%ZG_R29_LOG%" echo NO_GITHUB_CODE_DOWNLOAD=YES
>> "%ZG_R29_LOG%" echo NO_NEW_WINDOWS_TASK=YES
>> "%ZG_R29_LOG%" echo NO_SCORE_OR_D1_WRITE_BY_INSTALLER=YES
if not exist "%ZG_R29_INSTALLER%" (
 >> "%ZG_R29_LOG%" echo STOP: Extract the entire ZIP before running CMD.
 goto :failed
)
where node >nul 2>nul
if errorlevel 1 (
 >> "%ZG_R29_LOG%" echo STOP: Node executable not found on PATH.
 goto :failed
)
>> "%ZG_R29_LOG%" echo [1] READ ONLY - verify R15 runner, scheduler, VBS, PC cache, offline modules
node "%ZG_R29_INSTALLER%" --preflight >> "%ZG_R29_LOG%" 2>&1
if errorlevel 1 goto :failed
>> "%ZG_R29_LOG%" echo [2] guarded one-time install of five private collector modules and one R15 runner extension
set "ZGMINI_IRAN_NEWS_R29_INSTALL_APPROVED=YES"
node "%ZG_R29_INSTALLER%" --install >> "%ZG_R29_LOG%" 2>&1
set "ZG_R29_RESULT=%ERRORLEVEL%"
set "ZGMINI_IRAN_NEWS_R29_INSTALL_APPROVED="
if not "%ZG_R29_RESULT%"=="0" goto :uncertain
>> "%ZG_R29_LOG%" echo FINAL_STATUS=PASS_R29_PRIVATE_NEWS_R13_HOOK_INSTALLED
>> "%ZG_R29_LOG%" echo NEXT_GATE=USER_VERIFY_NEXT_TWO_NORMAL_R13_SCHEDULED_CYCLES
echo R29 installed. Upload IRAN_NEWS_R29_AUTO_CONNECT_RESULT.txt.
exit /b 0

:uncertain
>> "%ZG_R29_LOG%" echo FINAL_STATUS=STOP_R29_INSTALL_OUTCOME_REQUIRES_REVIEW
>> "%ZG_R29_LOG%" echo DO_NOT_RERUN_OR_REMOVE_RECOVERY_FILES
echo R29 installation requires review. DO NOT RERUN. Upload the log.
exit /b 2

:failed
>> "%ZG_R29_LOG%" echo FINAL_STATUS=STOP_R29_BEFORE_INSTALL
echo R29 stopped before installation. Upload IRAN_NEWS_R29_AUTO_CONNECT_RESULT.txt.
exit /b 1
