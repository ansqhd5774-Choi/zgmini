@echo off
setlocal EnableExtensions DisableDelayedExpansion

rem R45: isolated MarketParquet source collection. No D1 or Core operations.
rem The TXT is always created beside this CMD, never on E:.
set "RESULT=%~dp0US_BREADTH_R45_LATEST_PAIR_RESULT_%RANDOM%_%RANDOM%.txt"
if exist "%RESULT%" (
  echo RESULT_NAME_COLLISION - run the CMD again.
  exit /b 2
)

>"%RESULT%" echo ZGMINI US BREADTH R45 LATEST PAIR SOURCE COLLECTION
>>"%RESULT%" echo MODE=APPEND_ONLY_E_SOURCE_WITH_OPERATOR_Y
>>"%RESULT%" echo LOG_LOCATION=NEXT_TO_CMD
>>"%RESULT%" echo CORE_TASK_CHANGES=0
>>"%RESULT%" echo D1_WRITES=0
>>"%RESULT%" echo LEGACY_R1_WRITES=0

set "NODE=E:\ZGmini\runtime\node.exe"
set "ZGMINI_DATA_ROOT=E:\ZGmini\data"
set "SCRIPT=%~dp0scripts\pc-writer\us-breadth-confirmed-download-r30.mjs"
if not exist "%NODE%" (
  >>"%RESULT%" echo STATUS=APPROVED_E_NODE_MISSING
  goto :finish_error
)
if not exist "%SCRIPT%" (
  >>"%RESULT%" echo STATUS=PORTABLE_SCRIPT_MISSING
  goto :finish_error
)
if not exist "%ZGMINI_DATA_ROOT%" (
  >>"%RESULT%" echo STATUS=APPROVED_E_DATA_ROOT_MISSING
  goto :finish_error
)

>>"%RESULT%" echo [APPROVED_NODE_VERSION]
"%NODE%" --version >>"%RESULT%" 2>&1
if errorlevel 1 goto :finish_error
>>"%RESULT%" echo [R45_PLAN_RESULT]
"%NODE%" "%SCRIPT%" --plan-latest-pair >>"%RESULT%" 2>&1
if errorlevel 1 (
  >>"%RESULT%" echo STATUS=PLAN_EXECUTION_FAILED
  goto :finish_error
)

echo.
echo The plan is recorded in a TXT next to this CMD.
echo Source collection writes only new raw files to the approved E: R2 folder.
echo Before the latest NY trading day finishes, only older files are checked.
echo No D1, Core Task, or R1 history change is performed.
set "R45_ANSWER=N"
set /p "R45_ANSWER=Approve append-only R45 source collection? Type Y to continue: "
if /i not "%R45_ANSWER%"=="Y" (
  >>"%RESULT%" echo R45_OPERATOR_CONFIRMATION=NOT_GRANTED
  >>"%RESULT%" echo STATUS=PLAN_ONLY_NO_SOURCE_WRITES
  goto :finish_ok
)

set "US_BREADTH_R45_OPERATOR_CONFIRMATION=Y"
>>"%RESULT%" echo R45_OPERATOR_CONFIRMATION=Y
>>"%RESULT%" echo [R45_COLLECTION_RESULT]
"%NODE%" "%SCRIPT%" --download-latest-pair-approved >>"%RESULT%" 2>&1
if errorlevel 1 (
  >>"%RESULT%" echo STATUS=COLLECTION_EXECUTION_FAILED
  goto :finish_error
)
>>"%RESULT%" echo STATUS=COLLECTION_RESPONSE_REQUIRES_REVIEW
goto :finish_ok

:finish_error
set "R45_EXIT=1"
goto :finish

:finish_ok
set "R45_EXIT=0"

:finish
echo.
echo R45_RESULT_TXT=%RESULT%
echo Attach this TXT in the conversation. The result is not saved on E:.
if exist "%RESULT%" explorer.exe /select,"%RESULT%" >nul 2>nul
pause
exit /b %R45_EXIT%
