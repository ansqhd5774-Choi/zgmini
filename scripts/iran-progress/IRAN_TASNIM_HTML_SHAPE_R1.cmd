@echo off
setlocal DisableDelayedExpansion
rem Read-only HTML structure diagnostic. No article body or scores are persisted.
set "ZG_TASNIM_SHAPE_LOG=%~dp0IRAN_TASNIM_HTML_SHAPE_R1_RESULT.txt"
>"%ZG_TASNIM_SHAPE_LOG%" echo ZGMINI IRAN TASNIM HTML SHAPE R1 - READ ONLY
>>"%ZG_TASNIM_SHAPE_LOG%" echo No score, publisher, task or translation changes.
call "%~dp0..\resolve-local-node.cmd" >>"%ZG_TASNIM_SHAPE_LOG%" 2>&1
if errorlevel 1 goto blocked
if not exist "%~dp0tasnim-html-shape-r1.mjs" goto blocked
"%NODE%" "%~dp0tasnim-html-shape-r1.mjs" --read-only >>"%ZG_TASNIM_SHAPE_LOG%" 2>&1
if errorlevel 1 goto blocked
>>"%ZG_TASNIM_SHAPE_LOG%" echo FINAL_STATUS=HTML_SHAPE_DIAGNOSTIC_NO_PUBLISH
type "%ZG_TASNIM_SHAPE_LOG%"
exit /b 0
:blocked
>>"%ZG_TASNIM_SHAPE_LOG%" echo FINAL_STATUS=BLOCKED_NO_SCORE_OR_TASK_CHANGE
type "%ZG_TASNIM_SHAPE_LOG%"
exit /b 1
