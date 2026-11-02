@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem R47 Windows Core launcher provenance only. Never changes Task or data.
rem Log is created beside THIS extracted CMD, not on E:.
set "RESULT=%~dp0US_BREADTH_R47_CORE_TRACE_%RANDOM%_%RANDOM%.txt"
set "SCRIPT=%~dp0scripts\pc-writer\us-breadth-core-execution-trace-r47.mjs"

(
  echo ZGMINI US BREADTH R47 CORE EXECUTION TRACE
  echo MODE=READ_ONLY_TASK_EXECUTABLE_STATEMENTS
  echo LOG_LOCATION=NEXT_TO_CMD
  echo E_SOURCE_WRITES=0
  echo D1_READS=0
  echo D1_WRITES=0
  echo PROVIDER_CALLS=0
  echo CORE_TASK_CHANGES=0
  echo LOCK_PID_ACTIONS=0
  echo.
  echo [R47_CORE_EXECUTION_RESULT]
) 1>"%RESULT%" 2>&1

if not exist "%RESULT%" (
  echo ERROR: Could not create a log beside the extracted CMD.
  echo Extract the entire ZIP to a writable folder such as Downloads.
  pause
  exit /b 1
)

if not exist "E:\ZGmini\runtime\node.exe" (
  echo APPROVED_E_NODE_NOT_FOUND>>"%RESULT%"
) else (
  if not exist "%SCRIPT%" (
    echo R47_PORTABLE_SCRIPT_NOT_FOUND_EXTRACT_ZIP_FIRST>>"%RESULT%"
  ) else (
    "E:\ZGmini\runtime\node.exe" "%SCRIPT%" --inspect-only 1>>"%RESULT%" 2>nul
    if errorlevel 1 echo R47_INSPECT_EXIT_NONZERO>>"%RESULT%"
  )
)

echo.
echo Read-only diagnostic finished. No Task, E source, D1, lock or PID changes.
echo TXT was created NEXT TO the CMD file, at:
echo "%RESULT%"
echo.
echo The folder will open with your TXT file selected for attachment.
explorer.exe /select,"%RESULT%"
pause
endlocal
