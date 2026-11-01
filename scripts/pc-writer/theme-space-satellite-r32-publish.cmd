@echo off
setlocal DisableDelayedExpansion
rem Space R32: real 252-session single ETF continuation, separate D1 key.
rem Never modify existing nine theme jobs, formulas, D1 rows or old space R1.
set "SPACE32_NODE=E:\ZGmini\runtime\node.exe"
set "SPACE32_DATA=E:\ZGmini\data"
set "SPACE32_SCRIPT=%~dp0theme-space-satellite-publish-r32.mjs"
set "SPACE32_LOG=%~dp0SPACE_SATELLITE_R32_PUBLICATION_RESULT.txt"
>"%SPACE32_LOG%" echo REPORT=SPACE_SATELLITE_R32_PUBLICATION
>>"%SPACE32_LOG%" echo STARTED=%DATE% %TIME%
>>"%SPACE32_LOG%" echo KEY=theme-space-satellite-r2
>>"%SPACE32_LOG%" echo EXISTING_THEME_MUTATIONS=NO
>>"%SPACE32_LOG%" echo HISTORICAL_SCORES=SAVED_ACTUAL_ETF_ONLY
if not exist "%SPACE32_NODE%" goto node_missing
if not exist "%SPACE32_DATA%" goto data_missing
if not exist "%SPACE32_SCRIPT%" goto script_missing
if not exist "%~dp0..\..\worker\theme-space-satellite-r2.mjs" goto script_missing
set "ZGMINI_DATA_ROOT=%SPACE32_DATA%"
>>"%SPACE32_LOG%" echo PHASE=REAL_DATE_ELIGIBLE_ETF_CALC_AND_NEW_D1_PUBLICATION
"%SPACE32_NODE%" "%SPACE32_SCRIPT%" --once --publish >>"%SPACE32_LOG%" 2>&1
if errorlevel 1 goto failed
>>"%SPACE32_LOG%" echo CMD_RESULT=FINISHED_READ_REPORT_FOR_PUBLIC_API_STATUS
type "%SPACE32_LOG%"
exit /b 0
:node_missing
>>"%SPACE32_LOG%" echo CMD_RESULT=STOP_PC_NODE_MISSING
goto stopped
:data_missing
>>"%SPACE32_LOG%" echo CMD_RESULT=STOP_APPROVED_PC_DATA_MISSING
goto stopped
:script_missing
>>"%SPACE32_LOG%" echo CMD_RESULT=STOP_PACKAGE_INCOMPLETE
goto stopped
:failed
>>"%SPACE32_LOG%" echo CMD_RESULT=STOP_PUBLICATION_CHECK_FAILED
:stopped
type "%SPACE32_LOG%"
exit /b 1
