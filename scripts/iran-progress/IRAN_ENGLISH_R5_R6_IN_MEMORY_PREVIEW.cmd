@echo off
setlocal DisableDelayedExpansion
rem Read-only R41 English proof and existing R5 score projection.
rem No SQLite/D1/checkpoint write, public publish or scheduled action.
set "ZG_ENGLISH_R6_LOG=%~dp0IRAN_ENGLISH_R5_R6_IN_MEMORY_RESULT.txt"
>"%ZG_ENGLISH_R6_LOG%" echo ZGMINI IRAN ENGLISH R5 R6 - IN MEMORY ONLY
call "%~dp0..\resolve-local-node.cmd" >>"%ZG_ENGLISH_R6_LOG%" 2>&1
if errorlevel 1 goto blocked
if not exist "%~dp0english-r5-published-preview-r6.mjs" goto blocked
"%NODE%" "%~dp0english-r5-published-preview-r6.mjs" --preview >>"%ZG_ENGLISH_R6_LOG%" 2>&1
if errorlevel 1 goto blocked
>>"%ZG_ENGLISH_R6_LOG%" echo FINAL_STATUS=ENGLISH_R5_R6_IN_MEMORY_NO_PUBLISH
type "%ZG_ENGLISH_R6_LOG%"
exit /b 0
:blocked
>>"%ZG_ENGLISH_R6_LOG%" echo FINAL_STATUS=BLOCKED_NO_SCORE_OR_TASK_CHANGE
type "%ZG_ENGLISH_R6_LOG%"
exit /b 1
