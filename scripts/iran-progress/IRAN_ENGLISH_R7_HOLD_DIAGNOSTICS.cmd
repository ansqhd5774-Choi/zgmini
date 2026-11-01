@echo off
setlocal DisableDelayedExpansion
rem R7 manual diagnostics only; no operational project install or score write.
set "ZG_R7_LOG=%~dp0IRAN_ENGLISH_R7_HOLD_DIAGNOSTICS_RESULT.txt"
>"%ZG_R7_LOG%" echo ZGMINI IRAN ENGLISH R7 - READ ONLY ARTICLE HOLDS
call "%~dp0..\resolve-local-node.cmd" >>"%ZG_R7_LOG%" 2>&1
if errorlevel 1 goto blocked
if not exist "%~dp0english-r5-hold-diagnostics-r7.mjs" goto blocked
"%NODE%" "%~dp0english-r5-hold-diagnostics-r7.mjs" --diagnose >>"%ZG_R7_LOG%" 2>&1
if errorlevel 1 goto blocked
>>"%ZG_R7_LOG%" echo FINAL_STATUS=IRAN_R7_DIAGNOSTICS_READ_ONLY_NO_PUBLISH
type "%ZG_R7_LOG%"
exit /b 0
:blocked
>>"%ZG_R7_LOG%" echo FINAL_STATUS=BLOCKED_NO_SCORE_OR_TASK_CHANGE
type "%ZG_R7_LOG%"
exit /b 1
