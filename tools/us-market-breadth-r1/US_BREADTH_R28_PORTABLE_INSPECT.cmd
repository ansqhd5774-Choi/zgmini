@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "RESULT_DIR=%USERPROFILE%\Downloads"
if not exist "%RESULT_DIR%\" set "RESULT_DIR=%TEMP%"
set "RESULT=%RESULT_DIR%\US_BREADTH_R28_PORTABLE_INSPECT_%RANDOM%_%RANDOM%.txt"
set "SCRIPT=%~dp0scripts\pc-writer\us-breadth-confirmed-provider-manifest-r24.mjs"
set "ZGMINI_DATA_ROOT=E:\ZGmini\data"
set "ZGMINI_PC_HOME=E:\ZGmini\data\pc-writer"

(
  echo ZGMINI US BREADTH R28 PORTABLE INSPECT
  echo MODE=READ_ONLY_LOCAL_INVENTORY
  echo SOURCE_STAGE=CANDIDATE_DIAGNOSTIC_NOT_APPROVED_CORE_SOURCE
  echo PROVIDER_CALLS_EXPECTED=0
  echo LOCAL_WRITES_EXPECTED=0
  echo CORE_TASK_CHANGES=0
  echo.
  echo [R24_INSPECT_RESULT]
) 1>"%RESULT%" 2>&1

if not exist "E:\ZGmini\runtime\node.exe" (
  echo E_NODE_NOT_FOUND>>"%RESULT%"
) else (
  if not exist "%SCRIPT%" (
    echo PACKAGE_R24_SCRIPT_NOT_FOUND>>"%RESULT%"
  ) else (
    "E:\ZGmini\runtime\node.exe" "%SCRIPT%" --inspect 1>>"%RESULT%" 2>&1
    if errorlevel 1 echo R24_INSPECT_EXIT_NONZERO>>"%RESULT%"
  )
)

echo.
echo Read-only inventory finished. No E: writes or Core task changes.
echo Upload this TXT file to the chat:
echo "%RESULT%"
start "" notepad.exe "%RESULT%"
endlocal
