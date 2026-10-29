@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem Stage04 R82: existing 21 R63 official report markets, same 2/3 arithmetic mean.
rem Only a NEW isolated run folder is modified. No historical runs overwritten.
rem Optional first argument: existing R77 complete source folder path.

set "ZG_SOURCE=%USERPROFILE%\Desktop\ZGMINI_R77_OLLAMA_OFFICIAL_SITEMAP_WINDOWS_20261028"
if not "%~1"=="" set "ZG_SOURCE=%~1"
set "ZG_RUN=%USERPROFILE%\Desktop\ZGMINI_R82_STAGE04_21_%RANDOM%_%RANDOM%"
set "ZG_BOOT=%~dp0STAGE04_R82_21_LAUNCH_%RANDOM%_%RANDOM%.txt"
set "ZG_EXIT=2"

>"%ZG_BOOT%" echo REPORT=STAGE04_R82_21_TOPICS_VALIDATION
>>"%ZG_BOOT%" echo BRANCH=codex/investment-15-stage-m2-r25-20261025
>>"%ZG_BOOT%" echo BASE_SOURCE=%ZG_SOURCE%
>>"%ZG_BOOT%" echo RUN_FOLDER=%ZG_RUN%
>>"%ZG_BOOT%" echo EXPECTED_TOPICS=21
>>"%ZG_BOOT%" echo EXPECTED_CALCULABLE_MEANS=21
>>"%ZG_BOOT%" echo HISTORICAL_CAGR_IMPORT=DISABLED
>>"%ZG_BOOT%" echo R63_REPORT_ADDRESSES=FRESH_GET_WITH_DIRECT_TITLE_AND_SOURCE_AUDIT
>>"%ZG_BOOT%" echo R82_MARKET_NAME_NORMALIZATION=VEHICLES_AND_CYBERSECURITY_ONLY
>>"%ZG_BOOT%" echo R82_METADATA_YEAR_MISLABEL=INDEPENDENT_OVERVIEW_AND_SIZE_PROOF
>>"%ZG_BOOT%" echo R82_PERIOD_VARIATION=PRIMARY_MARKET_SIZE_PROOF_REQUIRED
>>"%ZG_BOOT%" echo MEAN_FORMULA=UNCHANGED
>>"%ZG_BOOT%" echo SCOPE=STAGE04_ONLY

if not exist "%ZG_SOURCE%\run-ollama-forecast-r72-safe.mjs" goto missing_source
if not exist "%ZG_SOURCE%\run-ollama-forecast-r71.mjs" goto missing_source
for %%F in (
  "keyword-growth-speed-r25-readonly.mjs"
  "forecast-source-audit-r82-supplement.mjs"
  "official-publisher-ollama-adapters-r71.mjs"
  "stage04-r63-official-address-hints-r78.mjs"
  "ollama-forecast-pipeline-r70.mjs"
  "run-ollama-forecast-r71.mjs"
  "stage04-r78-criteria-regression.test.mjs"
  "ollama-forecast-pipeline-r70.test.mjs"
  "official-publisher-ollama-adapters-r71.test.mjs"
) do if not exist "%~dp0%%~F" goto missing_patch
if exist "%ZG_RUN%" goto collision

set "ZG_NODE=E:\ZGmini\runtime\node.exe"
if exist "%ZG_NODE%" goto node_ready
where node >nul 2>nul
if errorlevel 1 goto missing_node
set "ZG_NODE=node"
:node_ready
>>"%ZG_BOOT%" echo NODE=%ZG_NODE%

echo [R82] Copying original R77 into a NEW isolated folder...
robocopy "%ZG_SOURCE%" "%ZG_RUN%" /E /XJ /R:0 /W:0 /NFL /NDL /NJH /NJS /NP >>"%ZG_BOOT%" 2>&1
if errorlevel 8 goto copy_failed
if not exist "%ZG_RUN%\run-ollama-forecast-r72-safe.mjs" goto copy_failed

