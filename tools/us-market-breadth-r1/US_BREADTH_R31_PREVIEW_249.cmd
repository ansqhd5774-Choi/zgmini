@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "RESULT_DIR=%USERPROFILE%\Downloads"
if not exist "%RESULT_DIR%\" set "RESULT_DIR=%TEMP%"
set "RESULT=%RESULT_DIR%\US_BREADTH_R31_PREVIEW_249_%RANDOM%_%RANDOM%.txt"
set "SCRIPT=%~dp0scripts\pc-writer\us-breadth-confirmed-year-preview-r25.mjs"
set "ZGMINI_PC_HOME=E:\ZGmini\data\pc-writer"
set "ZGMINI_DATA_ROOT=E:\ZGmini\data"

(
  echo ZGMINI US BREADTH R31 PROVIDER-VERIFIED 249 POINT PREVIEW
  echo MODE=READ_ONLY_AND_PROVIDER_SIGNED_DOWNLOAD_COMPARISON
  echo EXPECTED_LOCAL_SOURCE_DATES=250
  echo EXPECTED_CHART_POINTS=249
  echo D1_WRITES=0
  echo CORE_TASK_CHANGES=0
  echo E_DRIVE_WRITES=0
  echo.
  echo [R31_PREVIEW_RESULT]
) 1>"%RESULT%" 2>&1

if not exist "E:\ZGmini\runtime\node.exe" (
  echo APPROVED_E_NODE_NOT_FOUND>>"%RESULT%"
) else (
  if not exist "%SCRIPT%" (
    echo PACKAGE_R31_PREVIEW_SCRIPT_NOT_FOUND>>"%RESULT%"
  ) else (
    "E:\ZGmini\runtime\node.exe" "%SCRIPT%" --preview-available 1>>"%RESULT%" 2>&1
    if errorlevel 1 echo R31_PREVIEW_EXIT_NONZERO>>"%RESULT%"
  )
)

echo.
echo R31 read-only preview finished. Upload this TXT to the chat:
echo "%RESULT%"
start "" notepad.exe "%RESULT%"
endlocal

