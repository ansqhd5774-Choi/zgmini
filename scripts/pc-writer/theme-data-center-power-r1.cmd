@echo off
setlocal DisableDelayedExpansion
set "DC_NODE=E:\ZGmini\runtime\node.exe"
set "ZGMINI_DATA_ROOT=E:\ZGmini\data"
set "DC_LOG=%~dp0DATA_CENTER_POWER_R1_RESULT.txt"
if not exist "%DC_NODE%" goto node_missing
if not exist "%ZGMINI_DATA_ROOT%" goto data_missing
if not exist "%~dp0theme-optional-collect.mjs" goto source_missing
if not exist "%~dp0theme-data-center-power-r1.mjs" goto source_missing
>"%DC_LOG%" echo DATA_CENTER_POWER_R1_PRIVATE_COLLECTION
rem Existing collector: max four free GETs per invocation; only completed pages are reused.
for %%I in (1 2) do (
  "%DC_NODE%" "%~dp0theme-optional-collect.mjs" --collect data-center-power 2024-01-01 2026-10-22 >>"%DC_LOG%" 2>&1
  if errorlevel 1 goto failed
)
"%DC_NODE%" "%~dp0theme-data-center-power-r1.mjs" --score >>"%DC_LOG%" 2>&1
if errorlevel 1 goto failed
echo RESULT=PRIVATE_SCORE_VERIFIED_NO_PUBLICATION>>"%DC_LOG%"
type "%DC_LOG%"
exit /b 0
:node_missing
echo BLOCKED=APPROVED_NODE_NOT_FOUND
exit /b 1
:data_missing
echo BLOCKED=E_DRIVE_DATA_ROOT_NOT_FOUND
exit /b 1
:source_missing
echo BLOCKED=SOURCE_FILES_NOT_FOUND_NEXT_TO_CMD
exit /b 1
:failed
echo RESULT=BLOCKED_REVIEW_CHECKPOINT_NO_BLIND_RETRY>>"%DC_LOG%"
type "%DC_LOG%"
exit /b 1
