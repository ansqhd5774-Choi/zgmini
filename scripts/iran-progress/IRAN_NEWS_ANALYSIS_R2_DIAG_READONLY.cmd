@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem Inspect only the already generated R2 preview. No Ollama call, Git, D1 or schedule writes.
set "ZG_LOG=%~dp0IRAN_NEWS_ANALYSIS_R2_DIAG_RESULT.txt"
set "ZG_TARGET=E:\ZGmini\projects\iran-news-analysis-r1-56eec668"
set "ZG_PREVIEW=E:\ZGmini\data\iran-progress-r13\news-analysis-r2-preview-stage-7376_20754.json"
>"%ZG_LOG%" echo IRAN NEWS R2 PREVIEW READ-ONLY REASON DIAGNOSTIC
if errorlevel 1 goto log_failed
if not exist "%ZG_PREVIEW%" goto preview_missing
call "%ZG_TARGET%\scripts\resolve-local-node.cmd" >>"%ZG_LOG%" 2>&1
if errorlevel 1 goto node_failed
"%NODE%" -e "const fs=require('fs');const f=process.argv[1];const d=JSON.parse(fs.readFileSync(f,'utf8'));const reasons={};for(const p of d.pending??[]){const k=p.reason??'UNKNOWN';reasons[k]=(reasons[k]??0)+1;}const r={version:d.version,status:'READ_ONLY',ready:d.items?.length??null,pending:d.pending?.length??null,reasons};console.log(JSON.stringify(r,null,2));if(!Array.isArray(d.items)||!Array.isArray(d.pending))process.exitCode=1;" "%ZG_PREVIEW%" >>"%ZG_LOG%" 2>&1
if errorlevel 1 goto parse_failed
>>"%ZG_LOG%" echo FINAL_STATUS=R2_PREVIEW_REASONS_READ_ONLY
goto show_success
:preview_missing
>>"%ZG_LOG%" echo ERROR=PINNED_PREVIEW_FILE_MISSING
goto show_failed
:node_failed
>>"%ZG_LOG%" echo ERROR=APPROVED_NODE_NOT_FOUND
goto show_failed
:parse_failed
>>"%ZG_LOG%" echo ERROR=PREVIEW_JSON_INVALID
goto show_failed
:show_failed
>>"%ZG_LOG%" echo FINAL_STATUS=BLOCKED_NO_CHANGES
type "%ZG_LOG%"
echo.
echo Log: "%ZG_LOG%"
pause
exit /b 1
:show_success
type "%ZG_LOG%"
echo.
echo Log: "%ZG_LOG%"
pause
exit /b 0
:log_failed
echo ERROR=LOG_CREATE_FAILED
pause
exit /b 1
