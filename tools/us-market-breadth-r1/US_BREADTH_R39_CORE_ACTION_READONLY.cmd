@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem Save beside this CMD so the operator can attach the log directly.
set "RESULT=%~dp0US_BREADTH_R39_CORE_ACTION_%RANDOM%_%RANDOM%.txt"
set "SCRIPT=%~dp0scripts\pc-writer\us-breadth-core-action-readonly-r39.mjs"

(
  echo ZGMINI US BREADTH R39 CORE ACTION PROVENANCE
  echo MODE=READ_ONLY_TASK_LAUNCHER_SOURCE
  echo E_SOURCE_WRITES=0
  echo D1_READS=0
  echo D1_WRITES=0
  echo PROVIDER_CALLS=0
  echo CORE_TASK_CHANGES=0
  echo LOCK_PID_ACTIONS=0
  echo LOG_LOCATION=NEXT_TO_CMD
  echo.
  echo [R39_CORE_ACTION_RESULT]
) 1>"%RESULT%" 2>&1

if not exist "%RESULT%" (
  echo ERROR: The TXT could not be created beside the CMD.
  echo Extract the ZIP into your Downloads folder, then run the CMD again.
  pause
  exit /b 1
)

if not exist "E:\ZGmini\runtime\node.exe" (
  echo APPROVED_E_NODE_NOT_FOUND>>"%RESULT%"
) else (
  if not exist "%SCRIPT%" (
    echo R39_PORTABLE_SCRIPT_NOT_FOUND>>"%RESULT%"
  ) else (
    "E:\ZGmini\runtime\node.exe" "%SCRIPT%" --inspect-only 1>>"%RESULT%" 2>nul
    if errorlevel 1 echo R39_INSPECT_EXIT_NONZERO>>"%RESULT%"
  )
)

echo.
echo Diagnostic completed. No source data, D1, Task, PID, or lock changes.
echo Upload this TXT file to the chat:
echo "%RESULT%"
start "" notepad.exe "%RESULT%"
endlocal
