@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem R30: accept only the pinned pre-translation PC display library for R29.
rem Extract the entire offline ZIP. Never replace existing display/translation files.
set "ZG_R30_LOG=%~dp0IRAN_NEWS_R30_COMPAT_INSTALL_RESULT.txt"
set "ZG_R30_INSTALLER=%~dp0scripts\iran-progress\news-display-install-hook-r29.mjs"
> "%ZG_R30_LOG%" echo ZGMINI IRAN NEWS R30 - PINNED PC DEPENDENCY COMPAT
>> "%ZG_R30_LOG%" echo MODE=R29_EXISTING_R13_PRIVATE_AFTER_HOOK_ONLY
>> "%ZG_R30_LOG%" echo PRESERVE_EXISTING_NEWS_LIB_AND_TRANSLATION=YES
>> "%ZG_R30_LOG%" echo NO_GITHUB_CODE_DOWNLOAD=YES
>> "%ZG_R30_LOG%" echo NO_NEW_WINDOWS_TASK=YES
>> "%ZG_R30_LOG%" echo NO_SCORE_OR_D1_WRITE_BY_INSTALLER=YES
if not exist "%ZG_R30_INSTALLER%" (
 >> "%ZG_R30_LOG%" echo STOP: Extract the entire ZIP before running CMD.
 goto :failed
)
where node >nul 2>nul
if errorlevel 1 (
 >> "%ZG_R30_LOG%" echo STOP: Node executable not found on PATH.
 goto :failed
)
>> "%ZG_R30_LOG%" echo [1] READ ONLY - verify scheduler, R15, pinned old PC lib and complete R28 bundle
node "%ZG_R30_INSTALLER%" --preflight >> "%ZG_R30_LOG%" 2>&1
if errorlevel 1 goto :failed
>> "%ZG_R30_LOG%" echo [2] install R29 private hook only; preserve old library without rewrite
set "ZGMINI_IRAN_NEWS_R29_INSTALL_APPROVED=YES"
node "%ZG_R30_INSTALLER%" --install >> "%ZG_R30_LOG%" 2>&1
set "ZG_R30_RESULT=%ERRORLEVEL%"
set "ZGMINI_IRAN_NEWS_R29_INSTALL_APPROVED="
if not "%ZG_R30_RESULT%"=="0" goto :uncertain
>> "%ZG_R30_LOG%" echo FINAL_STATUS=PASS_R30_R29_PRIVATE_NEWS_HOOK_INSTALLED
>> "%ZG_R30_LOG%" echo NEXT_GATE=USER_VERIFY_NEXT_TWO_NORMAL_R13_SCHEDULED_CYCLES
echo R30 installed. Upload IRAN_NEWS_R30_COMPAT_INSTALL_RESULT.txt.
exit /b 0

:uncertain
>> "%ZG_R30_LOG%" echo FINAL_STATUS=STOP_R30_INSTALL_OUTCOME_REQUIRES_REVIEW
>> "%ZG_R30_LOG%" echo DO_NOT_RERUN_OR_REMOVE_RECOVERY_FILES
echo R30 install requires review. DO NOT RERUN. Upload the log.
exit /b 2

:failed
>> "%ZG_R30_LOG%" echo FINAL_STATUS=STOP_R30_BEFORE_INSTALL
echo R30 stopped before installation. Upload IRAN_NEWS_R30_COMPAT_INSTALL_RESULT.txt.
exit /b 1
