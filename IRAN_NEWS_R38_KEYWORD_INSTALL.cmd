@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem R38 guarded private keyword module update. No D1/news publish or scheduler change.
set "ZG_R38_RESULT=%~dp0IRAN_NEWS_R38_KEYWORD_INSTALL_RESULT.txt"
set "ZG_R38_INSTALLER=%~dp0scripts\iran-progress\news-display-upgrade-r38.mjs"
set "ZG_R38_EXIT=1"
if exist "%ZG_R38_RESULT%" goto :existing
> "%ZG_R38_RESULT%" echo R38_TWO_STAGE_KEYWORDS_BEGIN
>> "%ZG_R38_RESULT%" echo NO_D1_SCHEDULER_PUBLIC_CACHE_OR_SCORE_WRITE=YES
if not exist "%ZG_R38_INSTALLER%" goto :missing
set "ZG_R38_NODE=node.exe"
where node.exe >nul 2>nul
if errorlevel 1 (
 if exist "E:\ZGmini\runtime\node.exe" (
  set "ZG_R38_NODE=E:\ZGmini\runtime\node.exe"
 ) else (
  >> "%ZG_R38_RESULT%" echo STOP_R38_NODE_MISSING
  goto :done
 )
)
>> "%ZG_R38_RESULT%" echo STEP_1=READ_ONLY_IDENTITY_AND_SCHEDULE_PREFLIGHT
"%ZG_R38_NODE%" "%ZG_R38_INSTALLER%" --preflight >> "%ZG_R38_RESULT%" 2>&1
if errorlevel 1 goto :before
>> "%ZG_R38_RESULT%" echo STEP_2=GUARDED_TWO_MODULE_INSTALL
set "ZGMINI_IRAN_NEWS_R38_INSTALL_APPROVED=YES"
"%ZG_R38_NODE%" "%ZG_R38_INSTALLER%" --install >> "%ZG_R38_RESULT%" 2>&1
set "ZG_R38_INSTALL_CODE=%ERRORLEVEL%"
set "ZGMINI_IRAN_NEWS_R38_INSTALL_APPROVED="
if not "%ZG_R38_INSTALL_CODE%"=="0" goto :uncertain
>> "%ZG_R38_RESULT%" echo STEP_3=READ_BACK_NEW_MODULE_IDENTITIES
"%ZG_R38_NODE%" "%ZG_R38_INSTALLER%" --verify >> "%ZG_R38_RESULT%" 2>&1
if errorlevel 1 goto :uncertain
>> "%ZG_R38_RESULT%" echo FINAL_STATUS=PASS_R38_PC_KEYWORD_MODULES_INSTALLED
set "ZG_R38_EXIT=0"
goto :done
:uncertain
>> "%ZG_R38_RESULT%" echo FINAL_STATUS=STOP_R38_INSTALL_OUTCOME_REQUIRES_REVIEW
>> "%ZG_R38_RESULT%" echo DO_NOT_RERUN_OR_REMOVE_BACKUPS
set "ZG_R38_EXIT=2"
goto :done
:missing
>> "%ZG_R38_RESULT%" echo STOP_R38_PACKAGE_INCOMPLETE
:before
>> "%ZG_R38_RESULT%" echo FINAL_STATUS=STOP_R38_BEFORE_INSTALL
goto :done
:existing
echo STOP_R38_RESULT_ALREADY_EXISTS. Send the original result file for review.
set "ZG_R38_EXIT=2"
goto :done
:done
echo R38 result: IRAN_NEWS_R38_KEYWORD_INSTALL_RESULT.txt
pause
exit /b %ZG_R38_EXIT%
