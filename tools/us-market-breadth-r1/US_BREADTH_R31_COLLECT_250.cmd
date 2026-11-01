@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "RESULT_DIR=%USERPROFILE%\Downloads"
if not exist "%RESULT_DIR%\" set "RESULT_DIR=%TEMP%"
set "RESULT=%RESULT_DIR%\US_BREADTH_R31_COLLECT_250_%RANDOM%_%RANDOM%.txt"
set "SCRIPT=%~dp0scripts\pc-writer\us-breadth-confirmed-download-r30.mjs"
set "ZGMINI_PC_HOME=E:\ZGmini\data\pc-writer"
set "ZGMINI_DATA_ROOT=E:\ZGmini\data"

(
  echo ZGMINI US BREADTH R31 COLLECT AVAILABLE 250 SOURCE DAYS
  echo MODE=EXPLICIT_FULL_STOCK_R2_STAGING_DOWNLOAD
  echo E_SOURCE_ROOT=E:\ZGmini\data\us-breadth-confirmed-r2\marketparquet-stock-daily
  echo MISSING_OLDEST_BASELINE_DAY=ALLOWED_FOR_SOURCE_COLLECTION
  echo INTERIOR_GAP=REJECTED
  echo CORE_TASK_CHANGES=0
  echo D1_WRITES=0
  echo.
  echo [R31_COLLECTION_RESULT]
) 1>"%RESULT%" 2>&1

if not exist "E:\ZGmini\runtime\node.exe" (
  echo APPROVED_E_NODE_NOT_FOUND>>"%RESULT%"
) else (
  if not exist "%SCRIPT%" (
    echo PACKAGE_R31_SCRIPT_NOT_FOUND>>"%RESULT%"
  ) else (
    "E:\ZGmini\runtime\node.exe" "%SCRIPT%" --download-staging 1>>"%RESULT%" 2>&1
    if errorlevel 1 echo R31_COLLECT_EXIT_NONZERO>>"%RESULT%"
  )
)

echo.
echo R31 collection finished. E: R2 only; no Core or D1 changes.
echo Upload this TXT to the chat:
echo "%RESULT%"
start "" notepad.exe "%RESULT%"
endlocal

