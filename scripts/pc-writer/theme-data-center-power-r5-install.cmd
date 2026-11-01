@echo off
setlocal DisableDelayedExpansion
rem R5: clone the original successful seven-theme task for tenth theme only.
rem Pinned R5 task tool; R3 private score must pass before task creation.
rem Installer, generated scheduled CMD and both TXT logs stay side by side.
set "DC_NODE=E:\ZGmini\runtime\node.exe"
set "DC_R5_SHA=0eb76747e6f35e8f410ffb7a0aa07942d2da5938"
set "DC_TOOL=%~dp0theme-data-center-power-r5-tool.mjs"
set "DC_RUNNER=%~dp0DATA_CENTER_POWER_R5_SCHEDULED.cmd"
set "DC_LOG=%~dp0DATA_CENTER_POWER_R5_RESULT.txt"
if not exist "%DC_NODE%" goto node_missing
>"%DC_LOG%" echo DATA_CENTER_POWER_R5_TENTH_PRIVATE_SCHEDULE_INSTALL
>>"%DC_LOG%" echo PINNED_R5_TOOL_SHA=%DC_R5_SHA%
curl.exe --fail --location --silent --show-error --retry 0 --connect-timeout 12 --max-time 60 "https://raw.githubusercontent.com/ansqhd5774-Choi/zgmini/%DC_R5_SHA%/scripts/pc-writer/theme-data-center-power-task-r5.mjs" --output "%DC_TOOL%" >>"%DC_LOG%" 2>&1
if errorlevel 1 goto failed
"%DC_NODE%" "%DC_TOOL%" --apply "%DC_RUNNER%" >>"%DC_LOG%" 2>&1
if errorlevel 1 goto failed
>>"%DC_LOG%" echo RESULT=TENTH_PRIVATE_SCHEDULE_REGISTERED_OR_VERIFIED
type "%DC_LOG%"
exit /b 0
:node_missing
echo BLOCKED=APPROVED_NODE_MISSING
exit /b 1
:failed
>>"%DC_LOG%" echo RESULT=BLOCKED_REVIEW_SAME_FOLDER_LOG_NO_BLIND_RETRY
type "%DC_LOG%"
exit /b 1
