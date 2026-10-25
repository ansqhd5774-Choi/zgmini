@echo off
setlocal DisableDelayedExpansion
set "DC_NODE=E:\ZGmini\runtime\node.exe"
set "ZGMINI_DATA_ROOT=E:\ZGmini\data"
set "DC_LOG=%~dp0DATA_CENTER_POWER_R2_RESULT.txt"
if not exist "%DC_NODE%" goto node_missing
if not exist "%~dp0theme-data-center-power-cycle-r2.mjs" goto source_missing
>"%DC_LOG%" echo DATA_CENTER_POWER_R2_PRIVATE_PC_CYCLE
"%DC_NODE%" "%~dp0theme-data-center-power-cycle-r2.mjs" --once --collect >>"%DC_LOG%" 2>&1
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
