@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem R78 Stage04: historical official report addresses are discovery HINTS ONLY.
rem New folder: never overwrite the original R77 source or its prior evidence.
rem Requires the two R78 .mjs files NEXT TO THIS .cmd (validation ZIP).

set "ZG_SOURCE=%USERPROFILE%\Desktop\ZGMINI_R77_OLLAMA_OFFICIAL_SITEMAP_WINDOWS_20261028"
if not "%~1"=="" set "ZG_SOURCE=%~1"
set "ZG_RUN=%USERPROFILE%\Desktop\ZGMINI_R78_STAGE04_21_%RANDOM%_%RANDOM%"
set "ZG_BOOT=%~dp0STAGE04_R78_21_LAUNCH_%RANDOM%_%RANDOM%.txt"
set "ZG_EXIT=2"

>"%ZG_BOOT%" echo REPORT=STAGE04_R78_21_TOPICS_VALIDATION
>>"%ZG_BOOT%" echo BRANCH=codex/investment-15-stage-m2-r25-20261025
>>"%ZG_BOOT%" echo BASE_SOURCE=%ZG_SOURCE%
>>"%ZG_BOOT%" echo RUN_FOLDER=%ZG_RUN%
>>"%ZG_BOOT%" echo EXPECTED_TOPICS=21
>>"%ZG_BOOT%" echo HISTORICAL_CAGR_IMPORT=DISABLED
>>"%ZG_BOOT%" echo MODE=COPY_R77_THEN_OVERLAY_R78_IN_NEW_FOLDER

if not exist "%ZG_SOURCE%\run-ollama-forecast-r72-safe.mjs" goto missing_source
if not exist "%ZG_SOURCE%\run-ollama-forecast-r71.mjs" goto missing_source
if not exist "%~dp0official-publisher-ollama-adapters-r71.mjs" goto missing_patch
if not exist "%~dp0stage04-r63-official-address-hints-r78.mjs" goto missing_patch
if exist "%ZG_RUN%" goto collision

set "ZG_NODE=E:\ZGmini\runtime\node.exe"
if exist "%ZG_NODE%" goto node_ready
where node >nul 2>nul
if errorlevel 1 goto missing_node
set "ZG_NODE=node"
:node_ready
>>"%ZG_BOOT%" echo NODE=%ZG_NODE%

echo [R78] Copying original R77 to an isolated run folder...
robocopy "%ZG_SOURCE%" "%ZG_RUN%" /E /XJ /R:0 /W:0 /NFL /NDL /NJH /NJS /NP >>"%ZG_BOOT%" 2>&1
if errorlevel 8 goto copy_failed
if not exist "%ZG_RUN%\run-ollama-forecast-r72-safe.mjs" goto copy_failed

copy /B /Y "%~dp0official-publisher-ollama-adapters-r71.mjs" "%ZG_RUN%\official-publisher-ollama-adapters-r71.mjs" >nul
if errorlevel 1 goto patch_failed
copy /B /Y "%~dp0stage04-r63-official-address-hints-r78.mjs" "%ZG_RUN%\stage04-r63-official-address-hints-r78.mjs" >nul
if errorlevel 1 goto patch_failed
>>"%ZG_BOOT%" echo R78_CODE_OVERLAY=SUCCESS

"%ZG_NODE%" --check "%ZG_RUN%\official-publisher-ollama-adapters-r71.mjs" >>"%ZG_BOOT%" 2>&1
if errorlevel 1 goto patch_failed
"%ZG_NODE%" --check "%ZG_RUN%\stage04-r63-official-address-hints-r78.mjs" >>"%ZG_BOOT%" 2>&1
if errorlevel 1 goto patch_failed

set "ZG_RUNLOG=%ZG_RUN%\R78_EXECUTION_DIAGNOSTIC.txt"
>"%ZG_RUNLOG%" echo RUN_MODE=R78_CURRENT_REPORTS_LOCAL_OLLAMA
>>"%ZG_RUNLOG%" echo REQUESTED_TOPICS=21
>>"%ZG_RUNLOG%" echo NOTE=COMPLETED_DOES_NOT_MEAN_ALL_21_HAVE_CAGR
echo.
echo [R78] Executing 21 themes. Local Ollama must already be running.
"%ZG_NODE%" "%ZG_RUN%\run-ollama-forecast-r72-safe.mjs" "information technology" "telecommunications services" "consumer discretionary" "industrial machinery" "financial services" "utilities" "healthcare services" "advanced materials" "energy" "consumer staples" "real estate" "robotics and automation" "cloud computing" "autonomous vehicle" "nuclear reactor" "defense" "fintech" "cyber security" "biotechnology services" "data center" "satellite" >>"%ZG_RUNLOG%" 2>&1
set "ZG_NODE_EXIT=%ERRORLEVEL%"
>>"%ZG_RUNLOG%" echo NODE_EXIT_CODE=%ZG_NODE_EXIT%
>>"%ZG_BOOT%" echo NODE_EXIT_CODE=%ZG_NODE_EXIT%

