@echo off
setlocal DisableDelayedExpansion
rem Install a NEW independent ten-minute analysis task; do not modify any
rem existing news collector, Iran score, editorial approval or PC writer task.
set "ZG_ANALYSIS_INSTALL_LOG=%~dp0IRAN_NEWS_ANALYSIS_R1_INSTALL_RESULT.txt"
>"%ZG_ANALYSIS_INSTALL_LOG%" echo ZGMINI IRAN NEWS AUTO ANALYSIS R1 - TASK INSTALL
>>"%ZG_ANALYSIS_INSTALL_LOG%" echo Task: ZGMINI-PC-Iran-News-Analysis-R1
>>"%ZG_ANALYSIS_INSTALL_LOG%" echo Existing task modifications: NONE
call "%~dp0..\resolve-local-node.cmd" >>"%ZG_ANALYSIS_INSTALL_LOG%" 2>&1
if errorlevel 1 goto blocked
if not exist "%~dp0news-analysis-schedule-r1.mjs" goto blocked
if not exist "%~dp0news-analysis-scheduled-r1.mjs" goto blocked
>>"%ZG_ANALYSIS_INSTALL_LOG%" echo.
>>"%ZG_ANALYSIS_INSTALL_LOG%" echo [1] READ-ONLY TASK PREFLIGHT
"%NODE%" "%~dp0news-analysis-schedule-r1.mjs" --inspect >>"%ZG_ANALYSIS_INSTALL_LOG%" 2>&1
if errorlevel 1 goto blocked
>>"%ZG_ANALYSIS_INSTALL_LOG%" echo [2] REGISTER NEW TASK OR VERIFY EXISTING IDENTICAL TASK
"%NODE%" "%~dp0news-analysis-schedule-r1.mjs" --apply >>"%ZG_ANALYSIS_INSTALL_LOG%" 2>&1
if errorlevel 1 goto blocked
>>"%ZG_ANALYSIS_INSTALL_LOG%" echo FINAL_STATUS=TASK_REGISTERED_OR_VERIFIED
type "%ZG_ANALYSIS_INSTALL_LOG%"
exit /b 0
:blocked
>>"%ZG_ANALYSIS_INSTALL_LOG%" echo FINAL_STATUS=BLOCKED_NO_EXISTING_TASK_CHANGED
type "%ZG_ANALYSIS_INSTALL_LOG%"
exit /b 1
