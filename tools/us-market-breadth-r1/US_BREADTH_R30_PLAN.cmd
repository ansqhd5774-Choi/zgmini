@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "RESULT_DIR=%USERPROFILE%\Downloads"
if not exist "%RESULT_DIR%\" set "RESULT_DIR=%TEMP%"
set "RESULT=%RESULT_DIR%\US_BREADTH_R30_PLAN_%RANDOM%_%RANDOM%.txt"
set "SCRIPT=%~dp0scripts\pc-writer\us-breadth-confirmed-download-r30.mjs"
set "ZGMINI_PC_HOME=E:\ZGmini\data\pc-writer"
set "ZGMINI_DATA_ROOT=E:\ZGmini\data"

(
  echo ZGMINI US BREADTH R30 SOURCE PLAN
  echo MODE=ONE_PROVIDER_MANIFEST_GET_ONLY
  echo R2_SOURCE_DOWNLOADS=0
  echo E_DRIVE_WRITES=0
  echo CORE_TASK_CHANGES=0
  echo D1_WRITES=0
  echo.
  echo [R30_PLAN_RESULT]
) 1>"%RESULT%" 2>&1

if not exist "E:\ZGmini\runtime\node.exe" (
  echo APPROVED_E_NODE_NOT_FOUND>>"%RESULT%"
) else (
  if not exist "%SCRIPT%" (
    echo PACKAGE_R30_SCRIPT_NOT_FOUND>>"%RESULT%"
  ) else (
    "E:\ZGmini\runtime\node.exe" "%SCRIPT%" --plan-only 1>>"%RESULT%" 2>&1
    if errorlevel 1 echo R30_PLAN_EXIT_NONZERO>>"%RESULT%"
  )
)

echo.
echo R30 manifest plan complete. No files downloaded or written to E:.
echo Upload the TXT file to the chat:
echo "%RESULT%"
start "" notepad.exe "%RESULT%"
endlocal

