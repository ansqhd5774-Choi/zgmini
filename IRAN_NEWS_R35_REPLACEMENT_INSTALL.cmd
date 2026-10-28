@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem R35 one-time guarded Guardian/DW private source replacement.
rem NO scheduler registration, D1, public news or score modifications.
set "ZG_R35_LOG=%~dp0IRAN_NEWS_R35_REPLACEMENT_RESULT.txt"
set "ZG_R35_UPGRADE=%~dp0scripts\iran-progress\news-display-upgrade-r35.mjs"
set "ZG_R35_PROBE=%~dp0scripts\iran-progress\news-display-replacements-r35.mjs"
set "ZG_R35_FINAL_EXIT=0"
if exist "%ZG_R35_LOG%" goto :existing
> "%ZG_R35_LOG%" echo R35_SEVEN_SOURCE_REPLACEMENT_BEGIN
>> "%ZG_R35_LOG%" echo RETIRE=iaea-news,iaea-statements
>> "%ZG_R35_LOG%" echo REPLACE=guardian-iran,dw-world
>> "%ZG_R35_LOG%" echo NO_SCHEDULE_D1_PUBLIC_NEWS_OR_SCORE_CHANGE=YES
if not exist "%ZG_R35_UPGRADE%" goto :missing
if not exist "%ZG_R35_PROBE%" goto :missing
set "ZG_R35_NODE=node.exe"
where node.exe >nul 2>nul
if errorlevel 1 (
 if exist "E:\ZGmini\runtime\node.exe" (
  set "ZG_R35_NODE=E:\ZGmini\runtime\node.exe"
 ) else (
  >> "%ZG_R35_LOG%" echo STOP_R35_NODE_NOT_FOUND
  goto :before
 )
)
>> "%ZG_R35_LOG%" echo STEP_1=READ_ONLY_R34_PC_MODULE_IDENTITY_AND_TIME_PREFLIGHT
"%ZG_R35_NODE%" "%ZG_R35_UPGRADE%" --preflight >> "%ZG_R35_LOG%" 2>&1
if errorlevel 1 goto :before
>> "%ZG_R35_LOG%" echo STEP_2=READ_ONLY_LIVE_27OCT_GUARDIAN_AND_DW_FEED_ARTICLE_PROBE
"%ZG_R35_NODE%" "%ZG_R35_PROBE%" --probe >> "%ZG_R35_LOG%" 2>&1
if errorlevel 1 goto :source_failed
>> "%ZG_R35_LOG%" echo STEP_3=INSTALL_TWO_SHA_PINNED_PRIVATE_DISPLAY_MODULES
set "ZGMINI_IRAN_NEWS_R35_INSTALL_APPROVED=YES"
"%ZG_R35_NODE%" "%ZG_R35_UPGRADE%" --install >> "%ZG_R35_LOG%" 2>&1
set "ZG_R35_INSTALL_EXIT=%ERRORLEVEL%"
set "ZGMINI_IRAN_NEWS_R35_INSTALL_APPROVED="
if not "%ZG_R35_INSTALL_EXIT%"=="0" goto :uncertain
>> "%ZG_R35_LOG%" echo STEP_4=ONCE_PRIVATE_SEVEN_SOURCE_COLLECT_AND_READBACK
set "ZGMINI_IRAN_NEWS_R35_COLLECT_APPROVED=YES"
"%ZG_R35_NODE%" "%ZG_R35_PROBE%" --collect-once >> "%ZG_R35_LOG%" 2>&1
set "ZG_R35_COLLECT_EXIT=%ERRORLEVEL%"
set "ZGMINI_IRAN_NEWS_R35_COLLECT_APPROVED="
if not "%ZG_R35_COLLECT_EXIT%"=="0" goto :partial
>> "%ZG_R35_LOG%" echo FINAL_STATUS=PASS_R35_PRIVATE_TWO_REPLACEMENT_ARTICLES_STORED
goto :done

:partial
set "ZG_R35_FINAL_EXIT=1"
>> "%ZG_R35_LOG%" echo FINAL_STATUS=R35_INSTALLED_PRIVATE_COLLECTION_PARTIAL
>> "%ZG_R35_LOG%" echo DO_NOT_RERUN_SEND_RESULT_FOR_REVIEW
goto :done

:uncertain
set "ZG_R35_FINAL_EXIT=2"
>> "%ZG_R35_LOG%" echo FINAL_STATUS=STOP_R35_INSTALL_OUTCOME_REQUIRES_REVIEW
>> "%ZG_R35_LOG%" echo DO_NOT_RERUN_OR_DELETE_RECOVERY_BACKUPS
goto :done

:source_failed
set "ZG_R35_FINAL_EXIT=1"
>> "%ZG_R35_LOG%" echo FINAL_STATUS=R35_PUBLISHER_PROBE_FAILED_NO_PC_MODULE_CHANGE
>> "%ZG_R35_LOG%" echo DO_NOT_RERUN_SEND_RESULT_FOR_REVIEW
goto :done

:missing
>> "%ZG_R35_LOG%" echo STOP_R35_PACKAGE_INCOMPLETE
:before
set "ZG_R35_FINAL_EXIT=1"
>> "%ZG_R35_LOG%" echo FINAL_STATUS=STOP_R35_BEFORE_INSTALL
goto :done

:existing
echo STOP_R35_RESULT_ALREADY_EXISTS. Do not rerun; send existing result file.
set "ZG_R35_FINAL_EXIT=2"
goto :done

:done
echo Result: IRAN_NEWS_R35_REPLACEMENT_RESULT.txt
pause
exit /b %ZG_R35_FINAL_EXIT%
