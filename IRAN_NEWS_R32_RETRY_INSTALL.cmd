@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem R32: replace only two preverified private news source modules.
rem No scheduled task invocation, score, D1 or public news changes.
set "ZG_R32_LOG=%~dp0IRAN_NEWS_R32_RETRY_INSTALL_RESULT.txt"
set "ZG_R32_UPGRADE=%~dp0scripts\iran-progress\news-display-upgrade-r32.mjs"
set "ZG_R32_PROBE=%~dp0scripts\iran-progress\news-display-historical-retry-r32.mjs"
set "ZG_R32_FINAL_EXIT=0"
> "%ZG_R32_LOG%" echo R32_PRIVATE_NEWS_HISTORICAL_RETRY_BEGIN
>> "%ZG_R32_LOG%" echo NO_TASK_RUN_OR_SCHEDULE_CHANGE=YES
>> "%ZG_R32_LOG%" echo NO_D1_SCORE_PUBLICATION_OR_TRANSLATION_CHANGE=YES
if not exist "%ZG_R32_UPGRADE%" goto :missing
if not exist "%ZG_R32_PROBE%" goto :missing
set "ZG_R32_NODE=node.exe"
where node.exe >nul 2>nul
if errorlevel 1 (
 if exist "E:\ZGmini\runtime\node.exe" (
  set "ZG_R32_NODE=E:\ZGmini\runtime\node.exe"
 ) else (
  >> "%ZG_R32_LOG%" echo STOP_R32_NODE_NOT_FOUND
  goto :failed
 )
)
>> "%ZG_R32_LOG%" echo STEP_1=READ_ONLY_PC_AND_PACKAGE_PREFLIGHT
"%ZG_R32_NODE%" "%ZG_R32_UPGRADE%" --preflight >> "%ZG_R32_LOG%" 2>&1
if errorlevel 1 goto :failed
>> "%ZG_R32_LOG%" echo STEP_2=INSTALL_TWO_PRIVATE_MODULES_ONLY
set "ZGMINI_IRAN_NEWS_R32_INSTALL_APPROVED=YES"
"%ZG_R32_NODE%" "%ZG_R32_UPGRADE%" --install >> "%ZG_R32_LOG%" 2>&1
set "ZG_R32_EXIT=%ERRORLEVEL%"
set "ZGMINI_IRAN_NEWS_R32_INSTALL_APPROVED="
if not "%ZG_R32_EXIT%"=="0" goto :uncertain
>> "%ZG_R32_LOG%" echo STEP_3=ONE_SHOT_HISTORICAL_READ_ONLY_PROBE
"%ZG_R32_NODE%" "%ZG_R32_PROBE%" --probe >> "%ZG_R32_LOG%" 2>&1
if errorlevel 1 goto :partial
>> "%ZG_R32_LOG%" echo FINAL_STATUS=PASS_R32_INSTALLED_AND_THREE_PAST_ARTICLES_READ
echo R32 installation and historical probe succeeded.
goto :done

:partial
set "ZG_R32_FINAL_EXIT=1"
>> "%ZG_R32_LOG%" echo FINAL_STATUS=R32_INSTALLED_HISTORICAL_PROBE_PARTIAL
echo R32 installed. One or more historical articles require review.
goto :done

:uncertain
set "ZG_R32_FINAL_EXIT=2"
>> "%ZG_R32_LOG%" echo FINAL_STATUS=STOP_R32_INSTALL_OUTCOME_REQUIRES_REVIEW
>> "%ZG_R32_LOG%" echo DO_NOT_RERUN_OR_DELETE_RECOVERY_BACKUPS
echo R32 install outcome needs review. Do not rerun.
goto :done

:missing
>> "%ZG_R32_LOG%" echo STOP_R32_PACKAGE_INCOMPLETE
:failed
set "ZG_R32_FINAL_EXIT=1"
>> "%ZG_R32_LOG%" echo FINAL_STATUS=STOP_R32_BEFORE_INSTALL
echo R32 stopped before installation.

:done
echo Result log: IRAN_NEWS_R32_RETRY_INSTALL_RESULT.txt
pause
exit /b %ZG_R32_FINAL_EXIT%