for %%F in (
  "keyword-growth-speed-r25-readonly.mjs"
  "forecast-source-audit-r82-supplement.mjs"
  "official-publisher-ollama-adapters-r71.mjs"
  "stage04-r63-official-address-hints-r78.mjs"
  "ollama-forecast-pipeline-r70.mjs"
  "run-ollama-forecast-r71.mjs"
  "stage04-r78-criteria-regression.test.mjs"
  "ollama-forecast-pipeline-r70.test.mjs"
  "official-publisher-ollama-adapters-r71.test.mjs"
) do (
  copy /B /Y "%~dp0%%~F" "%ZG_RUN%\%%~F" >nul
  if errorlevel 1 goto patch_failed
)
>>"%ZG_BOOT%" echo R82_CODE_OVERLAY=SUCCESS
for %%F in (
  "keyword-growth-speed-r25-readonly.mjs"
  "forecast-source-audit-r82-supplement.mjs"
  "official-publisher-ollama-adapters-r71.mjs"
  "ollama-forecast-pipeline-r70.mjs"
  "run-ollama-forecast-r71.mjs"
) do (
  "%ZG_NODE%" --check "%ZG_RUN%\%%~F" >>"%ZG_BOOT%" 2>&1
  if errorlevel 1 goto patch_failed
)

set "ZG_TESTLOG=%ZG_RUN%\R82_REGRESSION_TESTS.txt"
"%ZG_NODE%" --test "%ZG_RUN%\ollama-forecast-pipeline-r70.test.mjs" "%ZG_RUN%\ollama-forecast-r71-runner.test.mjs" "%ZG_RUN%\official-publisher-ollama-adapters-r71.test.mjs" "%ZG_RUN%\run-ollama-forecast-r72-safe.test.mjs" "%ZG_RUN%\stage04-r78-criteria-regression.test.mjs" >"%ZG_TESTLOG%" 2>&1
if errorlevel 1 goto tests_failed
>>"%ZG_BOOT%" echo R82_REGRESSION_TESTS=PASS

set "ZG_RUNLOG=%ZG_RUN%\R82_EXECUTION_DIAGNOSTIC.txt"
>"%ZG_RUNLOG%" echo RUN_MODE=R82_R63_REPORT_MARKETS_LOCAL_OLLAMA
>>"%ZG_RUNLOG%" echo REQUESTED_TOPICS=21
>>"%ZG_RUNLOG%" echo HISTORICAL_CAGR_IMPORT=DISABLED
>>"%ZG_RUNLOG%" echo NOTE=RESEARCH_MEAN_NOT_GICS_SECTOR_OR_SCORE
echo [R82] Running all 21 original topics and live official sources...
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
findstr /B /C:"MEANS_CALCULABLE=21" "%ZG_RUN%\R72_OLLAMA_FORECAST_PIPELINE_RESULT.txt" >nul 2>nul
if errorlevel 1 goto coverage_incomplete
>>"%ZG_BOOT%" echo RESULT=VERIFIED_21_TOPICS_AND_21_CALCULABLE_RESEARCH_MEANS
set "ZG_EXIT=0"
goto finish

:missing_source
>>"%ZG_BOOT%" echo RESULT=BLOCKED_R77_SOURCE_NOT_FOUND
goto finish
:missing_patch
>>"%ZG_BOOT%" echo RESULT=BLOCKED_R82_PATCH_MISSING_NEXT_TO_CMD
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
>>"%ZG_BOOT%" echo RESULT=FAILED_R82_OVERLAY_OR_SYNTAX
set "ZG_EXIT=1"
goto finish
:tests_failed
>>"%ZG_BOOT%" echo RESULT=FAILED_R82_REGRESSION_TESTS
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
:coverage_incomplete
>>"%ZG_BOOT%" echo RESULT=INCOMPLETE_CAGR_COVERAGE_SEND_JSON_FOR_DIAGNOSIS
set "ZG_EXIT=1"
goto finish

:finish
echo.
type "%ZG_BOOT%"
echo.
echo SEND_LAUNCH_LOG=%ZG_BOOT%
echo SEND_TESTS_LOG=%ZG_RUN%\R82_REGRESSION_TESTS.txt
echo SEND_RESULT_JSON=%ZG_RUN%\R72_OLLAMA_FORECAST_PIPELINE_RESULT.json
echo SEND_RESULT_TXT=%ZG_RUN%\R72_OLLAMA_FORECAST_PIPELINE_RESULT.txt
echo SEND_EXECUTION_LOG=%ZG_RUN%\R82_EXECUTION_DIAGNOSTIC.txt
echo EXIT_CODE=%ZG_EXIT%
echo Original R77 and previous reports were not modified.
rem Keep the original interactive behavior unless an explicit R85 repeat runner owns the console.
if not "%STAGE04_R85_REPEAT_NONINTERACTIVE%"=="1" pause
exit /b %ZG_EXIT%
