@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "RESULT_DIR=%USERPROFILE%\Downloads"
if not exist "%RESULT_DIR%\" set "RESULT_DIR=%TEMP%"
set "RESULT=%RESULT_DIR%\US_BREADTH_R30_COLLECT_%RANDOM%_%RANDOM%.txt"
set "SCRIPT=%~dp0scripts\pc-writer\us-breadth-confirmed-download-r30.mjs"
set "ZGMINI_PC_HOME=E:\ZGmini\data\pc-writer"
set "ZGMINI_DATA_ROOT=E:\ZGmini\data"

(
  echo ZGMINI US BREADTH R30 SOURCE ACQUISITION
  echo MODE=EXPLICIT_FULL_STOCK_R2_STAGING_DOWNLOAD
  echo E_SOURCE_ROOT=E:\ZGmini\data\us-breadth-confirmed-r2\marketparquet-stock-daily
  echo EXACT_251_DAY_PROVIDER_MANIFEST_REQUIRED=YES
  echo CORE_TASK_CHANGES=0
  echo D1_WRITES=0
  echo.
  echo [R30_COLLECTION_RESULT]
) 1>"%RESULT%" 2>&1

if not exist "E:\ZGmini\runtime\node.exe" (
  echo APPROVED_E_NODE_NOT_FOUND>>"%RESULT%"
) else (
  if not exist "%SCRIPT%" (
    echo PACKAGE_R30_SCRIPT_NOT_FOUND>>"%RESULT%"
  ) else (
    "E:\ZGmini\runtime\node.exe" "%SCRIPT%" --download-staging 1>>"%RESULT%" 2>&1
    if errorlevel 1 echo R30_COLLECT_EXIT_NONZERO>>"%RESULT%"
  )
)

echo.
echo R30 collection finished. Check the result status before any next step.
echo Upload the TXT file to the chat:
echo "%RESULT%"
start "" notepad.exe "%RESULT%"
endlocal
