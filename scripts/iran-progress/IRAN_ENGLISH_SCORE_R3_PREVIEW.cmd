@echo off
setlocal DisableDelayedExpansion
rem English R5 bounded quote shadow preview. No production changes.
set "ZG_ENGLISH_R3_LOG=%~dp0IRAN_ENGLISH_SCORE_R3_PREVIEW_RESULT.txt"
>"%ZG_ENGLISH_R3_LOG%" echo ZGMINI IRAN ENGLISH SCORE R3 - SHADOW ONLY
>>"%ZG_ENGLISH_R3_LOG%" echo No source body, output quote, public score, task or translation changes.
call "%~dp0..\resolve-local-node.cmd" >>"%ZG_ENGLISH_R3_LOG%" 2>&1
if errorlevel 1 goto blocked
if not exist "%~dp0english-score-preview-r3.mjs" goto blocked
"%NODE%" "%~dp0english-score-preview-r3.mjs" --preview >>"%ZG_ENGLISH_R3_LOG%" 2>&1
if errorlevel 1 goto blocked
>>"%ZG_ENGLISH_R3_LOG%" echo FINAL_STATUS=ENGLISH_SCORE_R3_SHADOW_NO_PUBLISH
type "%ZG_ENGLISH_R3_LOG%"
exit /b 0
:blocked
>>"%ZG_ENGLISH_R3_LOG%" echo FINAL_STATUS=BLOCKED_NO_SCORE_OR_TASK_CHANGE
type "%ZG_ENGLISH_R3_LOG%"
exit /b 1
