@echo off
setlocal DisableDelayedExpansion
rem Read-only English Ollama -> R5 evidence preview. Never install tasks or publish.
set "ZG_ENGLISH_SCORE_LOG=%~dp0IRAN_ENGLISH_SCORE_R1_PREVIEW_RESULT.txt"
>"%ZG_ENGLISH_SCORE_LOG%" echo ZGMINI IRAN ENGLISH SCORE R1 - READ ONLY PREVIEW
>>"%ZG_ENGLISH_SCORE_LOG%" echo Existing tasks unchanged. R5 scores not published.
call "%~dp0..\resolve-local-node.cmd" >>"%ZG_ENGLISH_SCORE_LOG%" 2>&1
if errorlevel 1 goto blocked
if not exist "%~dp0english-score-preview-r1.mjs" goto blocked
"%NODE%" "%~dp0english-score-preview-r1.mjs" --preview >>"%ZG_ENGLISH_SCORE_LOG%" 2>&1
if errorlevel 1 goto blocked
>>"%ZG_ENGLISH_SCORE_LOG%" echo FINAL_STATUS=SHADOW_PREVIEW_COMPLETE_NO_PUBLISH
type "%ZG_ENGLISH_SCORE_LOG%"
exit /b 0
:blocked
>>"%ZG_ENGLISH_SCORE_LOG%" echo FINAL_STATUS=BLOCKED_NO_SCORE_OR_TASK_CHANGE
type "%ZG_ENGLISH_SCORE_LOG%"
exit /b 1
