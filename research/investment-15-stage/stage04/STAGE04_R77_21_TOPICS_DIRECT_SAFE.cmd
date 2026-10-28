@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem R77 Stage04: run the 21 previously approved topics via DIRECT Node arguments.
rem Existing R77/RERUN output files are never overwritten.
rem This CMD does not change any publisher, formula, score, or earlier stage.

set "ZG_SOURCE=%USERPROFILE%\Desktop\ZGMINI_R77_OLLAMA_OFFICIAL_SITEMAP_WINDOWS_20261028"
if not "%~1"=="" set "ZG_SOURCE=%~1"
set "ZG_RUN=%USERPROFILE%\Desktop\ZGMINI_R77_21_DIRECT_%RANDOM%_%RANDOM%"
set "ZG_BOOT=%~dp0STAGE04_R77_21_LAUNCH_%RANDOM%_%RANDOM%.txt"
set "ZG_EXIT=2"

>"%ZG_BOOT%" echo REPORT=STAGE04_21_TOPICS_DIRECT_RUN
>>"%ZG_BOOT%" echo SOURCE=%ZG_SOURCE%
>>"%ZG_BOOT%" echo RUN_FOLDER=%ZG_RUN%
>>"%ZG_BOOT%" echo EXPECTED_TOPIC_COUNT=21
>>"%ZG_BOOT%" echo MODE=COPY_THEN_RUN_NO_OLD_OUTPUT_OVERWRITE

if not exist "%ZG_SOURCE%\run-ollama-forecast-r72-safe.mjs" goto missing_bundle
if not exist "%ZG_SOURCE%\run-ollama-forecast-r71.mjs" goto missing_bundle
if exist "%ZG_RUN%" goto destination_collision

if exist "E:\ZGmini\runtime\node.exe" (
  set "ZG_NODE=E:\ZGmini\runtime\node.exe"
) else (
  where node >nul 2>nul
  if errorlevel 1 goto missing_node
  set "ZG_NODE=node"
)
>>"%ZG_BOOT%" echo NODE=%ZG_NODE%

echo Creating an isolated copy for the 21-topic run. Previous outputs are safe.
robocopy "%ZG_SOURCE%" "%ZG_RUN%" /E /XJ /R:0 /W:0 /NFL /NDL /NJH /NJS /NP >>"%ZG_BOOT%" 2>&1
if errorlevel 8 goto copy_failed
if not exist "%ZG_RUN%\run-ollama-forecast-r72-safe.mjs" goto copy_failed

set "ZG_RUNLOG=%ZG_RUN%\R72_EXECUTION_DIAGNOSTIC.txt"
>"%ZG_RUNLOG%" echo LAUNCH_MODE=DIRECT_NODE_21_EXPLICIT_TOPICS
>>"%ZG_RUNLOG%" echo REQUESTED_TOPIC_COUNT=21
echo.
echo Starting 21 Stage04 research topics. This may take a long time.
rem Single direct invocation avoids nested batch CALL argument loss.
"%ZG_NODE%" "%ZG_RUN%\run-ollama-forecast-r72-safe.mjs" "information technology" "telecommunications services" "consumer discretionary" "industrial machinery" "financial services" "utilities" "healthcare services" "advanced materials" "energy" "consumer staples" "real estate" "robotics and automation" "cloud computing" "autonomous vehicle" "nuclear reactor" "defense" "fintech" "cyber security" "biotechnology services" "data center" "satellite" >>"%ZG_RUNLOG%" 2>&1
set "ZG_NODE_EXIT=%ERRORLEVEL%"
>>"%ZG_RUNLOG%" echo NODE_EXIT_CODE=%ZG_NODE_EXIT%
>>"%ZG_BOOT%" echo NODE_EXIT_CODE=%ZG_NODE_EXIT%

if not exist "%ZG_RUN%\R72_OLLAMA_FORECAST_PIPELINE_RESULT.txt" goto output_missing
findstr /B /C:"RUN_STATE=" /C:"TOPICS_TOTAL=" /C:"TOPICS_DONE=" "%ZG_RUN%\R72_OLLAMA_FORECAST_PIPELINE_RESULT.txt" >>"%ZG_BOOT%" 2>nul
if not "%ZG_NODE_EXIT%"=="0" goto execution_failed
findstr /B /C:"TOPICS_TOTAL=21" "%ZG_RUN%\R72_OLLAMA_FORECAST_PIPELINE_RESULT.txt" >nul 2>nul
if errorlevel 1 goto count_mismatch
findstr /B /C:"TOPICS_DONE=21" "%ZG_RUN%\R72_OLLAMA_FORECAST_PIPELINE_RESULT.txt" >nul 2>nul
if errorlevel 1 goto count_mismatch
findstr /B /C:"RUN_STATE=COMPLETED" "%ZG_RUN%\R72_OLLAMA_FORECAST_PIPELINE_RESULT.txt" >nul 2>nul
if errorlevel 1 goto count_mismatch

>>"%ZG_BOOT%" echo RESULT=SUCCESS_21_OF_21
set "ZG_EXIT=0"
goto finish

:missing_bundle
>>"%ZG_BOOT%" echo RESULT=BLOCKED_SOURCE_RUNNER_MISSING
goto finish

:destination_collision
>>"%ZG_BOOT%" echo RESULT=BLOCKED_RUN_FOLDER_COLLISION
goto finish

:missing_node
>>"%ZG_BOOT%" echo RESULT=BLOCKED_NODE_NOT_FOUND
goto finish

:copy_failed
>>"%ZG_BOOT%" echo RESULT=FAILED_COPY_KEEP_PARTIAL_FOLDER_FOR_INSPECTION
set "ZG_EXIT=1"
goto finish

:output_missing
>>"%ZG_BOOT%" echo RESULT=FAILED_NO_RESULT_TXT
set "ZG_EXIT=1"
goto finish

:execution_failed
>>"%ZG_BOOT%" echo RESULT=FAILED_NODE_PROCESS
set "ZG_EXIT=1"
goto finish

:count_mismatch
>>"%ZG_BOOT%" echo RESULT=FAILED_EXPECTED_21_TOPICS
set "ZG_EXIT=1"
goto finish

:finish
echo.
type "%ZG_BOOT%"
echo.
echo SEND_LAUNCH_LOG=%ZG_BOOT%
echo SEND_RESULT_JSON=%ZG_RUN%\R72_OLLAMA_FORECAST_PIPELINE_RESULT.json
echo SEND_RESULT_TXT=%ZG_RUN%\R72_OLLAMA_FORECAST_PIPELINE_RESULT.txt
echo SEND_EXECUTION_LOG=%ZG_RUN%\R72_EXECUTION_DIAGNOSTIC.txt
echo EXIT_CODE=%ZG_EXIT%
echo Previous R77 and earlier rerun results are unchanged.
pause
exit /b %ZG_EXIT%
