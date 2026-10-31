@echo off
setlocal DisableDelayedExpansion
rem English R5 shadow preview with Tasnim story fallback. Read only.
set "ZG_ENGLISH_R2_LOG=%~dp0IRAN_ENGLISH_SCORE_R2_PREVIEW_RESULT.txt"
>"%ZG_ENGLISH_R2_LOG%" echo ZGMINI IRAN ENGLISH SCORE R2 - SHADOW ONLY
>>"%ZG_ENGLISH_R2_LOG%" echo No source text persisted and no public score, task or translation changes.
call "%~dp0..\resolve-local-node.cmd" >>"%ZG_ENGLISH_R2_LOG%" 2>&1
if errorlevel 1 goto blocked
if not exist "%~dp0english-score-preview-r2.mjs" goto blocked
"%NODE%" "%~dp0english-score-preview-r2.mjs" --preview >>"%ZG_ENGLISH_R2_LOG%" 2>&1
if errorlevel 1 goto blocked
>>"%ZG_ENGLISH_R2_LOG%" echo FINAL_STATUS=ENGLISH_SCORE_R2_SHADOW_NO_PUBLISH
type "%ZG_ENGLISH_R2_LOG%"
exit /b 0
:blocked
>>"%ZG_ENGLISH_R2_LOG%" echo FINAL_STATUS=BLOCKED_NO_SCORE_OR_TASK_CHANGE
type "%ZG_ENGLISH_R2_LOG%"
exit /b 1
