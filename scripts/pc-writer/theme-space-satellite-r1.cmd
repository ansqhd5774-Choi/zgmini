@echo off
setlocal DisableDelayedExpansion
set "SPACE_NODE=E:\ZGmini\runtime\node.exe"
set "ZGMINI_DATA_ROOT=E:\ZGmini\data"
set "SPACE_LOG=%~dp0SPACE_SATELLITE_R1_RESULT.txt"
set "SPACE_EXIT=1"
>"%SPACE_LOG%" echo REPORT=SPACE_SATELLITE_R1_PRIVATE_FEASIBILITY
if not exist "%SPACE_NODE%" goto node_missing
if not exist "%ZGMINI_DATA_ROOT%" goto data_missing
if not exist "%~dp0theme-optional-collect.mjs" goto source_missing
if not exist "%~dp0theme-space-satellite-r1.mjs" goto source_missing
if not exist "%~dp0theme-optional-score-r188.mjs" goto source_missing
rem First pass is at most 4 anonymous GETs. Repeat explicitly only after checking the log.
"%SPACE_NODE%" "%~dp0theme-optional-collect.mjs" --collect space-satellite 2024-01-01 2026-10-24 >>"%SPACE_LOG%" 2>&1
if errorlevel 1 goto collect_failed
"%SPACE_NODE%" "%~dp0theme-space-satellite-r1.mjs" --audit >>"%SPACE_LOG%" 2>&1
if errorlevel 1 goto audit_failed
>>"%SPACE_LOG%" echo RESULT=PRIVATE_RESEARCH_ONLY_NO_PUBLICATION
set "SPACE_EXIT=0"
goto done
:node_missing
>>"%SPACE_LOG%" echo BLOCKED=APPROVED_NODE_NOT_FOUND
goto done
:data_missing
>>"%SPACE_LOG%" echo BLOCKED=E_DRIVE_DATA_ROOT_NOT_FOUND
goto done
:source_missing
>>"%SPACE_LOG%" echo BLOCKED=SOURCE_FILES_NOT_FOUND_NEXT_TO_CMD
goto done
:collect_failed
>>"%SPACE_LOG%" echo BLOCKED=COLLECTION_REVIEW_CHECKPOINT_NO_BLIND_RETRY
goto done
:audit_failed
>>"%SPACE_LOG%" echo BLOCKED=PRIVATE_AUDIT_FAILED
:done
type "%SPACE_LOG%"
echo.
echo SPACE_SATELLITE_R1_RESULT.txt is next to this CMD file.
pause
exit /b %SPACE_EXIT%