if not exist "%ZG_RUN%\R72_OLLAMA_FORECAST_PIPELINE_RESULT.json" goto output_missing
if not exist "%ZG_RUN%\R72_OLLAMA_FORECAST_PIPELINE_RESULT.txt" goto output_missing
findstr /B /C:"RUN_STATE=" /C:"TOPICS_TOTAL=" /C:"TOPICS_DONE=" /C:"MEANS_CALCULABLE=" "%ZG_RUN%\R72_OLLAMA_FORECAST_PIPELINE_RESULT.txt" >>"%ZG_BOOT%" 2>nul
if not "%ZG_NODE_EXIT%"=="0" goto execution_failed
findstr /B /C:"TOPICS_TOTAL=21" "%ZG_RUN%\R72_OLLAMA_FORECAST_PIPELINE_RESULT.txt" >nul 2>nul
if errorlevel 1 goto count_mismatch
findstr /B /C:"TOPICS_DONE=21" "%ZG_RUN%\R72_OLLAMA_FORECAST_PIPELINE_RESULT.txt" >nul 2>nul
if errorlevel 1 goto count_mismatch
findstr /B /C:"RUN_STATE=COMPLETED" "%ZG_RUN%\R72_OLLAMA_FORECAST_PIPELINE_RESULT.txt" >nul 2>nul
if errorlevel 1 goto count_mismatch

>>"%ZG_BOOT%" echo RESULT=PROCESS_COMPLETED_21_TOPICS_CHECK_CAGR_COVERAGE_SEPARATELY
set "ZG_EXIT=0"
goto finish

:missing_source
>>"%ZG_BOOT%" echo RESULT=BLOCKED_R77_SOURCE_NOT_FOUND
goto finish
:missing_patch
>>"%ZG_BOOT%" echo RESULT=BLOCKED_R78_PATCH_MISSING_NEXT_TO_CMD
goto finish
:collision
>>"%ZG_BOOT%" echo RESULT=BLOCKED_NEW_FOLDER_ALREADY_EXISTS
goto finish
:missing_node
>>"%ZG_BOOT%" echo RESULT=BLOCKED_NODE_NOT_FOUND
goto finish
:copy_failed
>>"%ZG_BOOT%" echo RESULT=FAILED_COPY_KEEP_PARTIAL_NEW_FOLDER
set "ZG_EXIT=1"
goto finish
:patch_failed
>>"%ZG_BOOT%" echo RESULT=FAILED_R78_OVERLAY_OR_SYNTAX
set "ZG_EXIT=1"
goto finish
:output_missing
>>"%ZG_BOOT%" echo RESULT=FAILED_RESULT_JSON_OR_TXT_MISSING
set "ZG_EXIT=1"
goto finish
:execution_failed
>>"%ZG_BOOT%" echo RESULT=FAILED_NODE_RUN_CHECK_LOG
set "ZG_EXIT=1"
goto finish
:count_mismatch
>>"%ZG_BOOT%" echo RESULT=FAILED_TOPIC_COUNT_OR_RUN_STATE
set "ZG_EXIT=1"
goto finish

:finish
echo.
type "%ZG_BOOT%"
echo.
echo SEND_LAUNCH_LOG=%ZG_BOOT%
echo SEND_RESULT_JSON=%ZG_RUN%\R72_OLLAMA_FORECAST_PIPELINE_RESULT.json
echo SEND_RESULT_TXT=%ZG_RUN%\R72_OLLAMA_FORECAST_PIPELINE_RESULT.txt
echo SEND_EXECUTION_LOG=%ZG_RUN%\R78_EXECUTION_DIAGNOSTIC.txt
echo EXIT_CODE=%ZG_EXIT%
echo Original R77 folder and its earlier outputs are unchanged.
pause
exit /b %ZG_EXIT%
