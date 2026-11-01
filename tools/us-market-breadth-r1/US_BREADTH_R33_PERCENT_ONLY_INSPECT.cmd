@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "RESULT_DIR=%USERPROFILE%\Downloads"
if not exist "%RESULT_DIR%\" set "RESULT_DIR=%TEMP%"
set "RESULT=%RESULT_DIR%\US_BREADTH_R33_PERCENT_ONLY_INSPECT_%RANDOM%_%RANDOM%.txt"
set "SCRIPT=%~dp0scripts\pc-writer\us-breadth-confirmed-percent-history-runner-r33.mjs"
set "ZGMINI_PC_HOME=E:\ZGmini\data\pc-writer"
set "ZGMINI_DATA_ROOT=E:\ZGmini\data"

(
  echo ZGMINI US BREADTH R33 PERCENT-ONLY VERIFIED INSPECT
  echo MODE=READ_ONLY_PROVIDER_REVERIFICATION
  echo HISTORICAL_COMPARISONS=249_REAL_DATES
  echo OUTPUT=RISING_FALLING_UNCHANGED_PERCENT_ONLY
  echo E_DRIVE_WRITES=0
  echo D1_WRITES=0
  echo CORE_TASK_CHANGES=0
  echo.
  echo [R33_PERCENT_HISTORY_RESULT]
) 1>"%RESULT%" 2>&1

if not exist "E:\ZGmini\runtime\node.exe" (
  echo APPROVED_E_NODE_NOT_FOUND>>"%RESULT%"
) else (
  if not exist "%SCRIPT%" (
    echo PACKAGE_R33_SCRIPT_NOT_FOUND>>"%RESULT%"
  ) else (
    "E:\ZGmini\runtime\node.exe" "%SCRIPT%" --inspect-only 1>>"%RESULT%" 2>&1
    if errorlevel 1 echo R33_PERCENT_INSPECT_EXIT_NONZERO>>"%RESULT%"
  )
)

echo.
echo R33 percent-only read-only inspect finished.
echo Upload this TXT to the chat:
echo "%RESULT%"
start "" notepad.exe "%RESULT%"
endlocal
