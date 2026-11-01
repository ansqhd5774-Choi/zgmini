@echo off
setlocal DisableDelayedExpansion
set "DC_NODE=E:\ZGmini\runtime\node.exe"
set "ZGMINI_DATA_ROOT=E:\ZGmini\data"
set "DC_LOG=%~dp0DATA_CENTER_POWER_R3_RESULT.txt"
if not exist "%DC_NODE%" goto node_missing
if not exist "%~dp0theme-data-center-power-publish-r3.mjs" goto source_missing
>"%DC_LOG%" echo DATA_CENTER_POWER_R3_PC_CYCLE
rem Default: free anonymous collection and private score, no D1 publication.
rem Publishing is an explicit separate command-line opt-in; never implied here.
"%DC_NODE%" "%~dp0theme-data-center-power-publish-r3.mjs" --once --collect %* >>"%DC_LOG%" 2>&1
if errorlevel 1 goto failed
type "%DC_LOG%"
exit /b 0
:node_missing
echo BLOCKED=APPROVED_WINDOWS_NODE_MISSING
exit /b 1
:source_missing
echo BLOCKED=GITHUB_SOURCE_NOT_SYNCED_NEXT_TO_CMD
exit /b 1
:failed
echo RESULT=BLOCKED_REVIEW_SAME_FOLDER_LOG>>"%DC_LOG%"
type "%DC_LOG%"
exit /b 1
