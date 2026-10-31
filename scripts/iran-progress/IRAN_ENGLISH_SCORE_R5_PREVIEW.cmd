@echo off
setlocal DisableDelayedExpansion
rem English R5 target-event shadow preview. No production changes.
set "ZG_ENGLISH_R5_LOG=%~dp0IRAN_ENGLISH_SCORE_R5_PREVIEW_RESULT.txt"
>"%ZG_ENGLISH_R5_LOG%" echo ZGMINI IRAN ENGLISH SCORE R5 - SHADOW ONLY
>>"%ZG_ENGLISH_R5_LOG%" echo Only rule and stage diagnostics; no article body or model quote saved.
call "%~dp0..\resolve-local-node.cmd" >>"%ZG_ENGLISH_R5_LOG%" 2>&1
if errorlevel 1 goto blocked
if not exist "%~dp0english-score-preview-r5.mjs" goto blocked
"%NODE%" "%~dp0english-score-preview-r5.mjs" --preview >>"%ZG_ENGLISH_R5_LOG%" 2>&1
if errorlevel 1 goto blocked
>>"%ZG_ENGLISH_R5_LOG%" echo FINAL_STATUS=ENGLISH_SCORE_R5_SHADOW_NO_PUBLISH
type "%ZG_ENGLISH_R5_LOG%"
exit /b 0
:blocked
>>"%ZG_ENGLISH_R5_LOG%" echo FINAL_STATUS=BLOCKED_NO_SCORE_OR_TASK_CHANGE
type "%ZG_ENGLISH_R5_LOG%"
exit /b 1
