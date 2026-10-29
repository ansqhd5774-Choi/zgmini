@echo off
setlocal DisableDelayedExpansion
rem Manual one-cycle check for the same independent lane. Scheduling is optional.
set "ZG_ANALYSIS_ONCE_LOG=%~dp0IRAN_NEWS_ANALYSIS_R1_RUN_NOW_RESULT.txt"
>"%ZG_ANALYSIS_ONCE_LOG%" echo ZGMINI IRAN NEWS AUTO ANALYSIS R1 - ONE CYCLE
call "%~dp0..\resolve-local-node.cmd" >>"%ZG_ANALYSIS_ONCE_LOG%" 2>&1
if errorlevel 1 goto blocked
if not exist "%~dp0news-analysis-scheduled-r1.mjs" goto blocked
"%NODE%" "%~dp0news-analysis-scheduled-r1.mjs" >>"%ZG_ANALYSIS_ONCE_LOG%" 2>&1
if errorlevel 1 goto blocked
>>"%ZG_ANALYSIS_ONCE_LOG%" echo FINAL_STATUS=ANALYSIS_PUBLICATION_READBACK_VERIFIED
type "%ZG_ANALYSIS_ONCE_LOG%"
exit /b 0
:blocked
>>"%ZG_ANALYSIS_ONCE_LOG%" echo FINAL_STATUS=BLOCKED_CHECK_LAST_RESULT
type "%ZG_ANALYSIS_ONCE_LOG%"
exit /b 1
