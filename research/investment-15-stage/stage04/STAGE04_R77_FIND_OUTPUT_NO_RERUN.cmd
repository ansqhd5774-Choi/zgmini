@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem Diagnostic only. NEVER starts Ollama, copies bundles, or changes previous results.
rem Save one uniquely named diagnostic in the same folder as this CMD.

set "ZG_BASE=%USERPROFILE%\Desktop"
set "ZG_SOURCE=%ZG_BASE%\ZGMINI_R77_OLLAMA_OFFICIAL_SITEMAP_WINDOWS_20261028"
set "ZG_LOG=%~dp0STAGE04_R77_OUTPUT_CHECK_%RANDOM%_%RANDOM%.txt"
set "ZG_FOUND=0"

>"%ZG_LOG%" echo REPORT=STAGE04_R77_OUTPUT_LOCATION_DIAGNOSTIC
>>"%ZG_LOG%" echo MODE=READ_ONLY_INSPECTION_NO_OLLAMA_RUN
>>"%ZG_LOG%" echo DESKTOP=%ZG_BASE%
>>"%ZG_LOG%" echo SOURCE_FOLDER=%ZG_SOURCE%
>>"%ZG_LOG%" echo.

if exist "%ZG_SOURCE%\STAGE04_OLLAMA_R72_RUN_AND_DIAGNOSE.cmd" (
  >>"%ZG_LOG%" echo SOURCE_CMD=PRESENT
) else (
  >>"%ZG_LOG%" echo SOURCE_CMD=MISSING
)
if exist "%ZG_SOURCE%\run-ollama-forecast-r72-safe.mjs" (
  >>"%ZG_LOG%" echo SOURCE_RUNNER=PRESENT
) else (
  >>"%ZG_LOG%" echo SOURCE_RUNNER=MISSING
)

if exist "%ZG_SOURCE%\" call :inspect "%ZG_SOURCE%" ORIGINAL_R77

>>"%ZG_LOG%" echo.
>>"%ZG_LOG%" echo SEARCH=ZGMINI_R77_RERUN_*
for /d %%D in ("%ZG_BASE%\ZGMINI_R77_RERUN_*") do (
  if exist "%%~fD\" (
    set /a ZG_FOUND+=1 >nul
    call :inspect "%%~fD" NEW_RUN
  )
)

>>"%ZG_LOG%" echo NEW_RUN_FOLDER_COUNT=%ZG_FOUND%
if "%ZG_FOUND%"=="0" >>"%ZG_LOG%" echo NOTE=NO_NEW_RUN_FOLDER_FOUND_CHECK_SOURCE_MISSING_OR_COPY_FAILURE

echo.
echo DIAGNOSTIC_FILE=%ZG_LOG%
echo NEW_RUN_FOLDER_COUNT=%ZG_FOUND%
echo No Ollama job was started. Existing outputs were not modified.
echo Attach the diagnostic TXT to ChatGPT.
pause
exit /b 0

:inspect
>>"%ZG_LOG%" echo.
>>"%ZG_LOG%" echo FOLDER_TYPE=%~2
>>"%ZG_LOG%" echo FOLDER_PATH=%~1
if exist "%~1\R72_EXECUTION_DIAGNOSTIC.txt" (
  >>"%ZG_LOG%" echo EXECUTION_DIAGNOSTIC=FOUND
  >>"%ZG_LOG%" echo EXECUTION_DIAGNOSTIC_PATH=%~1\R72_EXECUTION_DIAGNOSTIC.txt
) else (
  >>"%ZG_LOG%" echo EXECUTION_DIAGNOSTIC=MISSING
)
if exist "%~1\R72_OLLAMA_FORECAST_PIPELINE_RESULT.json" (
  >>"%ZG_LOG%" echo RESULT_JSON=FOUND
  >>"%ZG_LOG%" echo RESULT_JSON_PATH=%~1\R72_OLLAMA_FORECAST_PIPELINE_RESULT.json
) else (
  >>"%ZG_LOG%" echo RESULT_JSON=MISSING
)
if exist "%~1\R72_OLLAMA_FORECAST_PIPELINE_RESULT.txt" (
  >>"%ZG_LOG%" echo RESULT_TXT=FOUND
  >>"%ZG_LOG%" echo RESULT_TXT_PATH=%~1\R72_OLLAMA_FORECAST_PIPELINE_RESULT.txt
  findstr /B /C:"RUN_STATE=" /C:"TOPICS_DONE=" /C:"TOPICS_TOTAL=" "%~1\R72_OLLAMA_FORECAST_PIPELINE_RESULT.txt" >>"%ZG_LOG%" 2>nul
) else (
  >>"%ZG_LOG%" echo RESULT_TXT=MISSING
)
exit /b 0
