@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem R34: guarded, one-time, private-only IAEA recent discovery repair.
rem Scheduled tasks, D1, public news, scores and R33 HTML stay unchanged.
set "ZG_R34_LOG=%~dp0IRAN_NEWS_R34_INSTALL_AND_COLLECT_RESULT.txt"
set "ZG_R34_UPGRADE=%~dp0scripts\iran-progress\news-display-upgrade-r34.mjs"
set "ZG_R34_PROBE=%~dp0scripts\iran-progress\news-display-recent-iaea-r34.mjs"
set "ZG_R34_FINAL_EXIT=0"
if exist "%ZG_R34_LOG%" goto :existing
> "%ZG_R34_LOG%" echo R34_RECENT_IAEA_PRIVATE_REPAIR_BEGIN
>> "%ZG_R34_LOG%" echo NO_SCHEDULE_D1_PUBLIC_NEWS_OR_SCORE_CHANGE=YES
if not exist "%ZG_R34_UPGRADE%" goto :missing
if not exist "%ZG_R34_PROBE%" goto :missing
set "ZG_R34_NODE=node.exe"
where node.exe >nul 2>nul
if errorlevel 1 (
 if exist "E:\ZGmini\runtime\node.exe" (
  set "ZG_R34_NODE=E:\ZGmini\runtime\node.exe"
 ) else (
  >> "%ZG_R34_LOG%" echo STOP_R34_NODE_NOT_FOUND
  goto :before
 )
)
>> "%ZG_R34_LOG%" echo STEP_1=READ_ONLY_R32_IDENTITY_AND_INSTALL_TIME_PREFLIGHT
"%ZG_R34_NODE%" "%ZG_R34_UPGRADE%" --preflight >> "%ZG_R34_LOG%" 2>&1
if errorlevel 1 goto :before
>> "%ZG_R34_LOG%" echo STEP_2=INSTALL_ONE_PRIVATE_R24_SOURCE_MODULE_ONLY
set "ZGMINI_IRAN_NEWS_R34_INSTALL_APPROVED=YES"
"%ZG_R34_NODE%" "%ZG_R34_UPGRADE%" --install >> "%ZG_R34_LOG%" 2>&1
set "ZG_R34_INSTALL_EXIT=%ERRORLEVEL%"
set "ZGMINI_IRAN_NEWS_R34_INSTALL_APPROVED="
if not "%ZG_R34_INSTALL_EXIT%"=="0" goto :uncertain
>> "%ZG_R34_LOG%" echo STEP_3=ONE_SHOT_27OCT_LIVE_ARTICLE_PROBE
"%ZG_R34_NODE%" "%ZG_R34_PROBE%" --probe >> "%ZG_R34_LOG%" 2>&1
if errorlevel 1 goto :partial
>> "%ZG_R34_LOG%" echo STEP_4=ONCE_PRIVATE_CANDIDATE_COLLECT_AND_READBACK
set "ZGMINI_IRAN_NEWS_R34_COLLECT_APPROVED=YES"
"%ZG_R34_NODE%" "%ZG_R34_PROBE%" --collect-once >> "%ZG_R34_LOG%" 2>&1
set "ZG_R34_COLLECT_EXIT=%ERRORLEVEL%"
set "ZGMINI_IRAN_NEWS_R34_COLLECT_APPROVED="
if not "%ZG_R34_COLLECT_EXIT%"=="0" goto :partial
>> "%ZG_R34_LOG%" echo FINAL_STATUS=PASS_R34_27OCT_PRIVATE_CANDIDATE_COLLECTED
goto :done

:partial
set "ZG_R34_FINAL_EXIT=1"
>> "%ZG_R34_LOG%" echo FINAL_STATUS=R34_INSTALLED_PRIVATE_COLLECTION_PARTIAL
>> "%ZG_R34_LOG%" echo DO_NOT_RERUN_SEND_RESULT_FOR_REVIEW
goto :done

:uncertain
set "ZG_R34_FINAL_EXIT=2"
>> "%ZG_R34_LOG%" echo FINAL_STATUS=STOP_R34_INSTALL_OUTCOME_REQUIRES_REVIEW
>> "%ZG_R34_LOG%" echo DO_NOT_RERUN_OR_REMOVE_RECOVERY_BACKUPS
goto :done

:missing
>> "%ZG_R34_LOG%" echo STOP_R34_PACKAGE_INCOMPLETE
:before
set "ZG_R34_FINAL_EXIT=1"
>> "%ZG_R34_LOG%" echo FINAL_STATUS=STOP_R34_BEFORE_INSTALL
goto :done

:existing
echo STOP_R34_RESULT_ALREADY_EXISTS. Do not rerun; send existing result file.
set "ZG_R34_FINAL_EXIT=2"
goto :done

:done
echo Result: IRAN_NEWS_R34_INSTALL_AND_COLLECT_RESULT.txt
pause
exit /b %ZG_R34_FINAL_EXIT%
